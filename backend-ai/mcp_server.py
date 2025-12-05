#!/usr/bin/env python3
"""
MCP Server wrapper para DuraEco Backend API
Expõe os endpoints FastAPI como ferramentas MCP para Claude Code

Suporte a Autenticação:
- Configure a variável de ambiente MCP_AUTH_TOKEN com o token JWT
- O token será injetado automaticamente em todas as requisições

Exemplo de configuração no Claude Code:
{
  "mcpServers": {
    "duraeco-backend": {
      "type": "stdio",
      "command": "python3",
      "args": ["/path/to/mcp_server.py"],
      "env": {
        "MCP_AUTH_TOKEN": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
"""

import asyncio
import sys
import os
from pathlib import Path

import httpx

# Adicionar diretório pai ao path para importar app
sys.path.insert(0, str(Path(__file__).parent))

# Configurar variáveis de ambiente mínimas para evitar erro de conexão
os.environ.setdefault('DB_HOST', 'localhost')
os.environ.setdefault('DB_NAME', 'duraeco')
os.environ.setdefault('DB_USER', 'root')
os.environ.setdefault('DB_PASSWORD', '')
os.environ.setdefault('JWT_SECRET', 'dev-secret-key')
os.environ.setdefault('STORAGE_PATH', './images')

try:
    from fastapi_mcp import FastApiMCP
    # Import app aqui - se falhar por causa do DB, vamos capturar
    from app import app  # Importa a aplicação FastAPI do DuraEco
except ImportError as e:
    print(f"Erro ao importar: {e}", file=sys.stderr)
    print("Execute: pip install fastapi-mcp", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    # Se falhar na importação do app (ex: DB não conectado), mostrar aviso mas continuar
    print(f"Aviso: Erro ao inicializar app completo: {e}", file=sys.stderr)
    print("MCP pode funcionar parcialmente sem conexão com banco de dados", file=sys.stderr)
    # Criar app mínimo se o import falhou
    from fastapi import FastAPI
    app = FastAPI(title="DuraEco Backend (Modo MCP - DB não conectado)")


class AuthenticatedTransport(httpx.ASGITransport):
    """
    Transport customizado que injeta o header Authorization em todas as requisições.
    Herda do ASGITransport para manter a comunicação direta com a app FastAPI.
    """

    def __init__(self, app, auth_token: str | None = None, **kwargs):
        super().__init__(app=app, raise_app_exceptions=False, **kwargs)
        self.auth_token = auth_token

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        # Injetar header Authorization se temos um token
        if self.auth_token:
            # Garantir formato correto (Bearer token)
            token = self.auth_token
            if not token.lower().startswith('bearer '):
                token = f"Bearer {token}"
            request.headers['authorization'] = token
        return await super().handle_async_request(request)


def create_authenticated_client() -> httpx.AsyncClient:
    """
    Cria um cliente HTTP com autenticação automática.
    Lê o token da variável de ambiente MCP_AUTH_TOKEN.
    """
    auth_token = os.environ.get('MCP_AUTH_TOKEN')

    if auth_token:
        print(f"[MCP] Autenticação configurada via MCP_AUTH_TOKEN", file=sys.stderr)
    else:
        print(f"[MCP] Sem autenticação - endpoints protegidos retornarão 401", file=sys.stderr)
        print(f"[MCP] Configure MCP_AUTH_TOKEN para acessar endpoints protegidos", file=sys.stderr)

    transport = AuthenticatedTransport(app=app, auth_token=auth_token)

    return httpx.AsyncClient(
        transport=transport,
        base_url="http://apiserver",
        timeout=30.0,
    )


async def main():
    """Inicia o servidor MCP"""
    # Cria cliente HTTP autenticado
    http_client = create_authenticated_client()

    # Cria instância do FastAPI-MCP com cliente autenticado
    mcp = FastApiMCP(
        app,
        name="duraeco-backend",
        description="DuraEco Backend API - Sistema de monitoramento de resíduos com IA",
        http_client=http_client,  # Usa nosso cliente com autenticação
    )

    # Executa o servidor MCP via stdio (comunicação com Claude Code)
    from mcp.server.stdio import stdio_server

    # Rodar o servidor MCP com stdio (sem argumentos usa stdin/stdout padrão)
    async with stdio_server() as (read_stream, write_stream):
        await mcp.server.run(
            read_stream,
            write_stream,
            mcp.server.create_initialization_options()
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServidor MCP encerrado", file=sys.stderr)
    except Exception as e:
        print(f"Erro fatal: {e}", file=sys.stderr)
        sys.exit(1)
