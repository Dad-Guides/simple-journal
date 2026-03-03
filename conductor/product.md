# Product: simple-journal

**Version:** 1.0
**Status:** Feature-complete; public release migration in progress

---

## Vision

A minimalist, self-hosted journaling application for private, single-operator use. The app provides three focused entry flows — anger, gratitude, and creative writing — with optional AI-generated creative prompts. It is intentionally simple: no accounts, no cloud sync, no search. Just a fast, private writing tool that runs on your own hardware.

---

## User Persona: The Operator

There is exactly one user: the operator who deploys and runs the stack.

| Attribute | Description |
|-----------|-------------|
| Technical level | Comfortable with Docker and basic CLI usage |
| Goal | A private, fast journaling habit without cloud dependencies |
| Environment | Personal server, home lab, or desktop machine; accessible only on a local network or VPN/tailnet |
| AI preference | Optionally uses a local LLM (Ollama) or any OpenAI-compatible provider; comfortable with AI being unavailable |

---

## Entry Types

| Type | Emoji | Purpose | AI? |
|------|-------|---------|-----|
| Anger | 🤬 | Guided prompt: "I am angry because I care about ___." Rapid save. | No |
| Gratitude | 🥰 | Random prompt from 100 seeded options stored in Postgres. | No |
| Creative | ✍️ | Long-form Markdown writing with AI-generated persona-driven prompts. | Yes (optional) |

---

## Design Principles

1. **Speed first for anger entries.** An anger entry should take < 10 seconds from lock screen to saved.
2. **Simplicity over features.** No search, no tags, no analytics in v1. The history view is chronological only.
3. **Private by design.** No telemetry, no external services beyond an optional AI provider configured by the operator.
4. **Self-contained deployment.** `docker compose up` should produce a fully working app with zero manual database steps.

---

## Non-Goals (v1)

- Multi-user support
- Search or tagging
- Export (PDF/Markdown)
- Email summaries
- Analytics or mood tracking

These are documented as optional future enhancements in [`AGENTS.md § Future Enhancements`](../AGENTS.md).
