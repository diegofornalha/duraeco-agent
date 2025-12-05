#!/usr/bin/env python3
"""
MCP Server wrapper para DuraEco Backend API
Expõe os endpoints FastAPI como ferramentas MCP para Claude Code
"""

import asyncio
import sys
import os
from pathlib import Path

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


async def main():
    """Inicia o servidor MCP"""
    # Cria instância do FastAPI-MCP
    mcp = FastApiMCP(
        app,
        name="duraeco-backend",
        description="DuraEco Backend API - Sistema de monitoramento de resíduos com IA"
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
