# Tech Stack: simple-journal

**Last Updated:** 2026-03-03
**Status:** Feature-complete; public release migration pending (see ADR-0001)

---

## Application Layer

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Framework | Next.js | 16.0.3 | App Router; standalone output for Docker |
| Language | TypeScript | 5.x | Strict mode; no `any` |
| UI | React | 19.2.0 | — |
| Styling | Tailwind CSS | 4.x | Utility-first; postcss pipeline |
| Icons | lucide-react | 0.554.0 | — |
| Markdown | react-markdown + remark-gfm | 10.x / 4.x | Entry detail view |

## Data Layer

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Database | PostgreSQL | 16 | Alpine image in Docker |
| ORM | Prisma | 6.x | Migrations + typed client |

## Authentication

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Password hashing | argon2 | 0.44.0 | Passcode stored hashed |
| Session cookie | jose (JWT) | 6.x | httpOnly, signed, long-lived |

## AI Integration

| Component | Technology | Notes |
|-----------|-----------|-------|
| Protocol | OpenAI-compatible chat completions | `POST {AI_BASE_URL}/chat/completions` |
| Default provider | Ollama (local) | `http://localhost:11434/v1` |
| Supported providers | Any OpenAI-compatible endpoint | Ollama, Gemini (OpenAI compat. layer), OpenAI, LM Studio, etc. |
| Env vars | `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` | See `.env.example` |

> **Note:** The codebase currently uses the Ollama-native `/api/generate` endpoint. Migration to the OpenAI-compatible `/chat/completions` format is tracked in [ADR-0001](./adr/0001-openai-compatible-ai.md) and planned as task P7 of the public release track.

## Testing

| Component | Technology | Version |
|-----------|-----------|---------|
| Test runner | Vitest | 3.x |
| DOM environment | jsdom | 27.x |
| React renderer | react-test-renderer | 19.x |

## Infrastructure

| Component | Technology | Notes |
|-----------|-----------|-------|
| Container runtime | Docker + Docker Compose v2 | — |
| Base image | node:22-alpine | Non-root user (`nextjs:1001`) |
| Build | Multi-stage Dockerfile | deps → builder → runner |
| Linting | ESLint 9 + eslint-config-next | — |

## Removed from Stack

| Component | Reason |
|-----------|--------|
| Redis | Included in initial design for session caching; never implemented. Removed to simplify deployment. |
| Nginx | Original deployment used a host Nginx proxy. The self-contained stack exposes the app port directly. |

---

## Environment Variables

| Variable | Required | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string (auto-set by Compose from `POSTGRES_*` vars) |
| `JWT_SECRET` | Yes | Long random string for signing session cookies |
| `POSTGRES_DB` | Yes (Compose) | DB name (default: `journal`) |
| `POSTGRES_USER` | Yes (Compose) | DB user (default: `journal`) |
| `POSTGRES_PASSWORD` | Yes (Compose) | DB password (no default; must be set) |
| `AI_BASE_URL` | No | Base URL for OpenAI-compatible AI endpoint |
| `AI_MODEL` | No | Model identifier (default: `mistral:latest`) |
| `AI_API_KEY` | No | Bearer token; omit for local Ollama |
| `PORT` | No | App port (default: `3003`) |
| `NEXT_PUBLIC_APP_URL` | No | Public URL for PWA manifest |
| `SESSION_COOKIE_SECURE` | No | Override cookie secure flag (`true`/`false`) |

