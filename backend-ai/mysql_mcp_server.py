#!/usr/bin/env python3
"""
MCP Server para MySQL Local
Permite executar queries SQL no banco db_duraeco
"""
import asyncio
import os
import sys
import json
import mysql.connector
from typing import Any
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from pydantic import AnyUrl

# Configuração do banco
DB_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'database': os.getenv('MYSQL_DATABASE', 'db_duraeco'),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'port': int(os.getenv('MYSQL_PORT', '3306'))
}

# Criar servidor MCP
server = Server("mysql-duraeco")

@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """Lista todas as ferramentas disponíveis"""
    return [
        Tool(
            name="execute_query",
            description="Executa uma query SQL SELECT no banco de dados db_duraeco. Retorna os resultados em formato JSON.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Query SQL SELECT a executar (apenas SELECT permitido por segurança)"
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="list_tables",
            description="Lista todas as tabelas disponíveis no banco de dados",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="describe_table",
            description="Mostra a estrutura de uma tabela específica (colunas, tipos, constraints)",
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "Nome da tabela a descrever"
                    }
                },
                "required": ["table_name"]
            }
        ),
        Tool(
            name="table_stats",
            description="Retorna estatísticas de uma tabela (total de registros, tamanho, etc)",
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "Nome da tabela"
                    }
                },
                "required": ["table_name"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Executa uma ferramenta"""

    try:
        # Conectar ao banco
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)

        if name == "execute_query":
            query = arguments.get("query", "")

            # Segurança: apenas SELECT
            if not query.strip().upper().startswith("SELECT"):
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "error": "Apenas queries SELECT são permitidas por segurança"
                    }, indent=2)
                )]

            cursor.execute(query)
            results = cursor.fetchall()

            return [TextContent(
                type="text",
                text=json.dumps({
                    "success": True,
                    "rows": len(results),
                    "data": results
                }, indent=2, default=str)
            )]

        elif name == "list_tables":
            cursor.execute("SHOW TABLES")
            tables = [list(row.values())[0] for row in cursor.fetchall()]

            return [TextContent(
                type="text",
                text=json.dumps({
                    "success": True,
                    "tables": tables,
                    "total": len(tables)
                }, indent=2)
            )]

        elif name == "describe_table":
            table_name = arguments.get("table_name")
            cursor.execute(f"DESCRIBE `{table_name}`")
            columns = cursor.fetchall()

            return [TextContent(
                type="text",
                text=json.dumps({
                    "success": True,
                    "table": table_name,
                    "columns": columns
                }, indent=2)
            )]

        elif name == "table_stats":
            table_name = arguments.get("table_name")

            # Total de registros
            cursor.execute(f"SELECT COUNT(*) as total FROM `{table_name}`")
            count_result = cursor.fetchone()
            total = count_result['total'] if count_result else 0

            # Informações da tabela
            cursor.execute(f"""
                SELECT
                    table_name,
                    engine,
                    table_rows,
                    avg_row_length,
                    data_length,
                    index_length,
                    create_time,
                    update_time
                FROM information_schema.tables
                WHERE table_schema = '{DB_CONFIG['database']}'
                AND table_name = '{table_name}'
            """)
            info = cursor.fetchone()

            return [TextContent(
                type="text",
                text=json.dumps({
                    "success": True,
                    "table": table_name,
                    "total_rows": total,
                    "info": info
                }, indent=2, default=str)
            )]

        else:
            return [TextContent(
                type="text",
                text=json.dumps({
                    "error": f"Ferramenta desconhecida: {name}"
                })
            )]

    except Exception as e:
        return [TextContent(
            type="text",
            text=json.dumps({
                "error": str(e),
                "type": type(e).__name__
            }, indent=2)
        )]

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

async def main():
    """Inicia o servidor MCP"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="mysql-duraeco",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={}
                )
            )
        )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServidor MCP MySQL encerrado", file=sys.stderr)
    except Exception as e:
        print(f"Erro fatal: {e}", file=sys.stderr)
        sys.exit(1)
