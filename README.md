# Simple Journal

Tailnet-only anger, gratitude, and creative journaling built with Next.js, PostgreSQL, Redis, and an internal Ollama instance. Entries stay private on host machine, locked behind a local passcode, and are accessible only from your tailnet.

## Highlights

- Three focused entry flows:
  - 🤬 **Anger**: one-line guided prompt plus rapid save shortcut.
  - 🥰 **Gratitude**: pulls from 100 seeded prompts stored in Postgres.
  - ✍️ **Creative**: persona-driven prompts generated through Ollama with Markdown drafting.
- Auto-titled entries per type (`🤬 001`, `🥰 042`, etc.), chronological history, and detailed entry view with Markdown rendering.
- Passcode gate backed by argon2 + long-lived JWT cookie; single-user by design but future-proofed via UUIDs.
- Docker-first deployment targeting host machine with Next.js running behind the existing Nginx proxy.

## Architecture at a Glance

| Component | Purpose |
| --- | --- |
| `journal-web` | Next.js App Router UI + API routes. |
| `journal-db` | PostgreSQL 16 storing users, entries, prompts, personas, counters. |
| `journal-redis` | Redis 7 for future session caching and prompt health flags. |
| `ollama` | Tailnet-accessible Ollama instance (e.g., `http://ollama.tailnet.local:11434`). |
| `nginx-proxy` | Existing host machine ingress mapping `journal.tailnet.local` → journal-web. |

All containers share the `ogsdell-network` / `prox-dock-internal` Docker network; Postgres/Redis/Ollama never expose public ports.

## Prerequisites

- Docker 26+ and Docker Compose v2 on host machine.
- Tailnet DNS entry (e.g., `journal.tailnet.local`) pointing at the host running Nginx.
- Node.js 22+ (only required for local development outside Docker).
- An Ollama instance reachable from the Docker network with at least one local model (`mistral:latest`, `gpt-oss:20b`, etc.).
- `.env` file in repo root with service URLs and secrets (see below).

### Environment Variables

Place these in `.env` so both Docker and local scripts inherit them:

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string used by Prisma. | `postgres://journal:secret@journal-db:5432/journal` |
| `REDIS_URL` | Redis connection URI. | `redis://journal-redis:6379/0` |
| `OLLAMA_URL` | Base URL for the internal Ollama API. | `http://ollama.tailnet.local:11434` |
| `OLLAMA_MODEL` | Model ID passed to `POST /api/generate`. | `mistral:latest` |
| `JWT_SECRET` | Long random string for signing session cookies. | `p5Pj...` |
| `SESSION_COOKIE_SECURE` (optional) | Override cookie security flag (`true`/`false`). | `true` |

## Quick Start (Docker on host machine)

1. Copy `.env.example` (if provided) or craft `.env` with the variables above. Ensure the Postgres and Redis hosts match whatever backing services you already run on `ogsdell-network`.
2. Install dependencies once: `cd journal-web && npm install`. (This can also be done inside the container via `docker compose run --rm journal-web npm install`.)
3. Apply migrations + seed data against your Postgres instance:
   ```bash
   cd journal-web
   npm run db:migrate
   npm run db:seed
   ```
   Seeds create the default user, entry counters, 100 gratitude prompts, and 10 creative personas.
4. Build and launch the app container:
   ```bash
   cd ..
   docker compose build journal-web
   docker compose up -d journal-web
   ```
5. Update Nginx (if needed) so `journal.tailnet.local` proxies to `journal-web:3001`. The existing host machine snippet is:
   ```
   server {
       server_name journal.tailnet.local;
       location / {
           proxy_pass http://journal-web:3001;
       }
   }
   ```
6. Visit `https://journal.tailnet.local` from a tailnet client, set your passcode, and begin journaling.

## Local Development

If you’d rather run the app outside Docker (while keeping Postgres/Redis in containers or local services):

```bash
cd journal-web
npm install
npm run dev # listens on http://localhost:3001
```

Ensure your `.env` (one directory up) points at reachable Postgres/Redis/Ollama endpoints. The dev server hot-reloads UI + API routes as expected.

### Useful Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server on port 3001. |
| `npm run build` / `npm run start` | Production build + server (used in Docker image). |
| `npm run lint` | Runs ESLint with the Next.js config. |
| `npm run db:migrate` | `prisma migrate deploy` using root `.env`. |
| `npm run db:seed` | Upserts user/counters/prompts/personas. |

## Application Flow

1. **Unlocking** – `/api/auth/status` checks for a stored passcode and existing session; `/api/auth/set` hashes the passcode via argon2, `/api/auth/verify` signs the session cookie via `jose`.
2. **Entries** – `/api/entries` powers both creation (auto-title via `entry_counters`) and the paginated history feed; `/entries/[id]` shows detail view.
3. **Prompts** – `/api/prompts/gratitude/random` samples from active `gratitude_prompts`; `/api/prompts/creative` pulls active personas, calls Ollama (`OLLAMA_URL`/`OLLAMA_MODEL`), and stores the resulting prompt or fallback text.

## Seeding & Data Changes

- Edit `journal-web/prisma/seed.ts` to tweak gratitude prompts or creative personas.
- Re-run `npm run db:seed` after edits (safe because the script upserts by `promptText`/`name`).
- Avoid deleting prompts in Postgres; toggle `is_active=false` when retiring a prompt/persona so historical entries keep their context.

## Troubleshooting

- **Ollama offline**: The Creative tab saves a fallback prompt, but you’ll see a “fallback” badge. Verify `OLLAMA_URL` from inside the container: `docker compose exec journal-web curl $OLLAMA_URL/api/version`.
- **No prompts/personas**: Run the seed script again or confirm the rows exist with `is_active=true`.
- **Session issues**: Delete the `sj_session` cookie and ensure `JWT_SECRET` stayed consistent between builds.

## Contributing

This repo targets a single-operator deployment. Keep passcode/auth flows simple, use the Docker image for production, and coordinate any larger architectural shifts (e.g., multi-user support, Redis-backed session store) through AGENTS.md before implementation.
