# DuraEco - Guia Rápido de Inicialização

## Problema Comum: Cache

Se o sistema não funciona após mudanças no código, provavelmente é **cache**. Siga os passos abaixo.

---

## 1. Limpar Cache do Frontend (Angular)

```bash
cd /Users/2a/Desktop/duraeco/duraeco-web

# Matar processos Angular duplicados
pkill -f "ng serve"

# Limpar cache
rm -rf .angular/cache
rm -rf node_modules/.cache
rm -rf dist

# Reiniciar
bun start
```

---

## 2. Limpar Cache do Navegador

### Opção A: Hard Refresh
- **Mac:** `Cmd + Shift + R`
- **Windows/Linux:** `Ctrl + Shift + R`

### Opção B: DevTools (mais completo)
1. Abrir DevTools: `F12` ou `Cmd + Option + I`
2. Ir em **Application** (Chrome) ou **Storage** (Firefox)
3. Clicar em **Clear site data**
4. Recarregar a página

### Opção C: Modo Incógnito
Testar em janela anônima para garantir que não há cache.

---

## 3. Iniciar o Backend

```bash
cd /Users/2a/Desktop/duraeco/backend-ai

# IMPORTANTE: Ativar o virtualenv!
source venv/bin/activate

# Verificar se ativou (deve aparecer "(venv)" no prompt)
# (venv) 2a@agents backend-ai %

# Iniciar servidor
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Logs esperados:
```
INFO: Using Claude Opus 4.5 for vision + local storage (no AWS required)
INFO: Uvicorn running on http://0.0.0.0:8000
```

---

## 4. Iniciar o Frontend

```bash
cd /Users/2a/Desktop/duraeco/duraeco-web

# Iniciar servidor de desenvolvimento
bun start
# ou: ng serve
```

### Logs esperados:
```
Application bundle generation complete.
➜  Local:   http://localhost:4200/
```

---

## 5. Testar o Chat

1. Acessar: http://localhost:4200/chat
2. Abrir Console do navegador (F12)
3. Verificar se aparece:
   ```
   [WebSocketChat] Connecting to: ws://localhost:8000/api/chat/ws?token=...
   [WebSocketChat] Connected
   ```
4. Enviar uma mensagem e ver a resposta

---

## 6. Problemas Comuns

### "ModuleNotFoundError: No module named 'claude_agent_sdk'"
**Causa:** Virtualenv não ativado
**Solução:** `source venv/bin/activate`

### "POST /api/chat 410 Gone"
**Causa:** Cache do navegador com código antigo
**Solução:** Limpar cache (seção 2)

### "Unknown database 'tl_waste_monitoring'"
**Causa:** Arquivo `.env` não carregado
**Solução:** Verificar se `core/database.py` tem `load_dotenv()` no início

### WebSocket não conecta
**Causa:** Backend não está rodando ou porta ocupada
**Solução:**
```bash
# Verificar se porta 8000 está em uso
lsof -i :8000

# Matar processo se necessário
kill -9 <PID>
```

### Múltiplos processos Angular
**Causa:** `ng serve` iniciado várias vezes
**Solução:**
```bash
pkill -f "ng serve"
bun start
```

---

## 7. Script de Inicialização Completa

Crie um arquivo `start.sh` na raiz do projeto:

```bash
#!/bin/bash

echo "🧹 Limpando cache..."
pkill -f "ng serve" 2>/dev/null
rm -rf duraeco-web/.angular/cache
rm -rf duraeco-web/node_modules/.cache

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

echo ""
echo "✅ Servidores iniciados!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:4200"
echo ""
echo "   Para parar: kill $BACKEND_PID $FRONTEND_PID"
```

Tornar executável:
```bash
chmod +x start.sh
./start.sh
```

---

## 8. URLs Importantes

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| Chat | http://localhost:4200/chat |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |
| WebSocket Chat | ws://localhost:8000/api/chat/ws |

---

## 9. Verificação Rápida

```bash
# Backend está rodando?
curl http://localhost:8000/health

# Resposta esperada:
# {"status":"healthy","service":"duraeco API","version":"1.0.0"}
```

---

## Resumo

1. **Sempre ativar venv** antes de rodar o backend
2. **Limpar cache** quando houver problemas estranhos
3. **Hard refresh** no navegador após mudanças
4. **Verificar console** do navegador para erros de WebSocket
