# Plan: Migrate SimpleJournal for Public Release

## Context

This repository is a copy of a private journaling app being moved to a public GitHub organization. The codebase is coupled to specific private infrastructure (external Postgres on `ogdenor` Docker network, Tailscale DNS, Ollama-specific AI API). The goal is to make it self-contained so anyone can clone, configure `.env`, and run `docker compose up` -- including users with existing external Postgres or other services.

Three categories of changes: (1) security/data cleanup, (2) self-contained Docker stack, (3) abstract AI from Ollama-specific to any OpenAI-compatible endpoint.

---

## Step 1: Clean Git History + Gitignore AI Artifacts

**Why:** `journal_backup.sql` (real user data) is tracked. AI agent files (`AGENTS.md`, etc.) should not ship in the public repo.

**Actions:**
- `git rm journal_backup.sql` -- purge from history via orphan branch (only 2 commits exist)
- `git rm AGENTS.md` -- remove from tracking
- `git rm package-lock.json` (root) -- empty file, no root `package.json`
- Delete `MIGRATE.md` -- entirely private-infrastructure-specific

**Add to `.gitignore`:**
```
# Database dumps
*.sql.bak
journal_backup*.sql

# AI agent / coding assistant artifacts
AGENTS.md
claude.md
CLAUDE.md
.gemini/
.cursorrules
.copilot/
.github/copilot*
```

---

## Step 2: Rewrite `docker-compose.yml` (Self-Contained Stack)

**File:** `docker-compose.yml`

Self-contained with bundled Postgres. Port defaults to 3003, configurable via `PORT` in `.env`.

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-journal}
      POSTGRES_USER: ${POSTGRES_USER:-journal}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-journal}"]
      interval: 5s
      timeout: 3s
      retries: 5

  journal-web:
    container_name: journal-web
    build:
      context: ./journal-web
      target: runner
    env_file:
      - .env
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://${POSTGRES_USER:-journal}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-journal}
    ports:
      - "${PORT:-3003}:3003"
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

**Also create:** `docker-compose.override.yml.example` -- template for connecting to an external database on a custom Docker network.

---

## Step 3: Rewrite `.env.example`

**File:** `.env.example`

```bash
# --- Database ---
POSTGRES_DB=journal
POSTGRES_USER=journal
POSTGRES_PASSWORD=changeme

# Override only if using an external database (docker-compose sets this automatically):
# DATABASE_URL=postgres://journal:changeme@your-host:5432/journal

# --- AI Provider (any OpenAI-compatible endpoint) ---
# Examples:
#   Ollama:  http://localhost:11434/v1
#   Gemini:  https://generativelanguage.googleapis.com/v1beta/openai
#   OpenAI:  https://api.openai.com/v1
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=mistral:latest
# AI_API_KEY=            # Required for cloud providers; omit for local Ollama

# --- Security ---
# Generate with: openssl rand -hex 32
JWT_SECRET=replace-with-a-long-random-secret

# --- App ---
PORT=3003
NEXT_PUBLIC_APP_URL=http://localhost:3003
SESSION_COOKIE_SECURE=false
```

Key changes: removed `REDIS_URL` (unused), replaced `OLLAMA_*` with generic `AI_*` vars, port 3003, no private hostnames.

---

## Step 4: Abstract AI Integration (Ollama -> OpenAI-Compatible)

**Why:** The current code calls Ollama's native `/api/generate` endpoint. Switching to the OpenAI chat completions format (`/chat/completions`) works universally -- Ollama exposes this at `/v1/chat/completions`, Gemini has an OpenAI-compatible layer, and any other provider using the OpenAI format just works.

### 4a. Refactor `journal-web/src/app/api/prompts/creative/route.ts`

**Rename env vars:**
```typescript
// Before:
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "mistral:latest";
const DEFAULT_OLLAMA_URL = process.env.OLLAMA_URL ?? "http://ollama.tailnet.local:11434";

// After:
const AI_MODEL = process.env.AI_MODEL ?? "mistral:latest";
const AI_BASE_URL = process.env.AI_BASE_URL ?? "";
const AI_API_KEY = process.env.AI_API_KEY ?? "";
```

**Rename types:**
```typescript
// Before:
type OllamaResult = { ok: true; text: string; raw: unknown } | { ok: false; ... };

// After:
type AIResult = { ok: true; text: string; raw: unknown } | { ok: false; ... };
```

**Rewrite `generateViaOllama()` -> `generateViaAI()`:**

Replace the Ollama-native call:
```typescript
// Before: POST {url}/api/generate  body: { model, prompt, stream: false }
// Response: { response: "text" }

// After: POST {AI_BASE_URL}/chat/completions  body: { model, messages, stream: false }
// Response: { choices: [{ message: { content: "text" } }] }
```

New implementation:
```typescript
async function generateViaAI(prompt: string): Promise<AIResult> {
  if (!AI_BASE_URL) {
    return { ok: false, text: "", raw: { error: "AI_BASE_URL is not configured." }, reason: "missing_url" };
  }

  const endpoint = new URL("/chat/completions", AI_BASE_URL);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (AI_API_KEY) {
    headers["Authorization"] = `Bearer ${AI_API_KEY}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    }),
  });

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  // ... same error handling pattern as current code
  return { ok: true, text, raw: data };
}
```

**Update response field:** `fromOllama` -> `fromAI` in the JSON response (lines 90-98).

**Update `aiRaw` storage:** Change `model: DEFAULT_OLLAMA_MODEL` -> `model: AI_MODEL` (line 75).

### 4b. Update `journal-web/src/app/page.tsx`

| Line | Before | After |
|------|--------|-------|
| 43 | `fromOllama: boolean` | `fromAI: boolean` |
| 560 | `ollamaStatus` state | `aiStatus` state |
| 661-663 | `"Generated via local Ollama."` / `"Fallback prompt saved while Ollama is offline."` | `"Prompt generated via AI."` / `"Fallback prompt saved (AI provider unreachable)."` |
| 793-797 | `"Ollama online"` / `"Ollama offline"` / `"Checking Ollama…"` | `"AI online"` / `"AI offline (using fallback)"` / `"Checking AI…"` |
| 814 | `"ask the internal Ollama instance"` | `"ask your AI provider"` |

### 4c. Update `journal-web/src/app/settings/page.tsx`

- Remove `REDIS_URL` entry from `ENV_VARS` array (lines 9-12)
- Replace `OLLAMA_URL` / `OLLAMA_MODEL` entries with `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY`
- Update descriptions to mention "OpenAI-compatible endpoint"
- Remove "All values remain on the tailnet." (line 43)
- Update troubleshooting section: "Ollama Connection" -> "AI Provider Connection", update curl command

### 4d. Update `journal-web/src/app/api/prompts/creative/route.test.ts`

- Update mock response format from `{ response: "text" }` to `{ choices: [{ message: { content: "text" } }] }` (line 81)
- Rename `fromOllama` -> `fromAI` in assertions (lines 91, 113, 153)
- Rename test descriptions (lines 66, 124)

### 4e. Update `journal-web/src/app/manifest.ts`

- Line 7: `"Tailnet-only anger..."` -> `"Private anger, gratitude, and creative journaling."`

---

## Step 5: Standardize Port to 3003

| File | Change |
|------|--------|
| `journal-web/Dockerfile:30-31` | `EXPOSE 3001` / `ENV PORT=3001` -> `EXPOSE 3003` / `ENV PORT=3003` |
| `journal-web/package.json` | `dev -p 3001` / `start -p 3001` -> `dev -p 3003` / `start -p 3003` |

(docker-compose.yml already uses 3003 in Step 2)

---

## Step 6: Docker Entrypoint for Auto-Migration + Seed

**Why:** `docker compose up` should produce a fully working app with zero manual steps.

**Create:** `journal-web/entrypoint.sh`
```sh
#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy
echo "Seeding database..."
npx prisma db seed || echo "Seed skipped (may already be complete)."
echo "Starting Simple Journal..."
exec node server.js
```

**Modify:** `journal-web/Dockerfile` runner stage:
- Copy Prisma schema, migrations, seed script, and CLI packages from builder stage
- Copy and chmod `entrypoint.sh`
- Replace `CMD ["node", "server.js"]` with `ENTRYPOINT ["./entrypoint.sh"]`

---

## Step 7: Rewrite Documentation

### `README.md` -- Full rewrite
Remove all tailnet/ogsdell/prox-dock/nginx references. New structure:
- Features overview
- Quick Start: clone -> `cp .env.example .env` -> edit secrets -> `docker compose up`
- Using an external database
- AI provider configuration (with examples for Ollama, Gemini, OpenAI)
- Environment variables table
- Local development
- Architecture table
- Contributing + License

### `USER_GUIDE.md` -- Edit ~4 lines
- Replace `ollama.tailnet.local:11434` with `localhost:11434`
- Replace private IP example with generic placeholder
- Rename `OLLAMA_URL`/`OLLAMA_MODEL` references to `AI_BASE_URL`/`AI_MODEL`

### Delete: `MIGRATE.md`, `journal-web/README.md`

---

## Step 8: Verification

1. **Private reference audit:**
   ```
   grep -rn 'tailnet\|ogdenor\|ogsdell\|prox-dock\|central-postgres\|central-redis\|192\.168\.\|OLLAMA_' --exclude-dir=.git
   ```
   Should return zero results.

2. **Fresh Docker test:**
   ```bash
   cp .env.example .env  # edit JWT_SECRET + POSTGRES_PASSWORD
   docker compose up -d --build
   # Visit http://localhost:3003, set passcode, test all 3 entry types
   ```

3. **External DB test:**
   ```bash
   docker compose up journal-web -d --build  # with DATABASE_URL in .env
   ```

4. **Run tests:**
   ```bash
   cd journal-web && npm test
   ```

---

## Files Summary

| File | Action |
|------|--------|
| `journal_backup.sql` | DELETE + purge from git history |
| `package-lock.json` (root) | DELETE |
| `MIGRATE.md` | DELETE |
| `AGENTS.md` | DELETE (gitignore) |
| `journal-web/README.md` | DELETE |
| `.gitignore` | ADD sql dumps + AI artifact patterns |
| `.env.example` | REWRITE |
| `docker-compose.yml` | REWRITE |
| `docker-compose.override.yml.example` | CREATE |
| `journal-web/entrypoint.sh` | CREATE |
| `README.md` | REWRITE |
| `USER_GUIDE.md` | MODIFY (~4 lines) |
| `journal-web/Dockerfile` | MODIFY (port 3003 + entrypoint + prisma files) |
| `journal-web/package.json` | MODIFY (port in scripts) |
| `journal-web/src/app/api/prompts/creative/route.ts` | REWRITE AI function (Ollama -> OpenAI-compatible) |
| `journal-web/src/app/api/prompts/creative/route.test.ts` | MODIFY (new response format + rename fields) |
| `journal-web/src/app/page.tsx` | MODIFY (~10 lines: rename ollama -> ai) |
| `journal-web/src/app/settings/page.tsx` | MODIFY (env vars, remove Redis, update descriptions) |
| `journal-web/src/app/manifest.ts` | MODIFY (1 line) |
