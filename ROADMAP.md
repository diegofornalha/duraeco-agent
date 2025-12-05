# DuraEco - Roadmap

## Melhorias Planejadas

### 🔐 Autenticação e Segurança

#### Unificar autenticação dos endpoints de chat
**Prioridade:** Média
**Status:** ✅ **CONCLUÍDO** (2025-12-05)

**Problema resolvido:**
- ~~Endpoints de chat usavam `X-API-Key`~~
- ~~Outros endpoints usavam JWT Bearer token~~
- ~~Inconsistência na API dificultava uso via MCP~~

**Solução implementada:**
- **5 endpoints** modificados em `backend-ai/app.py`:
  - `POST /api/chat` (linha 3725)
  - `GET /api/chat/sessions` (linha 4158)
  - `GET /api/chat/sessions/{session_id}/messages` (linha 4177)
  - `PATCH /api/chat/sessions/{session_id}` (linha 4202)
  - `DELETE /api/chat/sessions/{session_id}` (linha 4221)

- **Frontend** atualizado em `duraeco-web/`:
  - `chat.service.ts` - Removido parâmetro apiKey
  - `pages/chat/chat.ts` - Removida UI de API Key e validações

- **Documentação** atualizada:
  - `CLAUDE.md` - Endpoints de chat agora documentados com JWT
  - `GUIA_AUTENTICACAO_MCP.md` - Removidas referências a X-API-Key

**Benefícios alcançados:**
- ✅ API consistente em todos endpoints
- ✅ MCP funciona 100% com um único token JWT
- ✅ Melhor segurança (JWT tem expiração de 24h)
- ✅ Removida necessidade de `API_SECRET_KEY`
- ✅ Código mais limpo (~20 linhas removidas)

#### Sistema de Refresh Token
**Prioridade:** Alta
**Status:** ✅ **CONCLUÍDO** (2025-12-05)

**Problema resolvido:**
- ~~Access tokens com 24h de duração (janela de ataque longa se vazados)~~
- ~~Sem renovação automática de tokens~~
- ~~Usuários precisavam fazer login novamente a cada 24h~~

**Solução implementada:**
- **Database:**
  - Tabela `refresh_tokens` criada com suporte a revogação
  - Background job de limpeza diária (3 AM)

- **Backend** (`backend-ai/app.py`):
  - Access tokens: 6 horas (redução de 24h → 6h)
  - Refresh tokens: 7 dias (UUID v4)
  - Funções: `generate_access_token()`, `generate_refresh_token()`, `verify_refresh_token()`
  - Endpoints: `POST /api/auth/refresh`, `POST /api/auth/logout`
  - Login e Register retornam `refresh_token`
  - Rate limiting: 60/hour no refresh endpoint
  - Scheduler (apscheduler) para limpeza automática

- **Frontend** (`duraeco-web/`):
  - AuthService: Auto-refresh 5 minutos antes de expirar
  - localStorage gerencia `refresh_token`
  - authInterceptor: Retry automático em 401
  - logout() revoga tokens no backend

**Benefícios alcançados:**
- ✅ Segurança melhorada (access token de 6h vs 24h)
- ✅ UX melhorada (renovação automática transparente)
- ✅ Logout efetivo (revogação de tokens no banco)
- ✅ Migração suave (backward-compatible)
- ✅ Limpeza automática de tokens expirados

#### Débitos Técnicos de Qualidade de Código
**Prioridade:** Baixa
**Status:** ✅ **CONCLUÍDO** (2025-12-05)

**Problemas resolvidos:**

1. **Type Safety no Frontend**
   - ~~9 usos de `any` no TypeScript reduziam type safety~~
   - ~~IntelliSense prejudicado~~

2. **Campo user_id Redundante**
   - ~~`ChatRequest.user_id` enviável mas nunca usado~~
   - ~~Validação desnecessária no backend~~

3. **Dependências Desatualizadas**
   - ~~18 de 19 pacotes sem versionamento fixado~~
   - ~~Builds não-reproduzíveis~~
   - ~~Riscos de segurança (PyJWT, bcrypt, Pillow sem versões)~~

**Solução implementada:**
- **Frontend** (`duraeco-web/src/app/`):
  - Criado `core/models/api-responses.ts` com interfaces tipadas
  - `DeviceInfo`, `GetReportsResponse`, `CreateReportResponse`, `UpdateUserResponse`
  - Atualizados `reports.service.ts` e `auth.service.ts` (9 mudanças)
  - Build sem erros TypeScript, IntelliSense melhorado

- **Backend** (`backend-ai/`):
  - Removido campo `user_id` do modelo `ChatRequest`
  - Removida validação desnecessária no endpoint `/api/chat`
  - `requirements.txt` com todas versões fixadas:
    - Segurança: `PyJWT==2.10.1`, `bcrypt==4.2.1`, `Pillow==11.0.0`, `requests==2.32.3`
    - Framework: `fastapi==0.123.9`, `pydantic==2.12.5`, `uvicorn==0.38.0`
    - AWS/AI: `bedrock-agentcore==1.1.1`, `boto3==1.42.3`
  - Builds 100% reproduzíveis

**Benefícios alcançados:**
- ✅ Type checking robusto no frontend
- ✅ Código backend mais limpo (sem campos redundantes)
- ✅ Segurança melhorada (dependências críticas atualizadas)
- ✅ Reprodutibilidade garantida (pip install exato)
- ✅ Proteção contra CVEs em Pillow e outras libs

---

### 🎯 Backend

#### Implementar análise de imagens em batch
**Prioridade:** Alta
**Status:** Proposto

**Descrição:**
- Processar múltiplas imagens de uma vez via `/api/process-queue`
- Adicionar progresso em tempo real (WebSocket ou SSE)
- Melhorar performance com processamento paralelo

#### Adicionar cache para estatísticas do dashboard
**Prioridade:** Média
**Status:** Proposto

**Descrição:**
- Cache Redis para `/api/dashboard/statistics`
- Invalidação automática quando novos relatórios são criados
- Reduzir carga no banco de dados

#### Melhorar detecção de hotspots
**Prioridade:** Média
**Status:** Proposto

**Descrição:**
- Algoritmo de clustering mais sofisticado (DBSCAN)
- Considerar densidade temporal (hotspots sazonais)
- Alertas automáticos para novos hotspots críticos

---

### 🌐 Frontend

#### Implementar mapa interativo
**Prioridade:** Alta
**Status:** Proposto

**Descrição:**
- Adicionar Leaflet ou Mapbox
- Visualizar relatórios e hotspots no mapa
- Filtros por tipo de resíduo e severidade

#### Dashboard em tempo real
**Prioridade:** Média
**Status:** Proposto

**Descrição:**
- WebSocket para atualização em tempo real
- Notificações de novos relatórios
- Gráficos animados

#### PWA (Progressive Web App)
**Prioridade:** Baixa
**Status:** Proposto

**Descrição:**
- Service Worker para funcionar offline
- Instalável como app nativo
- Push notifications

---

### 🤖 IA e Machine Learning

#### Treinar modelo customizado
**Prioridade:** Média
**Status:** Proposto

**Descrição:**
- Fine-tuning do modelo com dados locais
- Melhorar precisão para tipos específicos de resíduo do Brasil
- Reduzir custo (usar modelo menor local)

#### Análise de tendências preditiva
**Prioridade:** Baixa
**Status:** Proposto

**Descrição:**
- Prever áreas que se tornarão hotspots
- Recomendações proativas de coleta
- Análise de padrões sazonais

---

### 📊 Dados e Analytics

#### Exportar dados
**Prioridade:** Média
**Status:** Proposto

**Descrição:**
- Exportar relatórios para CSV/Excel
- API para integração com sistemas externos
- Relatórios PDF automáticos

#### Dashboard administrativo
**Prioridade:** Alta
**Status:** Proposto

**Descrição:**
- Painel para gestores públicos
- KPIs e métricas de desempenho
- Comparação entre regiões

---

### 🔧 DevOps e Infraestrutura

#### CI/CD Pipeline
**Prioridade:** Alta
**Status:** Proposto

**Descrição:**
- GitHub Actions para testes automáticos
- Deploy automático em produção
- Rollback automático em caso de falha

#### Monitoring e Logging
**Prioridade:** Alta
**Status:** Proposto

**Descrição:**
- Sentry para error tracking
- CloudWatch ou Prometheus para métricas
- Logs estruturados (JSON)

#### Documentação da API
**Prioridade:** Média
**Status:** Proposto

**Descrição:**
- Swagger/OpenAPI completo
- Exemplos de uso para cada endpoint
- Postman Collection

---

## Bugs Conhecidos

### Backend
- [ ] Relatórios sem imagem ficam com status `submitted` indefinidamente
- [ ] Hotspots não são atualizados quando relatórios são deletados

### Frontend
- [ ] Página de profile não mostra imagem do usuário
- [ ] Chat não mantém histórico ao recarregar página

---

## Versões Futuras

### v1.1.0 (Q1 2026)
- [x] Unificar autenticação (JWT em todos endpoints) ✅ **CONCLUÍDO 2025-12-05**
- [ ] Mapa interativo no frontend
- [ ] Dashboard administrativo básico
- [ ] CI/CD pipeline

### v1.2.0 (Q2 2026)
- [ ] PWA para web
- [ ] Cache Redis
- [ ] Análise em batch

### v2.0.0 (Q3 2026)
- [ ] Modelo de IA customizado
- [ ] Análise preditiva
- [ ] WebSocket para tempo real
- [ ] Multi-tenant (múltiplas cidades)

---

## Como Contribuir

Para propor uma nova feature ou melhoria:

1. Crie uma issue no GitHub descrevendo a proposta
2. Adicione label apropriada (`enhancement`, `bug`, `security`)
3. Discuta com a equipe antes de implementar
4. Faça PR referenciando a issue

---

## Priorização

**Alta:** Impacto direto na experiência do usuário ou segurança
**Média:** Melhoria significativa mas não crítica
**Baixa:** Nice to have, pode esperar

---

Última atualização: 2025-12-05
