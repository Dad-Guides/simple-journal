# Simple Journal – Operator Notes

This document explains how to keep the gratitude prompt library, creative personas, and Ollama integration up to date until an in-app admin surface ships.

## 1. Connecting to your Ollama instance

The web container reads two environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `OLLAMA_URL` | Base URL for the internal Ollama API (e.g. `http://ollama.tailnet.local:11434`) | `http://ollama.tailnet.local:11434` |
| `OLLAMA_MODEL` | Model identifier passed to `POST /api/generate` | `mistral:latest` |

Update these in the `.env` file consumed by `journal-web` (or in your Compose environment) and restart the stack. For custom ports or models:

```bash
# Example: tailnet host at 192.168.1.45 running ollama at port 1337
echo "OLLAMA_URL=http://192.168.1.45:1337" >> .env
echo "OLLAMA_MODEL=gpt-oss:20b" >> .env

# Rebuild / restart
docker compose build journal-web
docker compose up -d journal-web
```

When `OLLAMA_URL` is unreachable the API saves a fallback prompt, and the UI calls that out (“Fallback prompt saved while Ollama is offline.”). Fix the URL/port/model to restore live generations.

## 2. Gratitude prompts

*Location:* `journal-web/prisma/seed.ts` (`GRATITUDE_PROMPTS` array)

*Population:* `npm run db:seed` (runs `prisma db seed`, upserts prompts)

*How to update:*

1. Edit the `GRATITUDE_PROMPTS` list (add/remove/modify strings).
2. Rerun the seed (`cd journal-web && npm run db:seed`). Existing prompts are matched on `promptText`, so editing text creates a new row; minor copy edits should happen directly in Postgres to preserve references.

*Considerations:*

- Existing journal entries store `gratitudePromptId`. Deleting a prompt row orphaned entries. Prefer toggling `is_active` in the DB if you need to temporarily hide one.
- Because the seed upserts, you can safely append new prompts without affecting history.

## 3. Creative personas

*Location:* `journal-web/prisma/seed.ts` (`CREATIVE_PERSONAS` array)

*Population:* `npm run db:seed`

Each persona has `name`, `description`, `order`, and `is_active`. The API pulls active personas sorted by `order`.

*How to update:*

1. Add or edit persona entries in the seed file.
2. Run `npm run db:seed` to upsert records. Order is derived from the array index unless you explicitly set `order`.

*Considerations:*

- Persona `name` is unique. Editing the name in the seed will create a new row; adjust directly in Postgres if you want to rename without duplication.
- Existing creative prompts store the persona details (name/description) inline, so removing a persona only affects future generations.

## 4. Seeding checklist

```bash
cd journal-web
npm install           # once
npm run db:migrate    # apply migrations if needed
npm run db:seed       # upsert counters, user, prompts, personas
```

Run the seed anytime you tweak prompts/personas so the DB reflects your changes.

## 5. Troubleshooting

- **No gratitude prompts available**: Ensure `gratitude_prompts` has rows with `is_active = true`. Re-run the seed or update records manually.
- **No personas to select**: Same approach—check `creative_personas`. The Creative tab disables prompt generation until at least one persona exists.
- **Ollama timeouts**: Verify the `OLLAMA_URL` hostname/IP is reachable from within the Docker network (e.g. `docker exec journal-web curl http://…/api/version`). Update the URL or network routing accordingly.
