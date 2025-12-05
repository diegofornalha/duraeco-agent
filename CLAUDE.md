# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Visão Geral do Projeto

DuraEco é um sistema autônomo de monitoramento de resíduos com IA para o Brasil. Utiliza modelos de IA (via API) para análise multimodal de resíduos.

## Arquitetura

```
duraeco/
├── backend-ai/          # Backend FastAPI (hospedado em VPS)
└── database/            # Schema MySQL/TiDB (18 tabelas, embeddings vetoriais)
```

**Nota:** O aplicativo móvel Flutter (`duraeco/`) está em um repositório separado.

**Fluxo Principal de IA:** Consulta do Usuário → Agente de IA (chamadas de ferramentas multi-round) → SQL/Gráficos/Mapas/Scraping → Resposta

## Comandos do Backend

```bash
# Configuração
cd backend-ai
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Criar arquivo .env com as variáveis de ambiente necessárias (veja seção Variáveis de Ambiente)

# Desenvolvimento
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Produção (VPS)
# Configurar serviço systemd (exemplo):
# sudo nano /etc/systemd/system/duraeco-api.service
# sudo systemctl enable duraeco-api
# sudo systemctl start duraeco-api

# Monitoramento
sudo journalctl -u duraeco-api -f
sudo systemctl restart duraeco-api

# Usando proxy reverso (exemplo nginx):
# sudo nano /etc/nginx/sites-available/duraeco
# sudo ln -s /etc/nginx/sites-available/duraeco /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx
```


## Arquivos Principais do Backend

- `app.py` - Aplicação FastAPI principal com todos os endpoints
- `agentcore_tools.py` - 5 ferramentas personalizadas de agente de IA (SQL, gráficos, mapas, scraping, info)
- `schema_based_chat.py` - Geração dinâmica de SQL para chat
- `web_scraper_tool.py` - Web scraping seguro com whitelist de URLs

## Ferramentas do Agente de IA

1. `execute_sql_query` - Consultar banco de dados com queries parametrizadas (definido em `app.py`)
2. `generate_visualization` - Criar gráficos matplotlib (em `agentcore_tools.py`)
3. `create_map_visualization` - Gerar mapas interativos folium (em `agentcore_tools.py`)
4. `scrape_webpage_with_browser` - Web scraping baseado em Playwright (em `agentcore_tools.py`)
5. `get_duraeco_info` - Buscar informações do projeto do site duraeco (em `web_scraper_tool.py`)

## Banco de Dados

- **Tipo:** MySQL 8.0.30+ / TiDB com suporte VECTOR(1024)
- **Tabelas:** 18 tabelas incluindo users, reports, analysis_results (com embeddings), hotspots, waste_types, locations, admin_users, system_logs, etc.
- **Arquivos de schema:** `database/all_schema/*.sql`
- **Tabelas principais:** users, reports, analysis_results (com embeddings VECTOR(1024)), hotspots, waste_types, locations

## Variáveis de Ambiente

Necessárias no `.env`:
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` - Conexão com banco de dados
- `JWT_SECRET`, `JWT_EXPIRATION_HOURS` - Autenticação
- `STORAGE_PATH` ou `STORAGE_URL` - Caminho de armazenamento local ou URL de armazenamento em nuvem para imagens
- `AI_MODEL_API_KEY`, `AI_MODEL_ENDPOINT` - (Opcional) Se estiver usando serviços de API de IA externos
- `ALLOWED_ORIGINS` - Origens permitidas CORS (separadas por vírgula)

## Limites de Taxa da API

- `/api/chat`: 30/min (processamento de IA)
- `/api/reports` POST: 60/min
- `/api/auth/register`: 5/min
- `/api/auth/login`: 10/min

## Notas de Segurança

- Todas as queries SQL usam statements parametrizados
- Tokens JWT expiram em 24h (HS256)
- Hash de senha: PBKDF2-HMAC-SHA256 (100k iterações)
- Web scraping restrito à whitelist `ALLOWED_URLS`

## Visão Geral dos Endpoints da API

**Autenticação:** `/api/auth/register`, `/api/auth/login`, `/api/auth/verify-otp`, `/api/auth/send-otp`, `/api/auth/change-password`

**Usuários:** `GET/PATCH /api/users/{user_id}`

**Relatórios:** `POST/GET /api/reports`, `GET/DELETE /api/reports/{report_id}`, `GET /api/reports/nearby`

**Dados:** `GET /api/waste-types`, `GET /api/hotspots`, `GET /api/dashboard/statistics`

**Chat de IA:** `POST /api/chat` (agente de IA com chamadas de ferramentas)

## Padrões de Código

**Formato de resposta:**
```python
{"success": True, "data": {...}, "message": "..."}   # Sucesso
{"success": False, "error": "...", "detail": "..."}  # Erro
```

**Conexões de banco de dados:** Usa `DBUtils.PooledDB` com 20 conexões máximas. Sempre feche cursor e conexão no bloco finally.

**Tarefas em background:** Use `background_tasks.add_task()` para processamento assíncrono (ex.: análise de imagem após envio de relatório).

## Embeddings Vetoriais

A tabela `analysis_results` usa embeddings vetoriais (1024 dimensões) para:
- `image_embedding` - Busca por similaridade visual
- `location_embedding` - Agrupamento espacial

Consultar com: `VEC_COSINE_DISTANCE(image_embedding, :query_vector)`
