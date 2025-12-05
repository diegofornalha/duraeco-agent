# Débito Técnico - DuraEco

Este documento lista os débitos técnicos identificados no projeto que devem ser abordados futuramente.

---

## DT-001: Falta endpoint para alterar status de Relatórios e Hotspots

**Data identificada:** 2025-12-05
**Prioridade:** Média-Alta
**Componentes afetados:** Backend API, Frontend (Reports, Hotspots)

### Descrição

O sistema possui o campo `status` nos modelos de dados e a interface exibe badges coloridos para cada status, porém **não existe forma de alterar o status** manualmente.

### Situação Atual

| Camada | Status |
|--------|--------|
| Modelo de dados | ✅ Campo `status` existe |
| Interface (badges) | ✅ Exibe corretamente |
| Interface (filtros) | ✅ Filtros funcionam |
| Endpoint de alteração | ❌ **Não implementado** |
| Botões de ação | ❌ **Não implementado** |

### Status disponíveis

**Relatórios (`reports.status`):**
- `submitted` - Submetido
- `analyzing` - Analisando
- `analyzed` - Analisado
- `resolved` - Resolvido
- `rejected` - Rejeitado

**Hotspots (`hotspots.status`):**
- `active` - Ativo
- `monitoring` - Em monitoramento
- `resolved` - Resolvido

### Solução Proposta

1. **Backend:**
   - Criar `PATCH /api/reports/{id}/status` com body `{ "status": "resolved" }`
   - Criar `PATCH /api/hotspots/{id}/status` com body `{ "status": "resolved" }`
   - Validar transições de status permitidas
   - Registrar histórico de mudanças (opcional)

2. **Frontend:**
   - Adicionar dropdown ou botões de ação na página de detalhes do relatório
   - Adicionar ações na página de hotspots
   - Atualizar lista após mudança de status

### Impacto

Sem essa funcionalidade, o fluxo de trabalho fica incompleto:
```
Reportar → Analisar (IA) → ??? (não consegue marcar como resolvido)
```

### Arquivos relacionados

- `backend-ai/app.py` - Adicionar endpoints
- `duraeco-web/src/app/pages/report-detail/report-detail.ts` - Adicionar ações
- `duraeco-web/src/app/pages/hotspots/hotspots.ts` - Adicionar ações
- `duraeco-web/src/app/core/services/reports.service.ts` - Adicionar métodos

---

## Como adicionar novos débitos

Use o template abaixo:

```markdown
## DT-XXX: Título do débito

**Data identificada:** YYYY-MM-DD
**Prioridade:** Alta/Média-Alta/Média/Baixa
**Componentes afetados:** [lista]

### Descrição
[Descreva o problema]

### Situação Atual
[O que existe e o que falta]

### Solução Proposta
[Como resolver]

### Impacto
[Por que isso importa]

### Arquivos relacionados
[Lista de arquivos]
```
