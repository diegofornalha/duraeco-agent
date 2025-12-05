# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Type Safety no Frontend** (2025-12-05)
  - Removidos 9 usos de `any` no TypeScript
  - Criado arquivo `api-responses.ts` com interfaces tipadas
  - `DeviceInfo`, `GetReportsResponse`, `CreateReportResponse`, `UpdateUserResponse`
  - Melhorado IntelliSense e type checking no VS Code

- **Campo user_id Redundante** (2025-12-05)
  - Removido campo `user_id` não utilizado do modelo `ChatRequest`
  - Backend sempre usa `user_id` extraído do JWT via `Depends(get_user_from_token)`
  - Código mais limpo e sem validações desnecessárias

### Changed
- **Dependências do Backend Fixadas** (2025-12-05)
  - Todas dependências agora têm versões específicas em `requirements.txt`
  - Atualizações de segurança críticas:
    - `PyJWT==2.10.1` (autenticação segura)
    - `bcrypt==4.2.1` (hash de senhas)
    - `Pillow==11.0.0` (processamento de imagens, CVEs corrigidos)
    - `requests==2.32.3` (HTTP seguro)
    - `mysql-connector-python==9.1.0` (driver MySQL atualizado)
  - Versões atuais fixadas:
    - `fastapi==0.123.9`
    - `uvicorn==0.38.0`
    - `pydantic==2.12.5`
    - `bedrock-agentcore==1.1.1`
    - `boto3==1.42.3`
  - Builds agora são 100% reproduzíveis

### Added
- **Refresh Token System** (2025-12-05)
  - New `refresh_tokens` table in database with revocation support
  - `POST /api/auth/refresh` - Generate new access token (rate limited: 60/hour)
  - `POST /api/auth/logout` - Revoke refresh token on logout
  - Background job for automatic token cleanup (daily at 3 AM)
  - Frontend: Auto-refresh 5 minutes before token expiration
  - Frontend: Automatic retry with refresh on 401 errors
  - Dependency: `apscheduler==3.11.1` for scheduled tasks

### Changed
- **BREAKING CHANGE**: Chat endpoints now use JWT authentication instead of X-API-Key (2025-12-05)
  - `/api/chat` - POST endpoint requires JWT Bearer token
  - `/api/chat/sessions` - GET endpoint requires JWT Bearer token
  - `/api/chat/sessions/{id}/messages` - GET endpoint requires JWT Bearer token
  - `/api/chat/sessions/{id}` - PATCH endpoint requires JWT Bearer token
  - `/api/chat/sessions/{id}` - DELETE endpoint requires JWT Bearer token
  - Removed `X-API-Key` header support from chat endpoints
  - `user_id` is now automatically extracted from JWT token
  - Frontend: Removed API Key input UI from chat page
  - Frontend: `ChatService.sendMessage()` no longer requires `apiKey` parameter

- **Access Token Duration** (2025-12-05)
  - Reduced from 24 hours to 6 hours for improved security
  - New environment variable: `ACCESS_TOKEN_EXPIRE_HOURS` (default: 6)
  - New environment variable: `REFRESH_TOKEN_EXPIRE_DAYS` (default: 7)

- **Authentication Endpoints** (2025-12-05)
  - `/api/auth/login` now returns `refresh_token` in response
  - `/api/auth/register` now returns `refresh_token` in response
  - Frontend: `AuthService` now manages refresh tokens automatically
  - Frontend: `authInterceptor` implements automatic token refresh on 401

### Removed
- **BREAKING CHANGE**: `API_SECRET_KEY` environment variable no longer used or required
- Frontend: API Key management UI and localStorage storage
- Frontend: Deprecated `duraeco_api_key` localStorage key (auto-cleanup on app load)

### Fixed
- MCP server can now properly call chat endpoints using JWT authentication
- API authentication is now consistent across all endpoints (JWT only)
- Frontend: Chat errors now properly displayed to users with dismissible alerts

### Security
- **Improved**: Access tokens reduced from 24h to 6h (smaller attack window if leaked)
- **Improved**: Refresh tokens stored in database with revocation capability
- **Improved**: Automatic cleanup of expired/revoked tokens daily
- **Improved**: Token-based authentication provides better audit trail (per-user tokens)
- **Improved**: Logout now properly invalidates refresh tokens server-side
- **Removed**: Shared API key authentication (security improvement)

---

## [1.0.0] - 2025-12-04

### Added
- Initial DuraEco release
- Amazon Bedrock Nova Pro integration for waste image analysis
- AgentCore-powered chat assistant with database access
- MySQL/TiDB database with VECTOR(1024) embeddings
- FastAPI backend with 40+ endpoints
- Angular 21 frontend with TailwindCSS 4
- JWT authentication system
- Automatic hotspot detection (3+ reports in 500m radius)
- Real-time waste type classification
- Dashboard with statistics and visualizations
- MCP servers for Claude Code integration
- Rate limiting on critical endpoints
- Background task processing for image analysis

### Security
- JWT tokens with HS256 algorithm
- Password hashing with bcrypt
- OTP verification for password recovery
- CORS protection
- Rate limiting (30/min for chat, 20/hour for reports)

---

## Migration Guide

### For Backend Developers

If you're updating from a version that used X-API-Key:

1. **Remove API_SECRET_KEY from .env**:
   ```bash
   # Remove this line:
   API_SECRET_KEY=your_key_here
   ```

2. **Restart backend server**:
   ```bash
   cd backend-ai
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Update API calls** (if calling directly):
   ```python
   # OLD (X-API-Key):
   headers = {"X-API-Key": "your_api_key"}
   response = requests.post("/api/chat", headers=headers, ...)

   # NEW (JWT):
   headers = {"Authorization": "Bearer your_jwt_token"}
   response = requests.post("/api/chat", headers=headers, ...)
   ```

### For Frontend Developers

If you're updating existing code:

1. **Remove apiKey from ChatService calls**:
   ```typescript
   // OLD:
   this.chatService.sendMessage(message, this.apiKey).subscribe(...)

   // NEW:
   this.chatService.sendMessage(message).subscribe(...)
   ```

2. **Remove API Key UI/storage**:
   - No need to store or manage API keys in localStorage
   - authInterceptor handles JWT injection automatically

### For MCP Users

No changes needed! MCP already uses JWT via `MCP_AUTH_TOKEN` in `~/.claude.json`.

---

## Notes

- Chat endpoints (`/api/chat*`) previously used X-API-Key authentication
- This was causing MCP integration issues as the MCP server only injects JWT
- Unifying to JWT improves security and API consistency
