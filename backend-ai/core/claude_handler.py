"""
Claude Handler com Pool de Conexões para Agent SDK

Inspirado em: /Users/2a/Desktop/duraeco/backend-chat/core/claude_handler.py
"""

import asyncio
import time
from typing import AsyncGenerator, Dict, Optional
from datetime import datetime, timedelta

from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions


class ClaudeHandler:
    """Handler com pool de conexões para Agent SDK"""

    POOL_MAX_SIZE = 10
    POOL_MIN_SIZE = 2
    CONNECTION_MAX_AGE_MINUTES = 60
    CONNECTION_MAX_USES = 100
    HEALTH_CHECK_INTERVAL = 300  # 5 minutos

    def __init__(self):
        self._sessions: Dict[str, Dict] = {}
        self._session_locks: Dict[str, asyncio.Lock] = {}
        self._pool_lock = asyncio.Lock()
        self._last_health_check = time.time()

    async def create_session(
        self,
        session_id: str,
        options: ClaudeAgentOptions
    ) -> Optional[ClaudeSDKClient]:
        """Cria ou reutiliza sessão Agent SDK"""
        async with self._pool_lock:
            # Verificar se sessão existe e está válida
            if session_id in self._sessions:
                session_data = self._sessions[session_id]

                # Verificar age e uso
                age_minutes = (
                    datetime.now() - session_data["created_at"]
                ).total_seconds() / 60

                if (
                    age_minutes < self.CONNECTION_MAX_AGE_MINUTES
                    and session_data["use_count"] < self.CONNECTION_MAX_USES
                ):
                    session_data["use_count"] += 1
                    session_data["last_used"] = datetime.now()
                    return session_data["client"]

                # Sessão expirada, fechar
                await self._close_session_internal(session_id)

            # Criar nova sessão
            if session_id not in self._session_locks:
                self._session_locks[session_id] = asyncio.Lock()

            session_data = {
                "client": None,  # Será criado no contexto
                "options": options,
                "created_at": datetime.now(),
                "last_used": datetime.now(),
                "use_count": 1,
            }

            self._sessions[session_id] = session_data
            return None  # Cliente será criado com context manager

    async def send_message(
        self,
        session_id: str,
        message: str,
        options: ClaudeAgentOptions
    ) -> AsyncGenerator[Dict, None]:
        """Envia mensagem e retorna stream de respostas"""

        # Criar ou reutilizar sessão
        await self.create_session(session_id, options)

        # Lock da sessão
        if session_id not in self._session_locks:
            self._session_locks[session_id] = asyncio.Lock()

        async with self._session_locks[session_id]:
            # Usar ClaudeSDKClient como context manager
            async with ClaudeSDKClient(options=options) as client:
                await client.query(message)

                async for msg in client.receive_response():
                    yield msg

    async def close_session(self, session_id: str):
        """Fecha sessão e libera recursos"""
        async with self._pool_lock:
            await self._close_session_internal(session_id)

    async def _close_session_internal(self, session_id: str):
        """Fecha sessão (interno, sem lock)"""
        if session_id in self._sessions:
            # Cleanup
            del self._sessions[session_id]

        if session_id in self._session_locks:
            del self._session_locks[session_id]

    async def health_check(self):
        """Verifica saúde das sessões e remove expiradas"""
        now = time.time()

        # Executar apenas se passou tempo suficiente
        if now - self._last_health_check < self.HEALTH_CHECK_INTERVAL:
            return

        async with self._pool_lock:
            expired_sessions = []

            for session_id, session_data in self._sessions.items():
                age_minutes = (
                    datetime.now() - session_data["created_at"]
                ).total_seconds() / 60

                if age_minutes >= self.CONNECTION_MAX_AGE_MINUTES:
                    expired_sessions.append(session_id)

            # Remover sessões expiradas
            for session_id in expired_sessions:
                await self._close_session_internal(session_id)

            self._last_health_check = now

    def get_pool_stats(self) -> Dict:
        """Retorna estatísticas do pool"""
        return {
            "active_sessions": len(self._sessions),
            "max_pool_size": self.POOL_MAX_SIZE,
            "last_health_check": datetime.fromtimestamp(
                self._last_health_check
            ).isoformat(),
        }
