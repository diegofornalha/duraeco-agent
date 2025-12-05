"""
DuraEco MCP Server - Unified tool server for Claude Agent SDK

Usa Claude Code CLI local (subprocess) - SEM API KEY necessaria!
"""

from claude_agent_sdk import create_sdk_mcp_server

from .rag_tools import search_similar_waste_images, search_reports_by_location
from .sql_tools import execute_sql_query


# Criar servidor MCP unificado
duraeco_mcp_server = create_sdk_mcp_server(
    name="duraeco",
    version="2.0.0",  # Nova versao com RAG
    tools=[
        # RAG tools (NOVO - busca vetorial)
        search_similar_waste_images,
        search_reports_by_location,

        # SQL tools (migrado do app.py)
        execute_sql_query,

        # TODO: Adicionar depois
        # - generate_visualization (graficos matplotlib sem S3)
        # - create_map_visualization (mapas folium sem S3)
    ]
)

__all__ = [
    "duraeco_mcp_server",
    "search_similar_waste_images",
    "search_reports_by_location",
    "execute_sql_query",
]
