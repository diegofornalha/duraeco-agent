# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão Geral do Projeto

DuraEco é um sistema autônomo de monitoramento de resíduos com IA para o Brasil. Utiliza modelos de IA (via Amazon Bedrock AgentCore) para análise multimodal de resíduos.

## Arquitetura

```
duraeco/
├── backend-ai/          # Backend FastAPI + Bedrock AgentCore (hospedado em VPS)
├── duraeco-web/         # Frontend Angular 21 + TailwindCSS (SPA)
└── database/            # Schema MySQL/TiDB (19 tabelas, embeddings vetoriais)
```

**Nota:** O aplicativo móvel Flutter está em um repositório separado.

**Fluxo Principal de IA:** Consulta do Usuário → Agente de IA (chamadas de ferramentas multi-round) → SQL/Gráficos/Mapas/Scraping → Resposta

## Comandos de Desenvolvimento

### Backend (FastAPI)
```bash
cd backend-ai
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Desenvolvimento
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Executar servidor MCP (para Claude Code)
python3 mcp_server.py
```

### Frontend Web (Angular)
```bash
cd duraeco-web
bun install  # ou npm install

# Desenvolvimento
bun start    # ou ng serve (http://localhost:4200)

# Build produção
bun run build

# Testes
bun test     # ou ng test
```

### MCP Servers
O projeto inclui dois servidores MCP para Claude Code:
- `mcp_server.py` - Expõe endpoints FastAPI como ferramentas MCP
- `mysql_mcp_server.py` - Acesso direto ao banco de dados via MCP

## Arquivos Principais do Backend

- `app.py` - Aplicação FastAPI principal com todos os endpoints
- `agentcore_tools.py` - 5 ferramentas personalizadas de agente de IA
- `schema_based_chat.py` - Geração dinâmica de SQL para chat
- `web_scraper_tool.py` - Web scraping seguro com whitelist de URLs
- `mcp_server.py` - Servidor MCP que expõe API FastAPI
- `mysql_mcp_server.py` - Servidor MCP para acesso direto ao MySQL

## Arquitetura Frontend Web (Angular 21)

```
duraeco-web/src/app/
├── core/
│   ├── guards/auth.guard.ts    # authGuard, guestGuard
│   ├── interceptors/           # Interceptor de autenticação JWT
│   ├── models/                 # Interfaces TypeScript
│   └── services/               # AuthService, ReportsService, ChatService, ApiService
├── pages/                      # Componentes de página (lazy-loaded)
│   ├── dashboard/, reports/, hotspots/, chat/, profile/
│   ├── login/, register/
│   ├── new-report/, report-detail/
└── app.routes.ts               # Rotas com guards de autenticação
```

**Stack Frontend:** Angular 21 standalone components, RxJS, TailwindCSS 4, Bun como package manager.

## Ferramentas do Agente de IA (Bedrock AgentCore)

1. `execute_sql_query` - Consultar banco de dados com queries parametrizadas
2. `generate_visualization` - Criar gráficos matplotlib (salvos no S3)
3. `create_map_visualization` - Gerar mapas interativos folium
4. `scrape_webpage_with_browser` - Web scraping baseado em Playwright
5. `get_duraeco_info` - Buscar informações do projeto

## Banco de Dados

- **Tipo:** MySQL 8.0.30+ / TiDB com suporte VECTOR(1024)
- **Tabelas:** 19 tabelas (users, reports, analysis_results, hotspots, waste_types, locations, api_keys, chat_sessions, chat_messages, etc.)
- **Arquivos de schema:** `database/all_schema/*.sql`

## Variáveis de Ambiente (backend-ai/.env)

**Obrigatórias:**
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`
- `JWT_SECRET`, `JWT_EXPIRATION_HOURS`
- `ALLOWED_ORIGINS` - CORS (separadas por vírgula)

**AWS/S3:**
- `S3_BUCKET_NAME` - Bucket para armazenar imagens e gráficos
- Credenciais AWS via variáveis padrão ou IAM role

**MCP Server:**
- `MCP_AUTH_TOKEN` - Token JWT para autenticação automática

## Endpoints da API

**Autenticação:** `/api/auth/register`, `/api/auth/login`, `/api/auth/verify-otp`, `/api/auth/send-otp`, `/api/auth/change-password`

**Usuários:** `GET/PATCH /api/users/{user_id}`

**Relatórios:** `POST/GET /api/reports`, `GET/DELETE /api/reports/{report_id}`, `GET /api/reports/nearby`

**Dados:** `GET /api/waste-types`, `GET /api/hotspots`, `GET /api/dashboard/statistics`

**Chat de IA:** `POST /api/chat` (agente com chamadas de ferramentas multi-round)

**Rate Limits:** `/api/chat` 30/min, `/api/reports` POST 60/min, `/api/auth/register` 5/min

## Padrões de Código

**Formato de resposta da API:**
```python
{"success": True, "data": {...}, "message": "..."}   # Sucesso
{"success": False, "error": "...", "detail": "..."}  # Erro
```

**Backend:**
- Conexões de banco via `DBUtils.PooledDB` (20 conexões máx.). Sempre fechar cursor/conexão no finally.
- Tarefas assíncronas via `background_tasks.add_task()` para processamento de IA.
- Queries SQL sempre parametrizadas. Tokens JWT expiram em 24h (HS256).

**Frontend Angular:**
- Componentes standalone com lazy loading (`loadComponent`)
- Guards: `authGuard` para rotas protegidas, `guestGuard` para login/register
- Services injetáveis para comunicação com API (`providedIn: 'root'`)

## Embeddings Vetoriais

A tabela `analysis_results` usa embeddings VECTOR(1024) para busca por similaridade:
```sql
VEC_COSINE_DISTANCE(image_embedding, :query_vector)
```
