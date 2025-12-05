"""
Chat Routes - WebSocket endpoint para chat com Claude Agent SDK

Inspirado em: /Users/2a/Desktop/duraeco/backend-chat/server.py
"""

import time
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from claude_agent_sdk import (
    ClaudeAgentOptions,
    ClaudeSDKClient,
    AssistantMessage,
    TextBlock,
    ThinkingBlock,
    ToolUseBlock,
    ToolResultBlock,
    ResultMessage,
)

# Importar funções de utilidade (evitando importação circular)
from core.database import get_db_connection
from core.auth import verify_token
from core.session_manager import SessionManager
from tools import duraeco_mcp_server

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat-v2"])

# Inicializar managers
session_manager = SessionManager(get_db_connection)


@router.websocket("/ws")
async def websocket_chat(
    websocket: WebSocket,
    token: str = Query(...)  # JWT via query param ?token=...
):
    """
    WebSocket endpoint para chat streaming com Agent SDK + RAG

    Expected message format:
    {
        "message": "string",
        "conversation_id": "string|null"
    }

    Response formats:
    - {"type": "user_message_saved", "conversation_id": "..."}
    - {"type": "text_chunk", "content": "..."}
    - {"type": "thinking", "content": "..."}
    - {"type": "tool_start", "tool": "...", "tool_use_id": "...", "input": {...}}
    - {"type": "tool_result", "tool_use_id": "...", "content": "..."}
    - {"type": "result", "content": "...", "cost": 0.01, "duration_ms": 1234, "num_turns": 3}
    - {"type": "error", "error": "..."}
    """

    # Autenticar JWT
    user_id = verify_token(token)  # Retorna user_id diretamente (int ou None)
    if not user_id:
        logger.error("Authentication failed: Invalid or expired token")
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()
    logger.info(f"WebSocket connected for user {user_id}")

    try:
        while True:
            # Receber mensagem
            data = await websocket.receive_json()
            message = data.get("message", "")
            conversation_id = data.get("conversation_id")

            if not message.strip():
                await websocket.send_json({
                    "type": "error",
                    "error": "Empty message"
                })
                continue

            # Criar ou reutilizar sessão
            if not conversation_id:
                conversation_id = await session_manager.create_session(user_id)

            # Salvar mensagem do usuário
            await session_manager.save_message(
                conversation_id,
                user_id,
                "user",
                message
            )

            # Confirmar save
            await websocket.send_json({
                "type": "user_message_saved",
                "conversation_id": conversation_id
            })

            # Processar com Claude Agent SDK
            full_content = ""
            thinking_content = ""
            tool_names = {}
            start_time = time.time()
            num_turns = 0

            # Configurar opções do Agent
            options = ClaudeAgentOptions(
                model="claude-sonnet-4-5",  # Ou claude-opus-4-5 para melhor qualidade
                max_turns=10,
                permission_mode="bypassPermissions",  # Execução automática
                system_prompt="""
You are DuraEco AI Assistant, specializing in waste management and environmental data analysis.

You have access to these powerful tools:

1. **RAG Tools (Retrieval Augmented Generation)**:
   - search_similar_waste_images: Find visually similar waste reports using embeddings
   - search_reports_by_location: Search reports near a location using geographic embeddings

2. **Data Tools**:
   - execute_sql_query: Query the database for statistics and analysis

Database Schema:
- reports: waste reports with location and images
- analysis_results: AI analysis with embeddings (VECTOR 1024-d)
- hotspots: areas with high waste concentration
- waste_types: categories of waste

IMPORTANT GUIDELINES:
1. Use RAG tools (search_similar_*) when users ask about similar cases
2. Use execute_sql_query for statistics, counts, and aggregations
3. Always provide actionable insights, not just data dumps
4. Cite specific report IDs when referencing cases
5. Be proactive in suggesting relevant analyses

Example queries:
- "Find similar plastic waste" → use search_similar_waste_images
- "Show reports near me" → use search_reports_by_location
- "How many reports last week?" → use execute_sql_query
""",
                mcp_servers={"duraeco": duraeco_mcp_server},
                allowed_tools=[
                    "mcp__duraeco__search_similar_waste_images",
                    "mcp__duraeco__search_reports_by_location",
                    "mcp__duraeco__execute_sql_query",
                ]
            )

            # Stream resposta usando Claude Agent SDK
            try:
                async with ClaudeSDKClient(options=options) as client:
                    await client.query(message)

                    async for msg in client.receive_response():
                        num_turns += 1

                        if isinstance(msg, AssistantMessage):
                            for block in msg.content:
                                if isinstance(block, TextBlock):
                                    full_content += block.text
                                    await websocket.send_json({
                                        "type": "text_chunk",
                                        "content": block.text
                                    })

                                elif isinstance(block, ThinkingBlock):
                                    thinking_content += block.thinking
                                    await websocket.send_json({
                                        "type": "thinking",
                                        "content": block.thinking
                                    })

                                elif isinstance(block, ToolUseBlock):
                                    tool_names[block.id] = block.name
                                    await websocket.send_json({
                                        "type": "tool_start",
                                        "tool": block.name,
                                        "tool_use_id": block.id,
                                        "input": block.input
                                    })

                                elif isinstance(block, ToolResultBlock):
                                    await websocket.send_json({
                                        "type": "tool_result",
                                        "tool_use_id": block.tool_use_id,
                                        "tool": tool_names.get(block.tool_use_id, "unknown"),
                                        "content": block.content,
                                        "is_error": block.is_error
                                    })

                        elif isinstance(msg, ResultMessage):
                            duration_ms = int((time.time() - start_time) * 1000)

                            # Salvar resposta do assistente no banco
                            await session_manager.save_message(
                                conversation_id,
                                user_id,
                                "assistant",
                                full_content
                            )

                            # Enviar resultado final
                            await websocket.send_json({
                                "type": "result",
                                "content": full_content,
                                "thinking": thinking_content,
                                "cost": msg.total_cost_usd,
                                "duration_ms": duration_ms,
                                "num_turns": num_turns,
                                "is_error": False
                            })

                            logger.info(
                                f"Chat completed for user {user_id}: "
                                f"{num_turns} turns, {duration_ms}ms, ${msg.total_cost_usd:.4f}"
                            )
                            break

            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await websocket.send_json({
                    "type": "error",
                    "error": str(e)
                })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "error": str(e)
            })
        except:
            pass
        try:
            await websocket.close()
        except:
            pass


# Endpoints auxiliares para gerenciar sessões

@router.get("/sessions")
async def list_sessions(
    page: int = 1,
    per_page: int = 20,
    user_id: int = None  # TODO: Extrair do JWT com Depends
):
    """Lista sessões de chat do usuário"""
    if not user_id:
        return {"error": "user_id required"}

    try:
        result = await session_manager.get_user_sessions(user_id, page, per_page)
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"Error listing sessions: {e}")
        return {"error": str(e)}


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    limit: int = 50
):
    """Retorna mensagens de uma sessão"""
    try:
        messages = await session_manager.get_session_history(session_id, limit)
        return {"success": True, "messages": messages}
    except Exception as e:
        logger.error(f"Error getting session messages: {e}")
        return {"error": str(e)}


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user_id: int = None  # TODO: Extrair do JWT com Depends
):
    """Deleta uma sessão de chat"""
    if not user_id:
        return {"error": "user_id required"}

    try:
        await session_manager.delete_session(session_id, user_id)
        return {"success": True, "message": "Session deleted"}
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        return {"error": str(e)}
