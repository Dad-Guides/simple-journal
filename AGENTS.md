# AGENTS — simple-journal

> This file is the primary AI entry point for simple-journal. It is AI-neutral and applies to any model or runtime.
> See [../AGENTS.md](../AGENTS.md) for workspace-level mandates and SOPs.

---

## 1. Core Identity

- **Project:** simple-journal
- **Role:** Lead Full-Stack Engineer for the simple-journal private journaling platform
- **Coding Standards:** TypeScript strict mode; Tailwind CSS utility-first

## 2. Project Context Map

| Document | Purpose |
|----------|---------|
| [conductor/product.md](./conductor/product.md) | Product vision and user persona |
| [conductor/tech-stack.md](./conductor/tech-stack.md) | Current technology stack |
| [conductor/tracks.md](./conductor/tracks.md) | Track index |
| [conductor/adr/](./conductor/adr/) | Architecture Decision Records |

## 3. Current Mission: Public Release Migration

- **Active Track:** [conductor/tracks/public_release_20260303/plan.md](./conductor/tracks/public_release_20260303/plan.md)
- **Current Item:** P1 — Purge sensitive data from git history
- **Full Plan:** [conductor/tracks/public_release_20260303/plan.md](./conductor/tracks/public_release_20260303/plan.md)

## 4. Architectural Rules

1. **Strict Typing:** No `any`. Validate all data from external sources at network boundaries.
2. **Schema-First:** All new features require a Prisma migration before application code that depends on them.
3. **Single-User Design:** Auth is a passcode gate (argon2 + JWT cookie). No multi-user flows.
4. **AI Abstraction:** All LLM calls use the OpenAI-compatible `/chat/completions` endpoint. No provider-specific APIs in application code. See [ADR-0001](./conductor/adr/0001-openai-compatible-ai.md).
5. **Agentic Workflow:** Update `plan.md` after every completed task per [sop-workflow.md](../conductor/sop-workflow.md).
6. **Privacy by Design:** This is a personal journal. No analytics, no telemetry, no external data sharing.

---

## 5. Future Enhancements (Optional)

These are intentionally out of scope for v1 and should not be implemented without an explicit track:

- Search / tagging
- Export as PDF or Markdown
- Analytics or mood tracking
- Multi-user support
- Daily email summaries
- Additional PWA enhancements (offline caching, install prompts)

---

## 6. Progress History

### Phase 4 Complete (Apr 29, 2026)

- **Auth & Sessions:** Passcode gate with argon2 hashing and JWT cookies; automated tests cover set/verify/status flows.
- **Entries & History:** Anger, gratitude, and creative flows share a cohesive UI with keyboard shortcuts, status banners, and paginated history.
- **Prompts & Personas:** Gratitude randomizer and creative persona/prompt generation use Prisma-backed APIs with Vitest suites. Admin endpoints + settings UI let operators toggle active prompts/personas without touching the database.
- **UI Polish:** Palette consolidated with consistent spacing, typography, and contrast. Markdown renderer upgraded for readability.
- **Testing:** Vitest suites cover auth, entries API (list/create), prompt endpoints, admin toggles, plus UI components (PasscodeGate, HistoryPreview).

---

*Workspace SOPs: [../conductor/](../conductor/)*
*For historical context, see [conductor/archive/](./conductor/archive/).*
