# CLAUDE.md

Este arquivo fornece orientação ao Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Visão Geral do Projeto

DuraEco é um sistema de monitoramento de resíduos ambientais no Brasil com IA, composto por backend Python/FastAPI e frontend Angular 21.

## Estrutura do Projeto

```
duraeco/
├── backend-ai/          # Backend Python/FastAPI
├── duraeco-web/         # Frontend Angular 21
├── database/            # Scripts e schemas do banco
├── QUICK_START.md       # Guia rápido de inicialização
└── DEBITO-TECNICO.md   # Lista de débitos técnicos
```

## Backend (Python/FastAPI)

### Arquitetura

- **Framework**: FastAPI + Uvicorn
- **IA**: Claude Agent SDK (migrado de AWS Bedrock AgentCore)
- **Banco de dados**: MySQL com DBUtils (connection pooling)
- **Armazenamento**: Sistema local (substitui AWS S3)
- **Autenticação**: JWT tokens

### Estrutura de Diretórios

```
backend-ai/
├── app.py                      # Aplicação FastAPI principal
├── routes/
│   └── chat_routes.py          # WebSocket para chat com Claude SDK
├── core/
│   ├── auth.py                 # Autenticação JWT
│   ├── database.py             # Pool de conexões MySQL
│   ├── claude_handler.py       # Pool de conexões Claude SDK
│   └── session_manager.py      # Gerenciamento de sessões de chat
├── tools/
│   ├── __init__.py             # MCP server unificado
│   ├── rag_tools.py            # Busca vetorial de imagens/relatórios
│   ├── sql_tools.py            # Consultas SQL via MCP
│   ├── vision_tools.py         # Análise de imagens (Claude Vision)
│   └── visualization_tools.py  # Gráficos matplotlib e mapas folium
├── static/                     # Arquivos estáticos (gráficos, mapas)
├── requirements.txt
└── .env
```

### Comandos

```bash
cd backend-ai

# OBRIGATÓRIO: Ativar virtualenv
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Iniciar servidor de desenvolvimento
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Popular banco de dados (primeira vez)
python populate_db.py

# Health check
curl http://localhost:8000/health
```

### Configuração (.env)

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=db_duraeco
DB_PORT=3306
JWT_SECRET=seu_secret_key
ANTHROPIC_API_KEY=sk-ant-...
```

### Padrões de Código

- **Autenticação**: Sempre usar `verify_token()` para extrair user_id do JWT
- **Database**: Usar `get_db_connection()` com context manager
- **Claude SDK**: Usar `session_manager` para gerenciar sessões
- **MCP Tools**: Registrar ferramentas em `tools/__init__.py` via `duraeco_mcp_server`
- **Armazenamento**: Salvar em `static/charts/` ou `static/maps/`, retornar URL `/static/...`

### Endpoints Principais

- `GET /health` - Health check
- `GET /docs` - Documentação Swagger
- `WS /api/chat/ws?token=<jwt>` - WebSocket chat
- `GET /api/reports` - Listar relatórios
- `POST /api/reports` - Criar relatório
- `GET /api/dashboard/statistics` - Estatísticas do dashboard

## Frontend (Angular 21)

### Arquitetura

- **Framework**: Angular 21 (standalone components)
- **Package Manager**: Bun 1.3.3
- **Estilo**: Tailwind CSS 4.x
- **Comunicação**: HTTP + WebSocket

### Estrutura de Diretórios

```
duraeco-web/src/app/
├── pages/
│   ├── chat/                   # Interface de chat
│   ├── dashboard/              # Dashboard com estatísticas
│   ├── reports/                # Listagem de relatórios
│   ├── report-detail/          # Detalhes do relatório
│   ├── hotspots/               # Hotspots de resíduos
│   ├── login/                  # Autenticação
│   ├── register/               # Cadastro
│   ├── profile/                # Perfil do usuário
│   └── new-report/             # Novo relatório
├── core/
│   ├── services/
│   │   ├── api.service.ts              # Base para HTTP
│   │   ├── auth.service.ts             # Autenticação JWT
│   │   ├── reports.service.ts          # CRUD de relatórios
│   │   └── websocket-chat.service.ts   # Cliente WebSocket
│   ├── guards/                 # Route guards
│   ├── interceptors/           # HTTP interceptors
│   └── models/                 # TypeScript interfaces
├── app.routes.ts               # Configuração de rotas
├── app.config.ts               # Configuração da aplicação
└── app.ts                      # Componente raiz
```

### Comandos

```bash
cd duraeco-web

# Instalar dependências
bun install

# Iniciar servidor de desenvolvimento
bun start
# ou: ng serve

# Build para produção
ng build

# Executar testes
ng test

# Limpar cache (problemas de cache são comuns!)
rm -rf .angular/cache node_modules/.cache dist
pkill -f "ng serve"  # Matar processos duplicados
```

### Padrões Angular 21

#### Standalone Components

Todos os componentes são standalone (sem NgModule):

```typescript
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-exemplo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exemplo.html',
})
export class ExemploComponent {
  // Use inject() ao invés de constructor injection
  private service = inject(MeuService);

  // Prefira signals ao invés de BehaviorSubject
  dados = signal<Dados[]>([]);
}
```

#### Nova Sintaxe de Control Flow

Use `@if`, `@for`, `@switch` ao invés de `*ngIf`, `*ngFor`:

```html
<!-- CORRETO - Nova sintaxe -->
@if (dados().length > 0) {
  @for (item of dados(); track item.id) {
    <div>{{ item.nome }}</div>
  }
} @else {
  <p>Nenhum dado encontrado</p>
}

<!-- INCORRETO - Sintaxe antiga -->
<div *ngIf="dados.length > 0">
  <div *ngFor="let item of dados">{{ item.nome }}</div>
</div>
```

## Sistema de Chat (Claude Agent SDK)

### Arquitetura

- **Protocolo**: WebSocket (tempo real)
- **MCP Server**: `duraeco_mcp_server` expõe ferramentas
- **Sessões**: Histórico persistido no banco de dados
- **Streaming**: Respostas do Claude enviadas em tempo real

### Formato de Mensagens WebSocket

**Cliente → Servidor:**
```json
{
  "type": "chat_message",
  "content": "Analise esta imagem",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "image_base64": "data:image/jpeg;base64,..."  // opcional
}
```

**Servidor → Cliente (streaming):**
```json
{
  "type": "text_delta",
  "content": "chunk de texto"
}
{
  "type": "tool_use",
  "tool_name": "execute_sql_query",
  "tool_input": {"query": "SELECT..."}
}
{
  "type": "tool_result",
  "tool_use_id": "...",
  "content": "[{...}]"
}
{
  "type": "response_complete"
}
```

### Ferramentas MCP Disponíveis

1. **RAG Tools** (`rag_tools.py`):
   - `search_similar_waste_images` - Busca vetorial de imagens
   - `search_reports_by_location` - Busca de relatórios por localização

2. **SQL Tools** (`sql_tools.py`):
   - `execute_sql_query` - Executa consultas SQL

3. **Vision Tools** (`vision_tools.py`):
   - Análise de imagens com Claude Vision

4. **Visualization Tools** (`visualization_tools.py`):
   - Gráficos matplotlib
   - Mapas folium

## Banco de Dados MySQL

### Configuração

- **Host**: Configurado via `.env`
- **Pool**: DBUtils gerencia pool de conexões
- **Schema**: `db_duraeco` (nome configurável)

### Tabelas Principais

```sql
users               -- Usuários do sistema
reports             -- Relatórios de resíduos
hotspots            -- Locais com alta concentração de resíduos
chat_sessions       -- Sessões de chat
chat_messages       -- Histórico de mensagens
image_processing_queue  -- Fila de processamento de imagens
```

### MCP MySQL Server

MCP server configurado que expõe:
- `list_tables` - Lista tabelas
- `describe_table` - Descreve estrutura
- `execute_query` - Executa SELECT
- `table_stats` - Estatísticas da tabela

## Fluxo de Autenticação (JWT)

1. **Login**:
   - Frontend: `POST /api/auth/login` → recebe `access_token`
   - Frontend: Armazena em `localStorage`

2. **Requests HTTP**:
   - Frontend: Envia `Authorization: Bearer <token>`
   - Backend: `verify_token()` → extrai `user_id`

3. **WebSocket**:
   - Token em query param: `ws://localhost:8000/api/chat/ws?token=<jwt>`
   - Backend valida antes de aceitar conexão

## URLs do Sistema

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| Chat | http://localhost:4200/chat |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |
| WebSocket Chat | ws://localhost:8000/api/chat/ws |

## Problemas Comuns

### 1. Cache

Cache é o problema mais frequente. Soluções:

```bash
# Frontend
cd duraeco-web
pkill -f "ng serve"
rm -rf .angular/cache node_modules/.cache dist
bun start

# Navegador
# Mac: Cmd + Shift + R
# Windows/Linux: Ctrl + Shift + R
# Ou usar modo incógnito
```

### 2. Virtualenv não ativado

```bash
# Sempre ativar antes de rodar o backend!
cd backend-ai
source venv/bin/activate
# Verificar: deve aparecer (venv) no prompt
```

### 3. Erro: Unknown database

```bash
# Verificar se .env existe e está carregado
cat backend-ai/.env
# Deve ter DB_NAME=db_duraeco
```

### 4. WebSocket não conecta

```bash
# Verificar se backend está rodando
lsof -i :8000
# Se necessário, matar processo
kill -9 <PID>
```

## Débito Técnico

Consultar `DEBITO-TECNICO.md` para funcionalidades incompletas.

**Principal**: Falta endpoint para alterar status de relatórios/hotspots.

## Migração AWS → Local

- **S3 → Local Storage**: Arquivos em `backend-ai/static/`
- **AWS Bedrock → Claude SDK**: Chat usa Claude Agent SDK
- **Limpeza**: Arquivos antigos removidos após 24h

## Convenções de Código

### Idioma

- **Código**: Variáveis, funções, comentários em inglês
- **UI**: Interface em português (pt-BR)
- **Commits**: Mensagens em inglês
- **Documentação**: Português brasileiro

### Python

- Type hints sempre que possível
- Docstrings no formato Google
- Nomes de variáveis descritivos
- Imports organizados (stdlib, third-party, local)

### TypeScript/Angular

- Strict mode habilitado
- Todos os tipos explícitos
- Usar signals ao invés de observables quando possível
- Function injection (`inject()`) ao invés de constructor injection

## Dependências Críticas

### Backend

```
fastapi==0.123.9
uvicorn[standard]==0.38.0
claude-agent-sdk>=0.1.12
mysql-connector-python==9.1.0
DBUtils==3.1.0
PyJWT==2.10.1
Pillow==11.0.0
```

### Frontend

```
@angular/core: ^21.0.0
@angular/router: ^21.0.0
@tailwindcss/postcss: ^4.1.12
rxjs: ~7.8.0
```

## Scripts Úteis

### Start Script Completo

```bash
#!/bin/bash
# start.sh

echo "🧹 Limpando cache..."
pkill -f "ng serve" 2>/dev/null
rm -rf duraeco-web/.angular/cache

echo "🚀 Iniciando Backend..."
cd backend-ai
source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "🌐 Iniciando Frontend..."
cd duraeco-web
bun start &
FRONTEND_PID=$!
cd ..

echo "✅ Servidores iniciados!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:4200"
echo ""
echo "   Para parar: kill $BACKEND_PID $FRONTEND_PID"
```

## Testes

### Backend

```bash
cd backend-ai
source venv/bin/activate
pytest  # (quando houver testes)
```

### Frontend

```bash
cd duraeco-web
ng test  # Vitest
```

## Verificação Rápida

```bash
# Backend rodando?
curl http://localhost:8000/health
# Resposta: {"status":"healthy","service":"duraeco API","version":"1.0.0"}

# Frontend rodando?
curl http://localhost:4200
# Deve retornar HTML do Angular
```

## Recursos Adicionais

- **QUICK_START.md**: Guia rápido de inicialização
- **DEBITO-TECNICO.md**: Lista de débitos técnicos
- **GUIA_INSTALACAO_MCP_MYSQL.md**: Guia de instalação do MCP MySQL

## Notas Importantes

1. **Sempre ativar virtualenv** antes de rodar o backend
2. **Limpar cache** quando houver comportamentos estranhos
3. **Hard refresh** no navegador após mudanças no frontend
4. **Verificar console** do navegador para erros de WebSocket
5. **Git status** mostrado no início contém mudanças não commitadas
