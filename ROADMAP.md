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
- [ ] Token JWT não tem refresh automático

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
