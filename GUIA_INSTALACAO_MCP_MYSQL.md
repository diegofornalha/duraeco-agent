# 📘 Guia de Instalação - MCP MySQL DuraEco

**Como instalar o MCP MySQL customizado para acesso ao banco de dados**

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ Python 3.10 ou superior instalado
- ✅ MySQL/MariaDB rodando localmente
- ✅ Claude Code instalado
- ✅ Biblioteca `mcp` do Python instalada
- ✅ Biblioteca `mysql-connector-python` instalada

### Instalar dependências Python:

```bash
pip3 install mcp mysql-connector-python
```

---

## 🚀 Passo a Passo da Instalação

### Passo 1: Criar o Script do MCP Server

Crie o arquivo `/Users/2a/Desktop/duraeco/backend-ai/mysql_mcp_server.py`:

```python
#!/usr/bin/env python3
"""
MCP Server para MySQL Local
Permite executar queries SQL no banco de dados
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
            description="Executa uma query SQL SELECT no banco de dados. Retorna os resultados em formato JSON.",
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
```

### Passo 2: Tornar o Script Executável

```bash
chmod +x /Users/2a/Desktop/duraeco/backend-ai/mysql_mcp_server.py
```

### Passo 3: Adicionar ao Claude Code

Use o comando `claude mcp add` com as variáveis de ambiente:

```bash
claude mcp add mysql-duraeco \
  --env MYSQL_HOST=localhost \
  --env MYSQL_DATABASE=db_duraeco \
  --env MYSQL_USER=root \
  --env MYSQL_PASSWORD= \
  --env MYSQL_PORT=3306 \
  -- python3 /Users/2a/Desktop/duraeco/backend-ai/mysql_mcp_server.py
```

**Parâmetros:**
- `mysql-duraeco` - Nome do MCP (pode ser qualquer nome)
- `--env MYSQL_HOST` - Host do MySQL (geralmente localhost)
- `--env MYSQL_DATABASE` - Nome do banco de dados
- `--env MYSQL_USER` - Usuário do MySQL
- `--env MYSQL_PASSWORD` - Senha do MySQL (vazia se não tiver)
- `--env MYSQL_PORT` - Porta do MySQL (padrão: 3306)
- `-- python3 /caminho/do/script.py` - Comando para executar o MCP

### Passo 4: Verificar Conexão

```bash
claude mcp list
```

**Saída esperada:**
```
✓ mysql-duraeco: python3 /Users/2a/Desktop/duraeco/backend-ai/mysql_mcp_server.py - ✓ Connected
```

### Passo 5: Reiniciar Claude Code

**IMPORTANTE:** Depois de adicionar o MCP, você **DEVE** reiniciar o Claude Code para que as ferramentas fiquem disponíveis.

1. Feche completamente o Claude Code
2. Abra novamente
3. As ferramentas do MCP estarão disponíveis

---

## 🎯 Configuração Manual (Alternativa)

Se preferir, pode editar diretamente o arquivo de configuração do Claude Code:

**Arquivo:** `~/.claude.json`

Adicione esta seção em `mcpServers`:

```json
{
  "mcpServers": {
    "mysql-duraeco": {
      "command": "python3",
      "args": [
        "/Users/2a/Desktop/duraeco/backend-ai/mysql_mcp_server.py"
      ],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_DATABASE": "db_duraeco",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "",
        "MYSQL_PORT": "3306"
      }
    }
  }
}
```

---

## 🧪 Testar o MCP

Depois de reiniciar o Claude Code, teste as ferramentas:

### Teste 1: Listar Tabelas
```
Liste todas as tabelas do banco de dados
```

### Teste 2: Descrever Tabela
```
Mostre a estrutura da tabela users
```

### Teste 3: Estatísticas
```
Quantos registros tem na tabela reports?
```

### Teste 4: Query Customizada
```
Execute: SELECT * FROM users LIMIT 5
```

---

## 🔧 Customização

### Adicionar Novas Ferramentas

Edite `mysql_mcp_server.py` e adicione novos Tools em `handle_list_tools()`:

```python
Tool(
    name="nova_ferramenta",
    description="Descrição da ferramenta",
    inputSchema={
        "type": "object",
        "properties": {
            "parametro": {
                "type": "string",
                "description": "Descrição do parâmetro"
            }
        },
        "required": ["parametro"]
    }
)
```

E implemente a lógica em `handle_call_tool()`:

```python
elif name == "nova_ferramenta":
    parametro = arguments.get("parametro")
    # Sua lógica aqui
    return [TextContent(
        type="text",
        text=json.dumps({"resultado": "..."})
    )]
```

### Mudar Banco de Dados

Para usar com outro banco, altere as variáveis de ambiente ao adicionar:

```bash
claude mcp add mysql-outro-db \
  --env MYSQL_DATABASE=outro_banco \
  -- python3 /caminho/mysql_mcp_server.py
```

---

## 🐛 Troubleshooting

### Erro: "Failed to connect"

**Causa 1:** MySQL não está rodando
```bash
# Verificar se MySQL está ativo
mysql -u root -e "SELECT 1"

# Iniciar MySQL (macOS)
brew services start mysql
```

**Causa 2:** Credenciais incorretas
```bash
# Testar conexão manualmente
mysql -h localhost -u root -p
```

**Causa 3:** Biblioteca Python não instalada
```bash
pip3 install mcp mysql-connector-python
```

### Erro: "No such tool available"

**Causa:** Claude Code não foi reiniciado após adicionar o MCP

**Solução:** Feche e abra o Claude Code novamente

### Erro: "Only SELECT queries allowed"

**Causa:** Por segurança, o MCP só permite queries SELECT

**Solução:** Use o MCP duraeco-backend para operações de escrita (INSERT, UPDATE, DELETE)

---

## 🔄 Atualizar o MCP

Se você modificar o `mysql_mcp_server.py`:

1. Não precisa remover/adicionar novamente
2. Apenas reinicie o Claude Code
3. As mudanças serão aplicadas automaticamente

---

## 🗑️ Remover o MCP

Se quiser remover o MCP:

```bash
claude mcp remove mysql-duraeco
```

---

## 📚 Exemplos de Uso

### Análise de Dados

```
Quantos relatórios existem por status?
```

O MCP executará:
```sql
SELECT status, COUNT(*) as total
FROM reports
GROUP BY status
```

### Exploração de Estrutura

```
Quais colunas tem a tabela hotspots e seus tipos?
```

O MCP executará:
```sql
DESCRIBE hotspots
```

### Queries Complexas

```
Me mostre os 10 hotspots com mais relatórios
```

O MCP executará:
```sql
SELECT name, total_reports, average_severity
FROM hotspots
ORDER BY total_reports DESC
LIMIT 10
```

---

## ⚙️ Variáveis de Ambiente Suportadas

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `MYSQL_HOST` | localhost | Endereço do servidor MySQL |
| `MYSQL_PORT` | 3306 | Porta do MySQL |
| `MYSQL_DATABASE` | db_duraeco | Nome do banco de dados |
| `MYSQL_USER` | root | Usuário do MySQL |
| `MYSQL_PASSWORD` | (vazio) | Senha do MySQL |

---

## 🔒 Segurança

### O que está protegido:
- ✅ Apenas queries SELECT são permitidas
- ✅ Conexão via localhost (não exposta)
- ✅ Credenciais em variáveis de ambiente

### Limitações de segurança:
- ⚠️ Não há rate limiting
- ⚠️ Não há validação de SQL injection (use com cuidado)
- ⚠️ Sem logs de auditoria

**Recomendação:** Use apenas em ambiente de desenvolvimento local.

---

## 📊 Diferenças entre MCPs

| Característica | MCP MySQL | MCP DuraEco Backend |
|----------------|-----------|---------------------|
| **Acesso** | Direto ao banco | Via API REST |
| **Operações** | Apenas SELECT | CREATE, READ, UPDATE, DELETE |
| **Autenticação** | Não requer | JWT necessário |
| **Velocidade** | Ultra rápido | Mais lento (HTTP overhead) |
| **Uso** | Análise de dados | Operações de negócio |

---

## ✅ Checklist de Instalação

- [ ] Python 3.10+ instalado
- [ ] MySQL rodando
- [ ] Dependências Python instaladas (`mcp`, `mysql-connector-python`)
- [ ] Script `mysql_mcp_server.py` criado
- [ ] Permissões de execução configuradas (`chmod +x`)
- [ ] MCP adicionado ao Claude Code
- [ ] Conexão verificada (`claude mcp list`)
- [ ] Claude Code reiniciado
- [ ] Ferramentas testadas

---

## 🎉 Conclusão

Agora você tem um MCP MySQL customizado instalado e funcionando!

**Benefícios:**
- ✅ Acesso direto ao banco de dados
- ✅ Queries SQL customizadas
- ✅ Análise de estrutura e estatísticas
- ✅ Ultra rápido e eficiente
- ✅ Seguro (read-only)

**Próximos passos:**
1. Explore suas tabelas com `list_tables`
2. Analise dados com `execute_query`
3. Combine com outros MCPs para workflows completos

---

*Guia criado em: 05/12/2025*
*Versão: 1.0.0*
*Autor: Claude Code*
