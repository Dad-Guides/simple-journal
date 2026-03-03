# Plan: Public Release Migration

**Opened:** 2026-03-03
**Status:** Active
**References:**
- [transition.md](../../transition.md) — original migration specification (to be deleted as P15)
- [ADR-0001](../../adr/0001-openai-compatible-ai.md) — AI provider abstraction decision

---

## Phase 1 — Repository Hygiene

### P1 — Purge sensitive data from git history  `[x]`

**Files:**
- `journal_backup.sql` (delete + history scrub)
- `package-lock.json` (root, delete + history scrub)

**Scope:** A real database dump (`journal_backup.sql`) and an empty root `package-lock.json` are tracked in git. Only 3 commits exist, so an orphan-branch rewrite is the safest approach to remove them without `git filter-repo`. After the rewrite, force-push requires human operator confirmation.

**Acceptance Criteria:**
- [ ] `journal_backup.sql` does not appear in `git log --all --full-history -- journal_backup.sql`
- [ ] `package-lock.json` (root) does not appear in git history
- [ ] `git log --all --oneline` shows a clean history with no commit referencing these files

**Dependencies:** none

**ADR:** n/a

---

### P2 — Update `.gitignore` for SQL dumps  `[x]`

**Files:**
- `.gitignore` (modify)

**Scope:** Add patterns to prevent future accidental commits of database dump files. The AI artifact patterns from `transition.md` are not needed since `conductor/` and `AGENTS.md` are intentionally tracked publicly.

**Acceptance Criteria:**
- [ ] `.gitignore` includes `*.sql.bak` and `journal_backup*.sql`
- [ ] `git check-ignore journal_backup.sql` returns a match
- [ ] `git check-ignore AGENTS.md` returns no match (AGENTS.md remains tracked)

**Dependencies:** none

---

## Phase 2 — Self-Contained Docker Stack

### P3 — Rewrite `docker-compose.yml` with bundled Postgres  `[x]`

**Files:**
- `docker-compose.yml` (rewrite)

**Scope:** The current Compose file connects to an external `ogdenor` Docker network with no bundled database. Replace with a self-contained stack: bundled Postgres 16-alpine with a healthcheck, `journal-web` depends on a healthy DB, `DATABASE_URL` auto-constructed from `POSTGRES_*` vars, port 3003.

**Acceptance Criteria:**
- [ ] `docker compose up -d --build` starts without error on a clean machine with only `.env` configured
- [ ] DB service includes a `healthcheck` using `pg_isready`
- [ ] `journal-web` uses `depends_on` with `condition: service_healthy`
- [ ] No reference to `ogdenor` or any external network in the file
- [ ] `DATABASE_URL` is constructed from `POSTGRES_*` vars in the Compose `environment` block

**Dependencies:** none

---

### P4 — Create `docker-compose.override.yml.example`  `[x]`

**Files:**
- `docker-compose.override.yml.example` (new)

**Scope:** Provide an example override file showing how to connect `journal-web` to an external database on a custom Docker network, for operators who already run a shared Postgres instance.

**Acceptance Criteria:**
- [ ] File exists and documents how to override `DATABASE_URL` and join an external network
- [ ] File is named `.example` (never committed as the active override; `.gitignore` should exclude `docker-compose.override.yml`)

**Dependencies:** P3

---

## Phase 3 — Configuration Cleanup

### P5 — Rewrite `.env.example`  `[x]`

**Files:**
- `.env.example` (rewrite)

**Scope:** Remove private infrastructure references (`REDIS_URL`, `OLLAMA_URL`, `OLLAMA_MODEL`, private container names). Replace with generic `AI_*` vars and `POSTGRES_*` vars. Port defaults to 3003. No private hostnames.

**Acceptance Criteria:**
- [ ] `REDIS_URL` is absent
- [ ] `OLLAMA_URL` and `OLLAMA_MODEL` are absent
- [ ] `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` are present with clear comments and examples
- [ ] `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` are present
- [ ] No private container names, IP addresses, or tailnet hostnames appear
- [ ] `JWT_SECRET` has a generation hint (e.g., `openssl rand -hex 32`)
- [ ] `PORT` defaults to `3003`

**Dependencies:** none

---

### P6 — Standardize port to 3003  `[x]`

**Files:**
- `journal-web/Dockerfile` (modify: `EXPOSE 3001` → `EXPOSE 3003`, `ENV PORT=3001` → `ENV PORT=3003`)
- `journal-web/package.json` (modify: `-p 3001` → `-p 3003` in `dev` and `start` scripts)

**Scope:** The Dockerfile and package.json scripts still use port 3001. Standardize to 3003 to match docker-compose.yml.

**Acceptance Criteria:**
- [ ] `Dockerfile` contains `EXPOSE 3003` and `ENV PORT=3003`
- [ ] `package.json` `dev` script runs on port 3003
- [ ] `package.json` `start` script runs on port 3003
- [ ] `grep -n '3001' journal-web/Dockerfile journal-web/package.json` returns no matches

**Dependencies:** none

---

## Phase 4 — AI Provider Abstraction

### P7 — Refactor `creative/route.ts` to OpenAI-compatible API  `[x]`

**Files:**
- `journal-web/src/app/api/prompts/creative/route.ts` (rewrite AI function)

**Scope:** Replace Ollama-native `POST /api/generate` call with a standard OpenAI chat completions call (`POST {AI_BASE_URL}/chat/completions`). Rename env vars (`OLLAMA_URL` → `AI_BASE_URL`, `OLLAMA_MODEL` → `AI_MODEL`), add `AI_API_KEY` support, rename types (`OllamaResult` → `AIResult`, `generateViaOllama` → `generateViaAI`), rename response field `fromOllama` → `fromAI`. See ADR-0001.

**Acceptance Criteria:**
- [ ] No reference to `OLLAMA_URL`, `OLLAMA_MODEL`, or `/api/generate` in the file
- [ ] Request uses `POST {AI_BASE_URL}/chat/completions` with `{ model, messages: [{ role: "user", content: prompt }], stream: false }`
- [ ] Response parses `choices?.[0]?.message?.content ?? ""`
- [ ] `Authorization: Bearer {AI_API_KEY}` header is included only when `AI_API_KEY` is set
- [ ] `fromOllama` renamed to `fromAI` in the JSON response
- [ ] Existing error handling (missing URL, HTTP errors, empty response) is preserved

**Dependencies:** none

**ADR:** [ADR-0001](../../adr/0001-openai-compatible-ai.md)

---

### P8 — Update `page.tsx` AI references  `[x]`

**Files:**
- `journal-web/src/app/page.tsx` (modify ~10 lines)

**Scope:** Rename `fromOllama` → `fromAI` in the type definition, state variable (`ollamaStatus` → `aiStatus`), and status message strings. Update UI text from Ollama-specific to generic AI provider language.

**Acceptance Criteria:**
- [ ] `fromOllama` does not appear in the file
- [ ] Status indicator shows "AI online" / "AI offline (using fallback)" / "Checking AI…"
- [ ] Fallback message reads "Fallback prompt saved (AI provider unreachable)." or equivalent

**Dependencies:** P7

---

### P9 — Update `settings/page.tsx`  `[x]`

**Files:**
- `journal-web/src/app/settings/page.tsx` (modify)

**Scope:** Remove `REDIS_URL` from the displayed env vars list. Replace `OLLAMA_URL` / `OLLAMA_MODEL` entries with `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY`. Update descriptions to mention "OpenAI-compatible endpoint". Update troubleshooting section.

**Acceptance Criteria:**
- [ ] `REDIS_URL` does not appear in the env var list
- [ ] `OLLAMA_URL` / `OLLAMA_MODEL` do not appear in the env var list
- [ ] `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` appear with appropriate descriptions
- [ ] Troubleshooting section says "AI Provider Connection" (not "Ollama Connection")
- [ ] curl command in troubleshooting uses `AI_BASE_URL`

**Dependencies:** P7

---

### P10 — Update `route.test.ts` for new AI response format  `[x]`

**Files:**
- `journal-web/src/app/api/prompts/creative/route.test.ts` (modify)

**Scope:** Update mock fetch response from Ollama format `{ response: "text" }` to OpenAI format `{ choices: [{ message: { content: "text" } }] }`. Rename `fromOllama` → `fromAI` in all assertions and test descriptions.

**Acceptance Criteria:**
- [ ] `fromOllama` does not appear in the file
- [ ] Mock response uses OpenAI chat completions format
- [ ] `npm test` passes with all tests green

**Dependencies:** P7

---

### P11 — Update `manifest.ts`  `[x]`

**Files:**
- `journal-web/src/app/manifest.ts` (modify 1 line)

**Scope:** Remove the "Tailnet-only" description from the PWA manifest; replace with a generic description suitable for a public-repo app.

**Acceptance Criteria:**
- [ ] `manifest.ts` does not contain "Tailnet" or "tailnet"
- [ ] Description reads: "Private anger, gratitude, and creative journaling."

**Dependencies:** none

---

## Phase 5 — Docker Entrypoint

### P12 — Create `entrypoint.sh` and update Dockerfile  `[ ]`

**Files:**
- `journal-web/entrypoint.sh` (new)
- `journal-web/Dockerfile` (modify runner stage)

**Scope:** `docker compose up` should produce a fully working app with zero manual steps. Add an entrypoint script that runs `prisma migrate deploy` and `prisma db seed` before starting the Next.js server. Update the Dockerfile runner stage to copy Prisma schema, migrations, seed script, and CLI packages from the builder stage.

**Acceptance Criteria:**
- [ ] `entrypoint.sh` exists and is executable (`chmod +x` in Dockerfile or `RUN chmod +x`)
- [ ] Script runs `prisma migrate deploy`, then `prisma db seed` (non-fatal if already seeded via `|| echo "Seed skipped"`), then `exec node server.js`
- [ ] Dockerfile runner stage copies Prisma schema, migrations, seed script, and `prisma` CLI from builder
- [ ] `docker compose up -d --build` on a fresh database applies all migrations and seeds data automatically
- [ ] Old `CMD ["node", "server.js"]` is replaced by `ENTRYPOINT ["./entrypoint.sh"]`

**Dependencies:** P3, P6

---

## Phase 6 — Documentation

### P13 — Rewrite `README.md`  `[ ]`

**Files:**
- `README.md` (rewrite)

**Scope:** Remove all tailnet/ogsdell/prox-dock/nginx/Redis references. New structure: features overview, quick start (clone → `.env` → `docker compose up`), using an external database, AI provider configuration (with Ollama/Gemini/OpenAI examples), environment variables table, local development, architecture, contributing.

**Acceptance Criteria:**
- [ ] No reference to `tailnet`, `ogsdell`, `prox-dock`, `ogdenor`, `nginx`, or `REDIS_URL`
- [ ] Quick Start requires only: clone → `cp .env.example .env` → edit 2-3 secrets → `docker compose up -d --build`
- [ ] AI configuration section documents Ollama, Gemini, and OpenAI as examples
- [ ] Environment variables table matches `.env.example` (after P5)
- [ ] Architecture table accurately reflects the self-contained stack

**Dependencies:** P3, P5

---

### P14 — Update `USER_GUIDE.md`  `[ ]`

**Files:**
- `USER_GUIDE.md` (modify ~4 lines)

**Scope:** Replace `OLLAMA_URL`/`OLLAMA_MODEL` variable names with `AI_BASE_URL`/`AI_MODEL`. Replace private IP example and private hostname (`ollama.tailnet.local:11434`) with generic placeholders. Update the curl verification command.

**Acceptance Criteria:**
- [ ] `OLLAMA_URL` and `OLLAMA_MODEL` do not appear in the file
- [ ] `AI_BASE_URL` and `AI_MODEL` appear with correct descriptions
- [ ] No private IP addresses or tailnet hostnames remain
- [ ] Fallback message text matches updated `page.tsx` (after P8)

**Dependencies:** P8

---

### P15 — Delete migration/transition planning files  `[ ]`

**Files:**
- `MIGRATE.md` (delete)
- `transition.md` (delete)
- `journal-web/README.md` (delete)

**Scope:** These files are either private-infrastructure-specific (MIGRATE.md), internal planning docs superseded by conductor/tracks/ (transition.md), or a boilerplate Next.js scaffold README (journal-web/README.md).

**Acceptance Criteria:**
- [ ] None of the three files exist in the repository after this task
- [ ] `git status` shows them as deleted and committed

**Dependencies:** P13

---

## Phase 7 — Verification

### P16 — Private reference audit  `[ ]`

**Files:** read-only audit

**Scope:** Confirm no private infrastructure references remain anywhere in the codebase.

**Acceptance Criteria:**
- [ ] `grep -rn 'tailnet\|ogdenor\|ogsdell\|prox-dock\|central-postgres\|central-redis\|OLLAMA_\|192\.168\.' --exclude-dir=.git --exclude-dir=node_modules` returns zero results
- [ ] `grep -rn 'REDIS_URL' --exclude-dir=.git --exclude-dir=node_modules` returns zero results (except `.gitignore` comments if applicable)

**Dependencies:** P2, P5, P7, P8, P9, P11, P13, P14, P15

---

### P17 — Fresh Docker integration test  `[ ]`

**Files:** none

**Scope:** Verify that a clean `docker compose up` from a fresh clone produces a working app with no manual steps.

**Acceptance Criteria:**
- [ ] `cp .env.example .env`, set only `JWT_SECRET` and `POSTGRES_PASSWORD`, then `docker compose up -d --build` succeeds
- [ ] `http://localhost:3003` is reachable and shows the passcode gate
- [ ] All three entry types (anger, gratitude, creative) work end-to-end
- [ ] History view shows saved entries
- [ ] AI prompt generation works when `AI_BASE_URL` is configured and the provider is reachable

**Dependencies:** P3, P5, P6, P7, P12, P13

---

### P18 — Test suite passes  `[ ]`

**Files:** none

**Scope:** Run the full Vitest suite after all code changes and confirm all tests pass.

**Acceptance Criteria:**
- [ ] `cd journal-web && npm test` exits 0
- [ ] No test file references `fromOllama`, `OLLAMA_URL`, or the Ollama-native response format

**Dependencies:** P7, P10

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Git history rewrite (P1) loses conductor/ setup commits | Low | Medium | Create conductor/ docs and commit before executing P1; note SHA in session log |
| `journal_backup.sql` was already pushed to a remote | Unknown | High | Confirm remote state before executing P1; rotate any credentials if the dump contained secrets |
| Entrypoint seed fails on a pre-seeded DB, crashing the container | Medium | High | Use `\|\| echo "Seed skipped"` pattern; test on both a fresh and pre-seeded DB |
| OpenAI-compatible endpoint response shape varies by provider | Low | Medium | Parse defensively: `choices?.[0]?.message?.content ?? ""`; existing fallback path handles empty result |
| Dockerfile runner stage missing Prisma files after P12 | Medium | Medium | Explicitly list each `COPY --from=builder` path; test `docker compose up --build` on fresh DB |

---

## Completion Checklist

- [x] P1 — Purge sensitive data from git history
- [x] P2 — Update .gitignore for SQL dumps
- [x] P3 — Rewrite docker-compose.yml (self-contained stack)
- [x] P4 — Create docker-compose.override.yml.example
- [x] P5 — Rewrite .env.example
- [x] P6 — Standardize port to 3003
- [x] P7 — Refactor creative/route.ts (OpenAI-compatible API)
- [x] P8 — Update page.tsx AI references
- [x] P9 — Update settings/page.tsx
- [x] P10 — Update route.test.ts
- [x] P11 — Update manifest.ts
- [ ] P12 — Create entrypoint.sh and update Dockerfile
- [ ] P13 — Rewrite README.md
- [ ] P14 — Update USER_GUIDE.md
- [ ] P15 — Delete migration/transition planning files
- [ ] P16 — Private reference audit
- [ ] P17 — Fresh Docker integration test
- [ ] P18 — Test suite passes
