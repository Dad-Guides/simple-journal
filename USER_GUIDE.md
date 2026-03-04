# Simple Journal – Operator Notes

This document explains how to keep the gratitude prompt library, creative personas, and AI integration up to date.

## 1. Connecting to an AI provider

AI prompt generation is configured via the **Settings page** in the app — changes take effect immediately without restarting the container.

You can also set environment variables in `docker-compose.yml` as operator defaults (the Settings page values take precedence at runtime):

| Variable | Purpose | Example |
| --- | --- | --- |
| `AI_BASE_URL` | Base URL for any OpenAI-compatible API | `http://ollama-host:11434/v1` |
| `AI_MODEL` | Model identifier | `mistral:latest` |
| `AI_API_KEY` | API key (omit for local Ollama) | `sk-...` |

Common provider examples:

```yaml
# Ollama (local)
AI_BASE_URL: http://your-ollama-host:11434/v1
AI_MODEL: mistral:latest

# OpenAI
AI_BASE_URL: https://api.openai.com/v1
AI_MODEL: gpt-4o-mini
AI_API_KEY: sk-...

# Gemini
AI_BASE_URL: https://generativelanguage.googleapis.com/v1beta/openai
AI_MODEL: gemini-2.0-flash
AI_API_KEY: AI...
```

After updating `docker-compose.yml`, restart the service:

```bash
docker compose up -d journal-web
```

When the AI provider is unreachable the app saves a fallback prompt and the UI displays a "Fallback prompt saved while AI is offline." notice.

## 2. Gratitude prompts

*Location:* `journal-web/prisma/seed.ts` (`GRATITUDE_PROMPTS` array)

*Population:* runs automatically on container startup; can also be run manually:

```bash
docker compose exec journal-web node prisma/seed.js
```

*How to update:*

1. Edit the `GRATITUDE_PROMPTS` list (add/remove/modify strings).
2. Rebuild the image (`docker compose up -d --build`) — the seed runs on startup and upserts prompts.
3. Or, for a running container, re-run the seed command above.

*Considerations:*

- Existing journal entries store `gratitudePromptId`. Deleting a prompt row orphans those entries. Prefer toggling `is_active` in the DB if you need to temporarily hide one.
- Because the seed upserts, you can safely append new prompts without affecting history.

## 3. Creative personas

*Location:* `journal-web/prisma/seed.ts` (`CREATIVE_PERSONAS` array)

Each persona has `name`, `description`, `order`, and `is_active`. The API pulls active personas sorted by `order`.

*How to update:*

1. Add or edit persona entries in the seed file.
2. Rebuild and restart (`docker compose up -d --build`), or re-run the seed manually.

*Considerations:*

- Persona `name` is unique. Editing the name in the seed creates a new row; adjust directly in Postgres if you want to rename without duplication.
- Existing creative prompts store the persona details (name/description) inline, so removing a persona only affects future generations.

## 4. Seeding checklist

The seed runs automatically on every container start. For manual runs against the running container:

```bash
docker compose exec journal-web node prisma/seed.js
```

For local development:

```bash
cd journal-web
npm install           # once
npm run db:migrate    # apply migrations if needed
npm run db:seed       # upsert counters, user, prompts, personas
```

## 5. Troubleshooting

- **No gratitude prompts available**: Ensure `gratitude_prompts` has rows with `is_active = true`. Re-run the seed or update records manually.
- **No personas to select**: Same approach — check `creative_personas`. The Creative tab disables prompt generation until at least one persona exists.
- **AI timeouts**: Verify `AI_BASE_URL` is reachable from within the Docker network:
  ```bash
  docker compose exec journal-web wget -qO- http://your-ai-host:11434/v1/models
  ```
  Update the URL or network routing accordingly. You can also change the provider without restarting by using the Settings page.
