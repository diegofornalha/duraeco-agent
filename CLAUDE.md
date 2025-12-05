# CLAUDE.md

Este arquivo fornece orientação ao Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Arquitetura do Sistema

DuraEco é um sistema de monitoramento de resíduos ambientais no Brasil com IA, composto por:

### Backend (Python/FastAPI)
- **Localização**: `backend-ai/`
- **Framework**: FastAPI + Uvicorn
- **IA**: Claude Agent SDK (migrado de AWS Bedrock AgentCore)
- **Banco de dados**: MySQL com connection pooling (DBUtils)
- **Armazenamento**: Sistema local de arquivos (substitui AWS S3)

### Frontend (Angular 21)
- **Localização**: `duraeco-web/`
- **Framework**: Angular 21 com standalone components
- **Package Manager**: Bun 1.3.3
- **Estilo**: Tailwind CSS 4.x
- **Comunicação**: WebSocket para chat em tempo real

### Comunicação Backend ↔ Frontend
- **REST API**: Endpoints convencionais em `/api/*`
- **WebSocket**: Chat em tempo real em `ws://localhost:8000/api/chat/ws`
- **Autenticação**: JWT tokens via Authorization header

## Estrutura de Arquivos Importantes

### Backend (`backend-ai/`)
```
app.py                    # FastAPI app principal, montagem de routers
routes/
  chat_routes.py          # WebSocket endpoint para chat com Claude SDK
core/
  auth.py                 # JWT authentication
  database.py             # MySQL connection pool
  claude_handler.py       # Pool de conexões do Claude Agent SDK
  session_manager.py      # Gerenciamento de sessões de chat
tools/
  __init__.py             # MCP server unificado (duraeco_mcp_server)
  rag_tools.py            # Busca vetorial de imagens e relatórios
  sql_tools.py            # Consultas SQL via MCP tool
  vision_tools.py         # Análise de imagens com Claude Vision
  visualization_tools.py  # Gráficos matplotlib e mapas folium
static/                   # Arquivos estáticos (gráficos, mapas)
```

### Frontend (`duraeco-web/src/app/`)
```
pages/
  chat/                   # Interface de chat com WebSocket
  dashboard/              # Dashboard com estatísticas
  reports/                # Listagem de relatórios
  report-detail/          # Detalhes do relatório
  hotspots/               # Hotspots de resíduos
  login/ register/        # Autenticação
core/
  services/
    auth.service.ts           # Autenticação JWT
    reports.service.ts        # CRUD de relatórios
    websocket-chat.service.ts # Cliente WebSocket do chat
  guards/                     # Route guards
  interceptors/               # HTTP interceptors
  models/                     # TypeScript interfaces
```

## Comandos de Desenvolvimento

### Backend

```bash
cd backend-ai

# Ativar virtualenv (OBRIGATÓRIO antes de qualquer comando)
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Rodar servidor de desenvolvimento
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Popular banco de dados (primeira vez)
python populate_db.py

# Health check
curl http://localhost:8000/health
```

### Frontend

```bash
cd duraeco-web

# Instalar dependências
bun install

# Rodar servidor de desenvolvimento
bun start
# ou: ng serve

# Build para produção
ng build

# Executar testes
ng test

# Limpar cache (problemas de cache são comuns)
rm -rf .angular/cache node_modules/.cache dist
```

### Problemas Comuns de Cache

Cache é o problema mais frequente. Se algo não funciona após mudanças:

1. **Frontend**: `pkill -f "ng serve" && rm -rf .angular/cache dist && bun start`
2. **Navegador**: Hard refresh (`Cmd+Shift+R` no Mac, `Ctrl+Shift+R` no Windows/Linux)
3. **Modo Incógnito**: Testar em janela anônima

## Padrões de Código

### Backend (Python)

- **Autenticação**: Todas as rotas protegidas usam `verify_token()` para extrair user_id do JWT
- **Database**: Sempre usar `get_db_connection()` com context manager para conexões MySQL
- **Claude SDK**: Usar `session_manager` para gerenciar sessões de chat, não criar clientes diretamente
- **MCP Tools**: Registrar ferramentas no `tools/__init__.py` via `duraeco_mcp_server`
- **Armazenamento**: Salvar arquivos em `static/charts/` ou `static/maps/`, retornar URL `/static/...`

### Frontend (Angular 21)

- **Angular 21**: Projeto usa standalone components (sem NgModule)
- **Control Flow**: Usar nova sintaxe `@if`, `@for`, `@switch` ao invés de `*ngIf`, `*ngFor`
- **Signals**: Preferir signals do Angular ao invés de RxJS onde possível
- **Services**: Injetar via `inject()` function ao invés de constructor injection
- **TypeScript**: Strict mode habilitado, todos os tipos devem ser explícitos

**Exemplo de component moderno:**
```typescript
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from '../../core/services/reports.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class ReportsComponent {
  private reportsService = inject(ReportsService);
  reports = signal<Report[]>([]);

  ngOnInit() {
    this.reportsService.getReports().subscribe(data => {
      this.reports.set(data);
    });
  }
}
```

**Template com nova sintaxe:**
```html
@if (reports().length > 0) {
  @for (report of reports(); track report.id) {
    <div>{{ report.title }}</div>
  }
} @else {
  <p>Nenhum relatório encontrado</p>
}
```

## Autenticação JWT

### Fluxo
1. Frontend: Login → recebe `access_token`
2. Frontend: Armazena token em `localStorage`
3. Frontend: Envia token em todas as requisições via `Authorization: Bearer <token>`
4. Backend: Valida token via `verify_token()` → extrai `user_id`

### WebSocket
- Token enviado como query param: `ws://localhost:8000/api/chat/ws?token=<jwt>`
- Backend valida token antes de aceitar conexão

## Sistema de Chat (Claude Agent SDK)

### Arquitetura
- **WebSocket**: Comunicação bidirecional em tempo real
- **MCP Server**: `duraeco_mcp_server` expõe ferramentas SQL, RAG, Vision
- **Session Manager**: Gerencia histórico de conversas e pool de conexões Claude SDK
- **Streaming**: Respostas do Claude são enviadas em tempo real (SSE-style)

### Formato de Mensagens WebSocket

**Cliente → Servidor:**
```json
{
  "type": "chat_message",
  "content": "Analise esta imagem de resíduo",
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

## Banco de Dados MySQL

### Conexão
- **Host**: Configurado via `.env` (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)
- **Pool**: DBUtils gerencia pool de conexões
- **Schema**: `db_duraeco` (nome configurável)

### Tabelas Principais
- `users`: Usuários do sistema
- `reports`: Relatórios de resíduos enviados por usuários
- `hotspots`: Locais com alta concentração de resíduos (gerados por IA)
- `chat_sessions`: Sessões de chat persistidas
- `chat_messages`: Histórico de mensagens

### MCP MySQL Server
Há um MCP server MySQL configurado que expõe ferramentas para consultar o banco:
- `list_tables`
- `describe_table`
- `execute_query`
- `table_stats`

## Testes

### Backend
```bash
cd backend-ai
source venv/bin/activate
pytest  # (se houver testes configurados)
```

### Frontend
```bash
cd duraeco-web
ng test  # Vitest
```

## Débito Técnico

Consultar `DEBITO-TECNICO.md` para lista de funcionalidades incompletas.

**Principal**: Falta endpoint para alterar status de relatórios e hotspots (campo existe no banco, mas não há API para modificá-lo).

## URLs do Sistema

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| Chat | http://localhost:4200/chat |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |
| WebSocket Chat | ws://localhost:8000/api/chat/ws |

## Configuração de Ambiente

### Backend `.env`
Arquivo `backend-ai/.env` deve conter:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=seu_password
DB_NAME=db_duraeco
JWT_SECRET=seu_secret_key
ANTHROPIC_API_KEY=sk-ant-...  # Para Claude Agent SDK
```

### Frontend (environment.ts)
Arquivo `duraeco-web/src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  wsUrl: 'ws://localhost:8000'
};
```

## Migração AWS → Local Storage

O sistema foi migrado de AWS (S3, Bedrock) para soluções locais:
- **S3 → Local Storage**: Gráficos e mapas salvos em `backend-ai/static/`
- **AWS Bedrock → Claude Agent SDK**: Chat usa Claude Agent SDK com MCP tools
- **Limpeza**: Arquivos antigos são removidos automaticamente após 24h

## Idioma

- **Código**: Variáveis, funções, comentários em inglês
- **UI**: Interface em português (pt-BR)
- **Commits**: Mensagens em inglês
- **Documentação**: Português brasileiro

## Dependências Críticas

### Backend
- `fastapi` + `uvicorn`: Framework web
- `claude-agent-sdk`: Chat com Claude
- `mysql-connector-python` + `DBUtils`: Banco de dados
- `PyJWT`: Autenticação
- `Pillow` + `numpy`: Processamento de imagens

### Frontend
- Angular 21 (standalone components)
- Tailwind CSS 4.x
- RxJS para WebSocket e HTTP
