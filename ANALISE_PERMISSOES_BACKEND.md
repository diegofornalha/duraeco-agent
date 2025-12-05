# 🔒 Análise de Permissões - DuraEco Backend

**Data**: 05/12/2025
**Versão do Backend**: 1.0.0

---

## 📊 Resumo Executivo

### ✅ O que ESTÁ implementado:
- ✅ **CRUD completo** de todas as entidades (Users, Reports, Hotspots, etc)
- ✅ **Autenticação JWT** em todos os endpoints protegidos
- ✅ **Tabela `admin_users`** existe no banco de dados
- ✅ **Roles** definidos: `super_admin`, `admin`, `moderator`

### ❌ O que NÃO está implementado:
- ❌ **Diferenciação de permissões** entre usuário comum e admin
- ❌ **Endpoints exclusivos para admin** não existem
- ❌ **Verificação de roles** não é feita em nenhum endpoint
- ❌ **MCP não limita acesso** por tipo de usuário

---

## 🏗️ Arquitetura Atual

### Sistema de Autenticação

```python
# Linha 260 - app.py
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Linha 503-508 - app.py
async def get_user_from_token(token: str = Depends(oauth2_scheme)):
    """Extract user ID from token in request"""
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id
```

**Como funciona:**
1. Token JWT é gerado no login
2. Token contém apenas `user_id` (não contém role/tipo)
3. Todos os endpoints verificam APENAS se o token é válido
4. **NÃO verifica** se o usuário é admin ou comum

---

## 📋 Tabelas do Banco de Dados

### 1. Tabela `users` (Usuários Comuns)
```sql
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `account_status` enum('active','inactive','suspended'),
  `verification_status` tinyint(1) DEFAULT '0',
  ...
);
```
- ❌ **Não tem campo `role`**
- ✅ Todos os usuários do sistema

### 2. Tabela `admin_users` (Administradores)
```sql
CREATE TABLE `admin_users` (
  `admin_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('super_admin','admin','moderator') DEFAULT 'admin',
  `active` tinyint(1) DEFAULT '1',
  ...
);
```
- ✅ **Tem campo `role`** com 3 níveis
- ❌ **NÃO é usada** no código atual

---

## 🔍 Análise de Endpoints

### Endpoints Públicos (sem autenticação)
```
✅ POST /health
✅ POST /api/auth/register
✅ POST /api/auth/login
✅ POST /api/auth/verify-registration
✅ POST /api/auth/send-otp
✅ POST /api/auth/verify-otp
✅ GET  /api/auth/check-existing
```
**Acessível por**: Qualquer pessoa

---

### Endpoints Protegidos (requer JWT válido)
```
🔓 POST   /api/auth/change-password
🔓 GET    /api/users/{user_id}
🔓 PATCH  /api/users/{user_id}
🔓 POST   /api/reports
🔓 GET    /api/reports
🔓 GET    /api/reports/{report_id}
🔓 DELETE /api/reports/{report_id}
🔓 GET    /api/reports/nearby
🔓 GET    /api/hotspots
🔓 GET    /api/hotspots/{hotspot_id}/reports
🔓 GET    /api/waste-types
🔓 GET    /api/dashboard/statistics
🔓 POST   /api/process-queue
🔓 GET    /api/test-nova
🔓 POST   /api/chat
```

**Acessível por**: Qualquer usuário autenticado (comum OU admin)

**Problema identificado:**
- ❌ NÃO há diferença entre user e admin
- ❌ Qualquer usuário logado pode:
  - Ver estatísticas globais do sistema
  - Processar fila de imagens
  - Ver todos os relatórios
  - Deletar qualquer relatório (!)
  - Atualizar qualquer usuário (!)

---

### Endpoints FALTANDO (Admin Only)

**Endpoints que DEVERIAM existir apenas para admin:**

```
❌ GET    /api/admin/users          - Listar todos usuários
❌ PATCH  /api/admin/users/{id}     - Atualizar qualquer usuário
❌ DELETE /api/admin/users/{id}     - Deletar usuário
❌ POST   /api/admin/users/{id}/suspend - Suspender usuário

❌ GET    /api/admin/reports        - Ver TODOS relatórios
❌ PATCH  /api/admin/reports/{id}   - Atualizar status de relatório
❌ DELETE /api/admin/reports/{id}   - Deletar qualquer relatório

❌ GET    /api/admin/hotspots       - Gerenciar hotspots
❌ POST   /api/admin/hotspots       - Criar hotspot manualmente
❌ PATCH  /api/admin/hotspots/{id}  - Atualizar hotspot
❌ DELETE /api/admin/hotspots/{id}  - Deletar hotspot

❌ GET    /api/admin/statistics     - Estatísticas detalhadas
❌ GET    /api/admin/logs           - Logs do sistema
❌ POST   /api/admin/settings       - Configurações do sistema

❌ POST   /api/admin/login          - Login específico de admin
❌ GET    /api/admin/admins         - Listar admins
❌ POST   /api/admin/admins         - Criar novo admin
```

---

## 🚨 Problemas de Segurança Identificados

### 1. Qualquer usuário pode deletar qualquer relatório
```python
# Linha 2462 - app.py
@app.delete("/api/reports/{report_id}")
async def delete_report(report_id: int, user_id: int = Depends(get_user_from_token)):
    # ❌ NÃO verifica se o relatório pertence ao user_id
    # ❌ NÃO verifica se é admin
    # ✅ Apenas verifica se está autenticado
```

**Risco:** Usuário malicioso pode deletar relatórios de outros usuários

---

### 2. Qualquer usuário pode atualizar qualquer usuário
```python
# Linha 2198 - app.py
@app.patch("/api/users/{user_id}")
async def update_user(
    user_id: int,
    update_data: UpdateUserProfile,
    current_user_id: int = Depends(get_user_from_token)
):
    # ❌ NÃO verifica se user_id == current_user_id
    # ❌ Permite atualizar dados de outros usuários
```

**Risco:** Usuário pode modificar perfil de outros usuários

---

### 3. Dashboard Statistics expõe dados sensíveis
```python
# Linha 2948 - app.py
@app.get("/api/dashboard/statistics")
async def get_dashboard_statistics(user_id: int = Depends(get_user_from_token)):
    # ❌ Qualquer usuário autenticado pode ver:
    #     - Total de usuários no sistema
    #     - Total de relatórios
    #     - Dados agregados de TODOS os usuários
```

**Risco:** Vazamento de informações sobre o sistema

---

## 💡 O que deveria ser implementado

### Solução Completa de Permissões

#### 1. Criar sistema de roles no JWT
```python
def create_token(user_id: int, is_admin: bool = False, role: str = None):
    payload = {
        "user_id": user_id,
        "is_admin": is_admin,  # Novo campo
        "role": role,           # Novo campo
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")
```

#### 2. Criar dependency para verificar admin
```python
async def get_admin_from_token(token: str = Depends(oauth2_scheme)):
    """Verifica se o usuário é admin"""
    payload = verify_token_with_role(token)
    if not payload or not payload.get("is_admin"):
        raise HTTPException(403, "Admin access required")
    return payload["user_id"]

async def get_user_with_permission(
    token: str = Depends(oauth2_scheme),
    required_role: str = None
):
    """Verifica role específica"""
    payload = verify_token_with_role(token)
    if required_role and payload.get("role") != required_role:
        raise HTTPException(403, f"Role {required_role} required")
    return payload
```

#### 3. Proteger endpoints sensíveis
```python
# Apenas o próprio usuário ou admin pode atualizar
@app.patch("/api/users/{user_id}")
async def update_user(
    user_id: int,
    update_data: UpdateUserProfile,
    current_user: dict = Depends(get_user_with_permission)
):
    # Verifica se é o próprio usuário OU admin
    if current_user["user_id"] != user_id and not current_user.get("is_admin"):
        raise HTTPException(403, "Cannot update other users")
    # ... continua

# Apenas admin pode ver estatísticas
@app.get("/api/dashboard/statistics")
async def get_dashboard_statistics(
    admin_id: int = Depends(get_admin_from_token)
):
    # Apenas admin acessa
```

#### 4. Criar endpoints admin separados
```python
@app.get("/api/admin/users")
async def list_all_users(admin_id: int = Depends(get_admin_from_token)):
    """Lista TODOS os usuários (apenas admin)"""
    pass

@app.post("/api/admin/login")
async def admin_login(credentials: AdminLogin):
    """Login específico para tabela admin_users"""
    # Verifica na tabela admin_users em vez de users
    pass
```

---

## 🎯 Conclusão

### Status Atual do Backend:

| Aspecto | Status | Nota |
|---------|--------|------|
| **CRUD Completo** | ✅ Sim | Todas as entidades têm Create, Read, Update, Delete |
| **Autenticação** | ✅ Sim | JWT implementado e funcional |
| **Tabela Admin** | ✅ Existe | `admin_users` com roles definidos |
| **Separação de Permissões** | ❌ Não | Todos os usuários têm mesmo acesso |
| **Endpoints Admin** | ❌ Não | Não existem endpoints exclusivos |
| **Proteção de Dados** | ⚠️ Parcial | Falta validação de ownership |

### Sobre o MCP:

**Pergunta:** "O MCP consegue limitar quem não é admin?"

**Resposta:** ❌ **NÃO**

**Motivo:**
1. O MCP apenas expõe os endpoints existentes
2. Como os endpoints NÃO verificam roles, o MCP também não consegue
3. O MCP não tem lógica própria de permissões
4. A segurança DEVE ser implementada no backend FastAPI

**Para o MCP funcionar com permissões:**
1. Implementar verificação de roles no backend (conforme solução acima)
2. O MCP automaticamente herdará essas restrições
3. Quando um usuário comum tentar acessar endpoint admin via MCP:
   ```
   Error: 403 Forbidden - Admin access required
   ```

---

## 📝 Recomendações

### Prioridade ALTA (Segurança):
1. ✅ Implementar verificação de ownership nos endpoints de Update/Delete
2. ✅ Restringir estatísticas globais apenas para admin
3. ✅ Adicionar campo `is_admin` no JWT

### Prioridade MÉDIA (Funcionalidade):
4. ✅ Criar endpoints `/api/admin/*` separados
5. ✅ Implementar login de admin na tabela `admin_users`
6. ✅ Criar sistema de roles (super_admin, admin, moderator)

### Prioridade BAIXA (Melhorias):
7. ✅ Criar painel admin no frontend
8. ✅ Logs de auditoria para ações admin
9. ✅ Sistema de permissões granulares por recurso

---

*Análise gerada em: 05/12/2025*
*Por: Claude Code*
