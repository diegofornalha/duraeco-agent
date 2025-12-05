# Guia de Autenticação JWT para MCP DuraEco Backend

Este guia explica como usar autenticação JWT com o servidor MCP `duraeco-backend`.

## Por que usar autenticação?

O MCP `duraeco-backend` expõe todos os endpoints da API FastAPI como ferramentas MCP. **TODOS os endpoints** agora usam autenticação JWT consistentemente, incluindo:

- `chat_with_agentcore` - Chat com agente de IA (requer JWT)
- `list_chat_sessions` - Listar sessões de chat (requer JWT)
- `list_session_messages` - Mensagens de uma sessão (requer JWT)
- `update_chat_session_title` - Atualizar título de sessão (requer JWT)
- `delete_chat_session_endpoint` - Deletar sessão (requer JWT)
- `update_user` - Atualizar perfil do usuário (requer JWT)
- `change_password` - Alterar senha (requer JWT)
- `submit_report` - Enviar relatórios (requer JWT)

## Como funciona?

O MCP server (`mcp_server.py`) possui um **transport customizado** que injeta automaticamente o header `Authorization: Bearer <token>` em todas as requisições HTTP para a API.

O token é lido da variável de ambiente `MCP_AUTH_TOKEN` configurada no `~/.claude.json`.

## Passo a Passo

### 1. Fazer login e obter token JWT

Use a ferramenta MCP para fazer login:

```
mcp__duraeco-backend__login_api_auth_login_post
  username: admin
  password: Senha@123456
```

Você receberá uma resposta como:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "username": "admin",
    "email": "admin@gmail.com"
  }
}
```

### 2. Atualizar token no ~/.claude.json

Execute o script Python para atualizar o token:

```bash
python3 << 'EOF'
import json

with open('/Users/2a/.claude.json', 'r') as f:
    config = json.load(f)

# Copie o token do passo 1
new_token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

# Atualizar token no projeto duraeco
config['projects']['/Users/2a/Desktop/duraeco']['mcpServers']['duraeco-backend']['env']['MCP_AUTH_TOKEN'] = new_token

with open('/Users/2a/.claude.json', 'w') as f:
    json.dump(config, f, indent=2)

print('✅ Token atualizado!')
EOF
```

**Importante:** Adicione `Bearer ` antes do token se não estiver presente.

### 3. Reiniciar Claude Code

Para aplicar as mudanças:

```bash
# Sair do Claude Code
Ctrl+C ou /exit

# Entrar novamente
claude
```

### 4. Testar autenticação

Teste os endpoints de chat protegidos por JWT:

```
# Listar sessões de chat (user_id extraído automaticamente do JWT)
mcp__duraeco-backend__list_chat_sessions_api_chat_sessions_get

# Chat com IA (user_id extraído automaticamente do JWT)
mcp__duraeco-backend__chat_with_agentcore_api_chat_post
  messages: [{"role": "user", "content": "Quantos relatórios existem?"}]
```

Se funcionar sem retornar `401 Unauthorized`, a autenticação está configurada corretamente!

**Nota:** Desde a atualização de 2025-12-05, todos os endpoints de chat usam JWT (não mais X-API-Key). O `user_id` é extraído automaticamente do token, não precisa ser fornecido manualmente.

## Estrutura do ~/.claude.json

A configuração do MCP no `~/.claude.json` deve ter esta estrutura:

```json
{
  "projects": {
    "/Users/2a/Desktop/duraeco": {
      "mcpServers": {
        "duraeco-backend": {
          "type": "stdio",
          "command": "python3",
          "args": ["/Users/2a/Desktop/duraeco/backend-ai/mcp_server.py"],
          "env": {
            "MCP_AUTH_TOKEN": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          }
        }
      }
    }
  }
}
```

## Expiração do Token

**O token JWT expira em 24 horas** (configurado em `JWT_EXPIRATION_HOURS=24`).

Quando o token expirar, você receberá erro `401 Unauthorized`. Para renovar:

1. Faça login novamente (passo 1)
2. Atualize o token no `~/.claude.json` (passo 2)
3. Reinicie o Claude Code (passo 3)

## Verificar se o token está válido

Para verificar se o token está funcionando:

```bash
# Obter o token do ~/.claude.json
TOKEN=$(python3 -c "import json; print(json.load(open('/Users/2a/.claude.json'))['projects']['/Users/2a/Desktop/duraeco']['mcpServers']['duraeco-backend']['env']['MCP_AUTH_TOKEN'])")

# Testar no endpoint da API
curl -H "Authorization: $TOKEN" http://localhost:8000/api/chat/sessions?user_id=1
```

Se retornar dados JSON (e não 401), o token está válido.

## Decodificar o token JWT

Para ver o conteúdo do token:

```bash
# Copie a parte entre os dois pontos (payload)
echo "eyJ1c2VyX2lkIjoxLCJleHAiOjE3NjQ5OTQ0MDh9" | base64 -d | python3 -m json.tool
```

Exemplo de payload:
```json
{
  "user_id": 1,
  "exp": 1764994408  // Timestamp Unix de expiração
}
```

## Credenciais padrão

**Usuário admin:**
- Username: `admin`
- Password: `Senha@123456`
- User ID: 1

## Troubleshooting

### Erro: "No such tool available"

O MCP `duraeco-backend` não está carregado. Verifique:

1. O backend FastAPI está rodando? `curl http://localhost:8000/health`
2. O MCP está configurado no `~/.claude.json`?
3. Use `/mcp` no Claude Code para ver status

### Erro: 401 Unauthorized

1. Token expirado - faça login novamente
2. Token não configurado - adicione `MCP_AUTH_TOKEN` no `~/.claude.json`
3. Claude Code não reiniciado - saia e entre novamente

### Token não atualiza após reinício

Certifique-se de que:
1. O arquivo `~/.claude.json` foi salvo corretamente
2. O token tem o prefixo `Bearer `
3. Você saiu completamente do Claude Code (não apenas mudou de diretório)

## Segurança

- **Nunca** compartilhe seu token JWT
- **Nunca** commite o `~/.claude.json` no Git
- Tokens expiram em 24h por segurança
- Use senhas fortes para contas de produção

## Como funciona internamente?

O `mcp_server.py` usa uma classe `AuthenticatedTransport` customizada:

```python
class AuthenticatedTransport(httpx.ASGITransport):
    def __init__(self, app, auth_token: str | None = None, **kwargs):
        super().__init__(app=app, raise_app_exceptions=False, **kwargs)
        self.auth_token = auth_token

    async def handle_async_request(self, request: httpx.Request):
        # Injeta header Authorization automaticamente
        if self.auth_token:
            request.headers['authorization'] = self.auth_token
        return await super().handle_async_request(request)
```

Isso garante que todas as chamadas MCP para a API incluam o token JWT automaticamente.

## Referências

- **Backend:** `/Users/2a/Desktop/duraeco/backend-ai/app.py`
- **MCP Server:** `/Users/2a/Desktop/duraeco/backend-ai/mcp_server.py`
- **Configuração JWT:** `JWT_SECRET` e `JWT_EXPIRATION_HOURS` no `.env`
- **Endpoints protegidos:** Qualquer endpoint que use `Depends(get_user_from_token)`
