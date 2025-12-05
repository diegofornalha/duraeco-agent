"""
Session Manager para persistência de chat no MySQL

Gerencia sessões de chat e mensagens no banco de dados.
"""

import uuid
from datetime import datetime
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class SessionManager:
    """Gerencia sessões de chat com persistência MySQL"""

    def __init__(self, get_db_connection_func):
        """
        Args:
            get_db_connection_func: Função que retorna conexão do banco
        """
        self.get_db_connection = get_db_connection_func

    async def create_session(self, user_id: int) -> str:
        """Cria nova sessão no banco

        Args:
            user_id: ID do usuário

        Returns:
            session_id: ID da sessão criada (UUID)
        """
        session_id = f"chat_{int(datetime.now().timestamp())}.{uuid.uuid4().hex[:8]}"

        conn = self.get_db_connection()
        if not conn:
            raise Exception("Database connection failed")

        try:
            cursor = conn.cursor()

            # Criar sessão com título temporário
            query = """
                INSERT INTO chat_sessions (session_id, user_id, title, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
            """

            now = datetime.now()
            cursor.execute(query, (
                session_id,
                user_id,
                "Nova Conversa",  # Título padrão
                now,
                now
            ))

            conn.commit()
            cursor.close()
            conn.close()

            logger.info(f"Created chat session {session_id} for user {user_id}")
            return session_id

        except Exception as e:
            logger.error(f"Error creating session: {e}")
            if conn:
                conn.rollback()
                conn.close()
            raise

    async def save_message(
        self,
        session_id: str,
        user_id: int,
        role: str,
        content: str,
        image_url: Optional[str] = None,
        map_url: Optional[str] = None
    ):
        """Salva mensagem no banco

        Args:
            session_id: ID da sessão
            user_id: ID do usuário
            role: 'user' ou 'assistant'
            content: Conteúdo da mensagem
            image_url: URL da imagem (opcional)
            map_url: URL do mapa (opcional)
        """
        conn = self.get_db_connection()
        if not conn:
            raise Exception("Database connection failed")

        try:
            cursor = conn.cursor()

            # Salvar mensagem
            query = """
                INSERT INTO chat_messages
                (session_id, user_id, role, content, image_url, map_url, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """

            cursor.execute(query, (
                session_id,
                user_id,
                role,
                content,
                image_url,
                map_url,
                datetime.now()
            ))

            # Atualizar timestamp da sessão
            update_query = """
                UPDATE chat_sessions
                SET updated_at = %s
                WHERE session_id = %s
            """

            cursor.execute(update_query, (datetime.now(), session_id))

            # Se for primeira mensagem do usuário, usar como título
            if role == "user":
                count_query = """
                    SELECT COUNT(*) as count
                    FROM chat_messages
                    WHERE session_id = %s
                """
                cursor.execute(count_query, (session_id,))
                result = cursor.fetchone()

                if result and result[0] == 1:  # Primeira mensagem
                    title = content[:100] if len(content) <= 100 else content[:97] + "..."
                    title_query = """
                        UPDATE chat_sessions
                        SET title = %s
                        WHERE session_id = %s
                    """
                    cursor.execute(title_query, (title, session_id))

            conn.commit()
            cursor.close()
            conn.close()

            logger.info(f"Saved {role} message to session {session_id}")

        except Exception as e:
            logger.error(f"Error saving message: {e}")
            if conn:
                conn.rollback()
                conn.close()
            raise

    async def get_session_history(
        self,
        session_id: str,
        limit: int = 50
    ) -> List[Dict]:
        """Recupera histórico da sessão

        Args:
            session_id: ID da sessão
            limit: Número máximo de mensagens

        Returns:
            Lista de mensagens
        """
        conn = self.get_db_connection()
        if not conn:
            raise Exception("Database connection failed")

        try:
            cursor = conn.cursor(dictionary=True)

            query = """
                SELECT
                    message_id,
                    role,
                    content,
                    image_url,
                    map_url,
                    created_at
                FROM chat_messages
                WHERE session_id = %s
                ORDER BY created_at ASC
                LIMIT %s
            """

            cursor.execute(query, (session_id, limit))
            messages = cursor.fetchall()

            cursor.close()
            conn.close()

            return messages

        except Exception as e:
            logger.error(f"Error getting session history: {e}")
            if conn:
                conn.close()
            raise

    async def get_user_sessions(
        self,
        user_id: int,
        page: int = 1,
        per_page: int = 20
    ) -> Dict:
        """Lista sessões do usuário

        Args:
            user_id: ID do usuário
            page: Número da página
            per_page: Itens por página

        Returns:
            {sessions: [...], total: N}
        """
        conn = self.get_db_connection()
        if not conn:
            raise Exception("Database connection failed")

        try:
            cursor = conn.cursor(dictionary=True)

            # Contar total
            count_query = """
                SELECT COUNT(*) as total
                FROM chat_sessions
                WHERE user_id = %s
            """
            cursor.execute(count_query, (user_id,))
            count_result = cursor.fetchone()
            total = count_result["total"] if count_result else 0

            # Buscar sessões
            offset = (page - 1) * per_page
            query = """
                SELECT
                    session_id,
                    title,
                    created_at,
                    updated_at
                FROM chat_sessions
                WHERE user_id = %s
                ORDER BY updated_at DESC
                LIMIT %s OFFSET %s
            """

            cursor.execute(query, (user_id, per_page, offset))
            sessions = cursor.fetchall()

            cursor.close()
            conn.close()

            return {
                "sessions": sessions,
                "total": total,
                "page": page,
                "per_page": per_page
            }

        except Exception as e:
            logger.error(f"Error getting user sessions: {e}")
            if conn:
                conn.close()
            raise

    async def delete_session(self, session_id: str, user_id: int):
        """Deleta sessão e suas mensagens

        Args:
            session_id: ID da sessão
            user_id: ID do usuário (para segurança)
        """
        conn = self.get_db_connection()
        if not conn:
            raise Exception("Database connection failed")

        try:
            cursor = conn.cursor()

            # Deletar mensagens primeiro (chave estrangeira)
            delete_messages = """
                DELETE FROM chat_messages
                WHERE session_id = %s
            """
            cursor.execute(delete_messages, (session_id,))

            # Deletar sessão
            delete_session = """
                DELETE FROM chat_sessions
                WHERE session_id = %s AND user_id = %s
            """
            cursor.execute(delete_session, (session_id, user_id))

            conn.commit()
            cursor.close()
            conn.close()

            logger.info(f"Deleted session {session_id}")

        except Exception as e:
            logger.error(f"Error deleting session: {e}")
            if conn:
                conn.rollback()
                conn.close()
            raise
