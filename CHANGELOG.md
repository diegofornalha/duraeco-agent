# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

### Removed
- **BREAKING CHANGE**: `API_SECRET_KEY` environment variable no longer used or required
- Frontend: API Key management UI and localStorage storage

### Fixed
- MCP server can now properly call chat endpoints using JWT authentication
- API authentication is now consistent across all endpoints (JWT only)

### Security
- Improved: All endpoints now use JWT with 24-hour expiration
- Improved: Token-based authentication provides better audit trail (per-user tokens)
- Removed: Shared API key authentication (security improvement)

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
