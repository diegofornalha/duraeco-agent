# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visao Geral do Projeto

DuraEco e um sistema autonomo de monitoramento de residuos com IA para o Brasil. Utiliza Amazon Bedrock (modelo Nova Pro) e AgentCore para analise multimodal de imagens de residuos, geracao de graficos e mapas interativos.

## Arquitetura

```
duraeco/
├── backend-ai/          # Backend FastAPI + Bedrock AgentCore
├── duraeco-web/         # Frontend Angular 21 + TailwindCSS 4
└── database/            # Schema MySQL/TiDB (19 tabelas, embeddings VECTOR)
```

**Fluxo Principal de IA:**
Usuario submete imagem → AgentCore analisa residuo → Salva resultado no banco → Detecta hotspots automaticamente

## Comandos de Desenvolvimento

### Backend (FastAPI)
```bash
cd backend-ai
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Desenvolvimento (porta 8000)
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Servidores MCP (para Claude Code)
python3 mcp_server.py          # Expoe API FastAPI como ferramentas MCP
python3 mysql_mcp_server.py    # Acesso direto ao MySQL
```

### Frontend Web (Angular 21)
```bash
cd duraeco-web
bun install   # ou npm install

# Desenvolvimento (porta 4200)
bun start     # ou ng serve

# Build producao
bun run build

# Testes
bun test      # ou ng test
```

## Arquivos Principais

### Backend (`backend-ai/`)
| Arquivo | Descricao |
|---------|-----------|
| `app.py` | App FastAPI com todos endpoints, AgentCore agents, processamento de imagens |
| `agentcore_tools.py` | Ferramentas do agente: graficos (matplotlib), mapas (folium), scraping (playwright) |
| `schema_based_chat.py` | Schema publico do banco + prompt do chat agent |
| `mcp_server.py` | Wrapper MCP para expor API FastAPI |
| `mysql_mcp_server.py` | Servidor MCP para queries SQL diretas |

### Frontend (`duraeco-web/src/app/`)
| Diretorio | Descricao |
|-----------|-----------|
| `core/guards/auth.guard.ts` | `authGuard` (rotas protegidas), `guestGuard` (login/register) |
| `core/interceptors/auth.interceptor.ts` | Injeta JWT em requisicoes, trata 401 |
| `core/services/` | `AuthService`, `ReportsService`, `ChatService`, `ApiService` |
| `pages/` | Componentes lazy-loaded: dashboard, reports, hotspots, chat, profile |
| `app.routes.ts` | Configuracao de rotas com guards |

## Ferramentas do Agente de IA

O sistema usa Bedrock AgentCore com 2 entrypoints principais em `app.py`:

1. **`analyze_waste_image`** - Analise de imagens de residuos
   - Detecta se imagem contem lixo/residuo
   - Classifica tipo de residuo (Plastic, Paper, Glass, Metal, Organic, etc.)
   - Calcula severity_score (1-10) e priority_level

2. **`chat_agent`** - Agente de chat com acesso ao banco
   - Gera queries SQL dinamicamente
   - Responde perguntas sobre dados de residuos

Ferramentas auxiliares em `agentcore_tools.py`:
- `generate_visualization` - Graficos bar/line/pie (matplotlib → S3)
- `create_map_visualization` - Mapas interativos (folium → S3)
- `scrape_webpage_with_browser` - Web scraping com Playwright

## Banco de Dados

- **Tipo:** MySQL 8.0.30+ / TiDB com suporte VECTOR(1024)
- **Nome:** `db_duraeco` (producao) ou conforme `.env`
- **Tabelas principais:** users, reports, analysis_results, hotspots, waste_types, chat_sessions, chat_messages
- **Embeddings vetoriais:** `analysis_results.image_embedding` e `location_embedding` para busca por similaridade

```sql
-- Busca por similaridade de imagem
SELECT r.*, VEC_COSINE_DISTANCE(ar.image_embedding, :query_vector) as similarity
FROM reports r JOIN analysis_results ar ON r.report_id = ar.report_id
ORDER BY similarity ASC LIMIT 10;
```

## Variaveis de Ambiente (`backend-ai/.env`)

```bash
# Banco de dados (obrigatorias)
DB_HOST=localhost
DB_NAME=db_duraeco
DB_USER=root
DB_PASSWORD=
DB_PORT=3306

# JWT (obrigatorias)
JWT_SECRET=your-secret-key
JWT_EXPIRATION_HOURS=24

# CORS
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000

# AWS (para S3 e Bedrock)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET_NAME=

# MCP Server (opcional - token para autenticacao automatica)
MCP_AUTH_TOKEN=Bearer eyJhbGci...
```

## Endpoints da API

### Autenticacao
- `POST /api/auth/register` - Registro direto (sem OTP)
- `POST /api/auth/login` - Login com username/password
- `POST /api/auth/verify-otp` - Verificacao OTP
- `POST /api/auth/change-password` - Alterar senha

### Usuarios
- `GET/PATCH /api/users/{user_id}` - Buscar/atualizar perfil

### Relatorios
- `POST /api/reports` - Submeter relatorio (dispara analise em background)
- `GET /api/reports` - Listar relatorios (paginado)
- `GET /api/reports/nearby` - Relatorios proximos (lat, lon, radius)
- `GET/DELETE /api/reports/{report_id}` - Buscar/deletar relatorio

### Dados
- `GET /api/waste-types` - Tipos de residuos
- `GET /api/hotspots` - Areas com concentracao de residuos
- `GET /api/dashboard/statistics` - Estatisticas do dashboard

### Chat de IA
- `POST /api/chat` - Chat com agente (requer JWT, tool calls multi-round)
- `GET /api/chat/sessions` - Listar sessoes de chat (requer JWT)
- `GET /api/chat/sessions/{id}/messages` - Mensagens de uma sessao (requer JWT)
- `PATCH /api/chat/sessions/{id}` - Atualizar titulo de sessao (requer JWT)
- `DELETE /api/chat/sessions/{id}` - Deletar sessao de chat (requer JWT)

**Rate Limits:** `/api/chat` 30/min, `/api/reports` POST 20/hour, `/api/auth/register` 5/min

**Autenticacao:** Todos os endpoints de chat agora usam JWT via header `Authorization: Bearer <token>`. O `authInterceptor` no frontend injeta o token automaticamente.

## Padroes de Codigo

### Formato de Resposta da API
```python
# Sucesso
{"status": "success", "data": {...}, "message": "..."}

# Erro
{"status": "error", "error": "...", "detail": "..."}

# Com token (login/register)
{"token": "jwt...", "user": {...}}
```

### Backend Python
- Pool de conexoes: `DBUtils.PooledDB` (max 20 conexoes)
- Sempre fechar cursor/connection em `finally`
- Tarefas async: `background_tasks.add_task()` para processamento de IA
- Queries SQL sempre parametrizadas (`%s` placeholders)
- JWT expira em 24h (algoritmo HS256)

### Frontend Angular
- Componentes standalone com lazy loading via `loadComponent()`
- State management com Angular Signals (`signal()`, `computed()`)
- Guards funcionais: `authGuard`, `guestGuard`
- Interceptor funcional para JWT: `authInterceptor`
- Services com `providedIn: 'root'`

## Deteccao de Hotspots

Hotspots sao criados automaticamente quando 3+ relatorios existem em raio de 500m:

```python
# Em app.py:check_and_create_hotspots()
# Usa formula Haversine para calcular distancia
6371 * acos(cos(radians(lat1)) * cos(radians(lat2)) *
            cos(radians(lng2) - radians(lng1)) +
            sin(radians(lat1)) * sin(radians(lat2)))
```

## MCP Servers

Dois servidores MCP disponiveis para Claude Code:

1. **duraeco-backend** (`mcp_server.py`)
   - Expoe todos endpoints FastAPI como ferramentas
   - Suporta autenticacao via `MCP_AUTH_TOKEN`

2. **mysql-duraeco** (`mysql_mcp_server.py`)
   - `execute_query` - SELECT queries (somente leitura)
   - `list_tables` - Listar tabelas
   - `describe_table` - Estrutura de tabela
   - `table_stats` - Estatisticas

Configuracao em `~/.claude.json`:
```json
{
  "mcpServers": {
    "mysql-duraeco": {
      "command": "python3",
      "args": ["/path/to/mysql_mcp_server.py"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_DATABASE": "db_duraeco"
      }
    }
  }
}
```
