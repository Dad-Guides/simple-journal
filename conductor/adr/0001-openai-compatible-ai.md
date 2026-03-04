# ADR-0001: Abstract AI Integration to OpenAI-Compatible API

**Date:** 2026-03-03
**Status:** Accepted
**Deciders:** Operator, Claude Sonnet 4.6

## Context

The creative prompt generation feature originally called Ollama's native API: `POST /api/generate` with a `{ model, prompt, stream: false }` body. This was Ollama-specific and coupled the application to a single AI provider. The goal is for the app to support any AI provider a self-hoster might already have.

## Options Considered

1. **Keep Ollama-specific API** — Simple, no changes to the call pattern. But retains a hard dependency on Ollama and private URL defaults. Unsuitable for a public repo targeting diverse operators.

2. **OpenAI-compatible chat completions** — Use `POST {AI_BASE_URL}/chat/completions` with `{ model, messages, stream: false }`. Response: `choices[0].message.content`. This format is natively supported by: Ollama (`/v1/`), OpenAI, Google Gemini (via `generativelanguage.googleapis.com/v1beta/openai`), LM Studio, and others.

3. **Multi-provider abstraction layer** — Implement a provider-aware client that handles Ollama-native, OpenAI, and other protocols differently. More flexible, but substantially more complex for a single-user personal app.

## Decision

**Option 2 — OpenAI-compatible chat completions.**

Rationale:
- Ollama itself supports the `/v1/chat/completions` endpoint (as of Ollama 0.1.24+), so existing Ollama users experience no functional change.
- A single code path handles all providers; the operator sets `AI_BASE_URL`, `AI_MODEL`, and optionally `AI_API_KEY`.
- Minimal change from the existing code: same fetch call structure, different URL path and response shape.

## Consequences

- **Easier:** Any operator using Ollama, Gemini, OpenAI, LM Studio, or any compatible provider can use the app without code changes.
- **Harder:** Operators running Ollama versions older than 0.1.24 (which don't expose `/v1/`) must upgrade. This is an acceptable trade-off given the public release context.
- **Accepted risk:** If a provider's OpenAI-compatible layer has subtle differences in the response shape, the defensive parse (`choices?.[0]?.message?.content ?? ""`) will gracefully fall back to the "AI unavailable" fallback prompt path.
