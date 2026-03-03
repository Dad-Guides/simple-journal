"use client";

import Link from "next/link";
import { Flame, Heart, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TabId = "anger" | "gratitude" | "creative";
type EntryTypeValue = "ANGER" | "GRATITUDE" | "CREATIVE";
type JournalEntryDto = {
  id: string;
  title: string;
  entryType: EntryTypeValue;
  bodyMarkdown: string;
  createdAt: string;
  angerReason?: string | null;
  gratitudePromptId?: string | null;
  creativePromptId?: string | null;
  gratitudePrompt?: {
    id: string;
    promptText: string;
  } | null;
  creativePrompt?: {
    id: string;
    promptText: string;
  } | null;
};

type GratitudePromptDto = {
  id: string;
  text: string;
};

type CreativePersonaDto = {
  id: string;
  name: string;
  description: string;
};

type CreativePromptDto = {
  id: string;
  text: string;
  personas: CreativePersonaDto[];
  fromOllama: boolean;
};

const TABS: { id: TabId; label: string; description: string }[] = [
  {
    id: "anger",
    label: "🤬 Anger",
    description: "Guided, ultra-fast release.",
  },
  {
    id: "gratitude",
    label: "🥰 Gratitude",
    description: "One joyful reflection at a time.",
  },
  {
    id: "creative",
    label: "✍️ Creative",
    description: "Markdown stories + AI prompts.",
  },
];

const ENTRY_EMOJI_BY_TYPE: Record<EntryTypeValue, string> = {
  ANGER: "🤬",
  GRATITUDE: "🥰",
  CREATIVE: "✍️",
};

const HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

type AuthState = {
  loading: boolean;
  authenticated: boolean;
  hasPasscode: boolean;
  error?: string | null;
};

type EntryFormProps = {
  onEntrySaved: () => void;
};

type HistoryPreviewProps = {
  refreshKey: number;
};

type HistoryMeta = {
  page: number;
  pageSize: number;
  total: number;
};

const HISTORY_PAGE_SIZE = 10;

function useShortcut(letter: string, handler: () => void) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === letter
      ) {
        event.preventDefault();
        handler();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handler, letter]);
}

type FormStatus = {
  message: string;
  tone: "success" | "error";
};

type CreateEntryPayload = {
  entryType: TabId;
  bodyMarkdown?: string;
  angerReason?: string | null;
  gratitudePromptId?: string | null;
  creativePromptId?: string | null;
};

async function createEntry(payload: CreateEntryPayload): Promise<JournalEntryDto> {
  const response = await fetch("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as {
    entry?: JournalEntryDto;
    error?: string;
  };

  if (!response.ok || !data.entry) {
    throw new Error(data.error ?? "Unable to save entry.");
  }

  return data.entry;
}

function StatusBanner({ status }: { status: FormStatus | null }) {
  if (!status) return null;

  const toneClasses =
    status.tone === "success"
      ? "border-green-200 bg-green-50 text-green-800 dark:border-green-600/30 dark:bg-green-500/10 dark:text-green-300"
      : "border-red-200 bg-red-50 text-red-800 dark:border-red-600/30 dark:bg-red-500/10 dark:text-red-300";

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${toneClasses}`}>
      {status.message}
    </div>
  );
}

function formatEntryTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return HISTORY_DATE_FORMATTER.format(date);
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("anger");
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [authState, setAuthState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    hasPasscode: false,
    error: null,
  });

  const loadAuth = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch("/api/auth/status", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to check session.");
      }
      const data = (await response.json()) as {
        authenticated: boolean;
        hasPasscode: boolean;
      };
      setAuthState({
        loading: false,
        authenticated: data.authenticated,
        hasPasscode: data.hasPasscode,
        error: null,
      });
    } catch (error) {
      setAuthState({
        loading: false,
        authenticated: false,
        hasPasscode: false,
        error: error instanceof Error ? error.message : "Failed to load session.",
      });
    }
  }, []);

  useEffect(() => {
    void loadAuth();
  }, [loadAuth]);

  const handleAuthenticated = useCallback(() => {
    setAuthState({
      loading: false,
      authenticated: true,
      hasPasscode: true,
      error: null,
    });
  }, []);

  if (authState.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-slate-700">
        <div className="rounded-3xl border border-black/10 bg-white/90 px-10 py-8 text-center shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Checking passcode
          </p>
          <p className="mt-3 text-lg text-slate-700">
            Hang tight while we confirm your private session.
          </p>
        </div>
      </div>
    );
  }

  if (!authState.authenticated) {
    return (
      <PasscodeGate
        hasPasscode={authState.hasPasscode}
        onAuthenticated={handleAuthenticated}
        statusError={authState.error}
        refetchStatus={loadAuth}
      />
    );
  }

  return (
    <div className="text-[--foreground] antialiased">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 p-4 md:p-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-[--foreground] md:text-5xl">
            A quiet space.
          </h1>
          <p className="text-lg text-[--muted]">
            Choose a journal to begin your session.
          </p>
        </header>

        <nav className="flex flex-wrap gap-3 rounded-2xl bg-[--panel] p-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const activeColor =
              tab.id === "anger"
                ? "var(--anger)"
                : tab.id === "gratitude"
                  ? "var(--gratitude)"
                  : "var(--creative)";

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-[150px] flex-1 flex-col rounded-xl border-2 px-4 py-3 text-left transition-all duration-150 ease-in-out ${
                  isActive
                    ? "border-transparent text-white"
                    : "border-transparent text-[--muted] hover:border-[--border-soft] hover:bg-[--surface]"
                }`}
                style={{
                  backgroundColor: isActive ? activeColor : undefined,
                }}
              >
                <span className="text-base font-semibold">{tab.label}</span>
                <span
                  className={`text-sm ${
                    isActive ? "text-white/80" : ""
                  }`}
                >
                  {tab.description}
                </span>
              </button>
            );
          })}
        </nav>

        <section>
          {activeTab === "anger" && (
            <AngerEntry
              onEntrySaved={() => setHistoryRefresh((count) => count + 1)}
            />
          )}
          {activeTab === "gratitude" && (
            <GratitudeEntry
              onEntrySaved={() => setHistoryRefresh((count) => count + 1)}
            />
          )}
          {activeTab === "creative" && (
            <CreativeEntry
              onEntrySaved={() => setHistoryRefresh((count) => count + 1)}
            />
          )}
        </section>

        <HistoryPreview refreshKey={historyRefresh} />
      </main>
    </div>
  );
}

function AngerEntry({ onEntrySaved }: EntryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [reason, setReason] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const requestSubmit = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  useShortcut("a", requestSubmit);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    try {
      setSaving(true);
      const entry = await createEntry({
        entryType: "anger",
        bodyMarkdown: body,
        angerReason: reason,
      });
      setStatus({
        tone: "success",
        message: `Saved ${entry.title}`,
      });
      setReason("");
      setBody("");
      onEntrySaved();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to save anger entry.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-[--border-soft] bg-[--surface] p-6"
    >
      <div className="space-y-1">
        <p className="text-sm font-medium text-[--muted]">
          Guided prompt
        </p>
        <p className="text-xl font-semibold text-[--foreground]">
          “I am angry because I care about…”
        </p>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[--muted]">
          Fill in the blank
        </span>
        <input
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="my boundaries being ignored"
          className="rounded-lg border border-[--border-soft] bg-[--background] px-4 py-2 text-base font-medium text-[--foreground] outline-none transition focus:border-[--anger] focus:ring-2 focus:ring-[--anger]/20"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[--muted]">
          Expand the feeling (optional)
        </span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          placeholder="Let it all out in the long-form box..."
          className="rounded-lg border border-[--border-soft] bg-[--background] px-4 py-2 text-base leading-relaxed text-[--foreground] outline-none transition focus:border-[--anger] focus:ring-2 focus:ring-[--anger]/20"
        />
      </label>
      <StatusBanner status={status} />
      <div className="flex flex-col gap-4 text-sm text-[--muted] md:flex-row md:items-center md:justify-between">
        <p>Shortcut: <span className="font-semibold">Ctrl/Cmd + Shift + A</span></p>
        <button
          type="submit"
          disabled={saving}
          style={{ backgroundColor: "var(--anger)" }}
          className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Anger Entry"}
        </button>
      </div>
    </form>
  );
}

function GratitudeEntry({ onEntrySaved }: EntryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [prompt, setPrompt] = useState<GratitudePromptDto | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const requestSubmit = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  useShortcut("g", requestSubmit);

  const fetchPrompt = useCallback(async () => {
    setPromptLoading(true);
    setPromptError(null);
    try {
      const response = await fetch("/api/prompts/gratitude/random", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        prompt?: { id: string; text: string };
        error?: string;
      };
      if (!response.ok || !data.prompt) {
        throw new Error(data.error ?? "Unable to load gratitude prompt.");
      }
      setPrompt({ id: data.prompt.id, text: data.prompt.text });
    } catch (error) {
      setPrompt(null);
      setPromptError(
        error instanceof Error
          ? error.message
          : "Unexpected error loading prompt.",
      );
    } finally {
      setPromptLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPrompt();
  }, [fetchPrompt]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    try {
      setSaving(true);
      const entry = await createEntry({
        entryType: "gratitude",
        bodyMarkdown: reflection,
        gratitudePromptId: prompt?.id,
      });
      setStatus({
        tone: "success",
        message: `Saved ${entry.title}`,
      });
      setReflection("");
      onEntrySaved();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save gratitude entry.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-[--border-soft] bg-[--surface] p-6"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[--muted]">
            Random prompt
          </p>
          <p className="text-xl font-semibold text-[--foreground]">
            {prompt?.text ?? "Fetching something to appreciate…"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void fetchPrompt();
          }}
          disabled={promptLoading}
          className="self-start rounded-lg border border-[--border-soft] bg-[--background] px-4 py-2 text-sm font-semibold text-[--foreground] transition hover:bg-[--accent-soft] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {promptLoading ? "Loading…" : "New Prompt"}
        </button>
      </div>
      {promptError ? (
        <p className="text-sm text-red-600">{promptError}</p>
      ) : null}
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[--muted]">
          Your reflection
        </span>
        <textarea
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          rows={5}
          placeholder="Jot down a few warm sentences…"
          className="rounded-lg border border-[--border-soft] bg-[--background] px-4 py-2 text-base leading-relaxed text-[--foreground] outline-none transition focus:border-[--gratitude] focus:ring-2 focus:ring-[--gratitude]/20"
        />
      </label>
      <StatusBanner status={status} />
      <div className="flex flex-col gap-4 text-sm text-[--muted] md:flex-row md:items-center md:justify-between">
        <p>Shortcut: <span className="font-semibold">Ctrl/Cmd + Shift + G</span></p>
        <button
          type="submit"
          disabled={saving}
          style={{ backgroundColor: "var(--gratitude)" }}
          className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Gratitude Entry"}
        </button>
      </div>
    </form>
  );
}

function CreativeEntry({ onEntrySaved }: EntryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [personas, setPersonas] = useState<CreativePersonaDto[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [personasLoading, setPersonasLoading] = useState(true);
  const [personasError, setPersonasError] = useState<string | null>(null);
  const [promptState, setPromptState] = useState<CreativePromptDto | null>(null);
  const [promptNotice, setPromptNotice] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<
    "unknown" | "online" | "offline"
  >("unknown");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const requestSubmit = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  useShortcut("c", requestSubmit);

  const loadPersonas = useCallback(async () => {
    setPersonasLoading(true);
    setPersonasError(null);
    try {
      const response = await fetch("/api/prompts/creative/personas", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        personas?: CreativePersonaDto[];
        error?: string;
      };
      if (!response.ok || !data.personas) {
        throw new Error(data.error ?? "Unable to load personas.");
      }
      const serverPersonas = data.personas;
      setPersonas(serverPersonas);
      setSelectedPersonas((current) => {
        const stillValid = current.filter((id) =>
          serverPersonas.some((persona) => persona.id === id),
        );
        if (stillValid.length > 0) {
          return stillValid;
        }
        return serverPersonas.length > 0 ? [serverPersonas[0].id] : [];
      });
    } catch (error) {
      setPersonas([]);
      setSelectedPersonas([]);
      setPersonasError(
        error instanceof Error ? error.message : "Unable to fetch personas.",
      );
    } finally {
      setPersonasLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPersonas();
  }, [loadPersonas]);

  const togglePersona = (id: string) => {
    setSelectedPersonas((current) => {
      const isActive = current.includes(id);
      if (isActive) {
        return current.filter((persona) => persona !== id);
      }
      return [...current, id];
    });
    setPromptState(null);
    setPromptNotice(null);
    setPromptError(null);
  };

  const personaSummary = useMemo(() => {
    const selected = personas.filter((persona) =>
      selectedPersonas.includes(persona.id),
    );
    return selected.map((persona) => persona.name).join(", ");
  }, [personas, selectedPersonas]);

  const generatePrompt = async () => {
    if (selectedPersonas.length === 0) {
      setPromptState(null);
      setPromptNotice(null);
      setPromptError("Choose at least one persona to shape the prompt.");
      return;
    }

    setPromptLoading(true);
    setPromptError(null);
    setPromptNotice(null);
    setOllamaStatus("unknown");
    try {
      const response = await fetch("/api/prompts/creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaIds: selectedPersonas }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        prompt?: CreativePromptDto;
        error?: string;
      };
      if (!response.ok || !data.prompt) {
        throw new Error(data.error ?? "Unable to generate prompt.");
      }
      setPromptState(data.prompt);
      setPromptNotice(
        data.prompt.fromOllama
          ? "Generated via local Ollama."
          : "Fallback prompt saved while Ollama is offline.",
      );
      setOllamaStatus(data.prompt.fromOllama ? "online" : "offline");
    } catch (error) {
      setPromptState(null);
      setPromptNotice(null);
      setPromptError(
        error instanceof Error
          ? error.message
          : "Unexpected error while generating prompt.",
      );
      setOllamaStatus("offline");
    } finally {
      setPromptLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    if (!promptState) {
      setStatus({
        tone: "error",
        message: "Generate a prompt first so we can link it to your entry.",
      });
      return;
    }
    try {
      setSaving(true);
      const entry = await createEntry({
        entryType: "creative",
        bodyMarkdown: body,
        creativePromptId: promptState.id,
      });
      setStatus({
        tone: "success",
        message: `Saved ${entry.title}`,
      });
      setBody("");
      onEntrySaved();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to save creative entry.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-[--border-soft] bg-[--surface] p-6"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[--muted]">
            Personas
          </p>
          <button
            type="button"
            onClick={() => {
              void loadPersonas();
            }}
            disabled={personasLoading}
            className="text-xs font-semibold text-[--accent] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {personasLoading ? "Refreshing…" : "Refresh List"}
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {personasLoading ? (
            <p className="text-sm text-[--muted]">Loading personas…</p>
          ) : personas.length === 0 ? (
            <p className="text-sm text-red-600">
              {personasError ??
                "No personas available. Seed the DB to enable creative mode."}
            </p>
          ) : (
            personas.map((persona) => {
              const isActive = selectedPersonas.includes(persona.id);
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => togglePersona(persona.id)}
                  className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
                    isActive
                      ? "border-[--creative] bg-[--creative]/10"
                      : "border-[--border-soft] bg-[--background] hover:border-[--border-soft]"
                  }`}
                >
                  <span className="block text-base font-semibold text-[--foreground]">{persona.name}</span>
                  <span
                    className={`text-sm ${
                      isActive ? "text-[--creative]" : "text-[--muted]"
                    }`}
                  >
                    {persona.description}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {personasError && personas.length > 0 ? (
          <p className="text-sm text-red-600">{personasError}</p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-xl border-2 border-dashed border-[--creative]/30 bg-[--creative]/5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[--creative]">
              AI Prompt
            </p>
            <p className="mt-1 inline-flex items-center gap-2 text-xs font-medium text-[--muted]">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  ollamaStatus === "online"
                    ? "bg-green-500"
                    : ollamaStatus === "offline"
                      ? "bg-red-500"
                      : "bg-yellow-400"
                }`}
                aria-hidden
              />
              {ollamaStatus === "online"
                ? "Ollama online"
                : ollamaStatus === "offline"
                  ? "Ollama offline (using fallback)"
                  : "Checking Ollama…"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void generatePrompt();
            }}
            disabled={promptLoading || personas.length === 0}
            className="self-start rounded-lg bg-[--creative] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {promptLoading ? "Generating…" : "Generate Prompt"}
          </button>
        </div>
        <div className="rounded-lg border border-[--creative]/20 bg-[--surface] px-4 py-3 text-sm text-[--foreground]">
          <p className="whitespace-pre-line">
            {promptState?.text ??
              "Tap “Generate prompt” to ask the internal Ollama instance for a tailored idea."}
          </p>
        </div>
        {promptNotice ? (
          <p className="text-xs font-medium text-[--creative]">
            {promptNotice}
          </p>
        ) : null}
        {promptError ? (
          <p className="text-sm text-red-600">{promptError}</p>
        ) : null}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[--muted]">
          Markdown Entry
        </span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={8}
          placeholder="Use Markdown (### headings, **bold**, lists) to expand on the prompt."
          className="rounded-lg border border-[--border-soft] bg-[--background] px-4 py-2 font-mono text-sm leading-relaxed text-[--foreground] outline-none transition focus:border-[--creative] focus:ring-2 focus:ring-[--creative]/20"
        />
      </label>
      <StatusBanner status={status} />
      <div className="flex flex-col gap-4 text-sm text-[--muted] md:flex-row md:items-center md:justify-between">
        <p>Shortcut: <span className="font-semibold">Ctrl/Cmd + Shift + C</span></p>
        <button
          type="submit"
          disabled={saving}
          style={{ backgroundColor: "var(--creative)" }}
          className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Creative Entry"}
        </button>
      </div>
    </form>
  );
}
export function HistoryPreview({ refreshKey }: HistoryPreviewProps) {
  const [entries, setEntries] = useState<JournalEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState<HistoryMeta | null>(null);

  const fetchHistory = useCallback(
    async (pageToLoad: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/entries?page=${pageToLoad}&pageSize=${HISTORY_PAGE_SIZE}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        if (response.status === 401) {
          setEntries([]);
          setMeta(null);
          setError("Unlock your journal to view history.");
          return;
        }
        if (!response.ok) {
          throw new Error("Unable to load entries.");
        }
        const data = (await response.json()) as {
          entries: JournalEntryDto[];
          meta?: HistoryMeta;
        };
        setEntries(data.entries ?? []);
        setMeta(
          data.meta ?? {
            page: pageToLoad,
            pageSize: HISTORY_PAGE_SIZE,
            total: data.entries?.length ?? 0,
          },
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unexpected error while loading history.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [refreshKey]);

  useEffect(() => {
    void fetchHistory(currentPage);
  }, [fetchHistory, currentPage, refreshKey]);

  const totalEntries = meta?.total ?? entries.length;
  const totalPages =
    meta && meta.pageSize > 0 ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;
  const pageStart =
    totalEntries === 0 ? 0 : (meta ? (meta.page - 1) * meta.pageSize + 1 : 1);
  const pageEnd =
    totalEntries === 0
      ? 0
      : meta
        ? Math.min(meta.page * meta.pageSize, meta.total)
        : entries.length;

  let content: React.ReactNode;
  if (loading) {
    content = (
      <p className="text-sm text-[--muted]">Loading your journal history…</p>
    );
  } else if (error) {
    content = (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
        {error}
      </div>
    );
  } else if (entries.length === 0) {
    content = (
      <p className="text-sm text-[--muted]">
        Entries you save will appear here.
      </p>
    );
  } else {
    content = (
      <ul className="space-y-3">
        {entries.map((entry) => {
          const emoji = ENTRY_EMOJI_BY_TYPE[entry.entryType] ?? "📝";
          const trimmed = entry.bodyMarkdown?.trim() ?? "";
          let snippet: string;
          if (trimmed.length > 0) {
            snippet = trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;
          } else if (entry.entryType === "ANGER" && entry.angerReason) {
            snippet = entry.angerReason;
          } else {
            snippet = "No additional text.";
          }
          return (
            <li key={entry.id}>
              <Link
                href={`/entries/${entry.id}`}
                className="group block rounded-lg border border-[--border-soft] bg-[--background] p-4 transition-colors hover:bg-[--accent-soft]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[--foreground]">
                    {emoji} {entry.title}
                  </span>
                  <span className="text-xs font-medium text-[--muted]">
                    {formatEntryTimestamp(entry.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[--muted]">{snippet}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  const canGoPrev = currentPage > 1 && !loading;
  const canGoNext = currentPage < totalPages && !loading;

  return (
    <section className="space-y-6 rounded-2xl border border-[--border-soft] bg-[--surface] p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[--foreground]">
            Recent Entries
          </h2>
          <p className="text-sm text-[--muted]">
            {totalEntries > 0
              ? `Showing ${pageStart}–${pageEnd} of ${totalEntries}`
              : "No entries yet"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={!canGoPrev}
            className="rounded-lg border border-[--border-soft] bg-[--background] px-3 py-1.5 text-sm font-semibold text-[--foreground] transition hover:bg-[--accent-soft] disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => page + 1)}
            disabled={!canGoNext}
            className="rounded-lg border border-[--border-soft] bg-[--background] px-3 py-1.5 text-sm font-semibold text-[--foreground] transition hover:bg-[--accent-soft] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
          <Link
            href="/entries"
            className="rounded-lg border border-[--border-soft] bg-[--background] px-3 py-1.5 text-sm font-semibold text-[--foreground] transition hover:bg-[--accent-soft]"
          >
            View All
          </Link>
        </div>
      </div>

      {content}
    </section>
  );
}

type PasscodeGateProps = {
  hasPasscode: boolean;
  onAuthenticated: () => void;
  statusError?: string | null;
  refetchStatus: () => Promise<void>;
  fetchImpl?: typeof fetch;
};

export function PasscodeGate({
  hasPasscode,
  onAuthenticated,
  statusError,
  refetchStatus,
  fetchImpl,
}: PasscodeGateProps) {
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [mode, setMode] = useState<"set" | "verify">(hasPasscode ? "verify" : "set");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(hasPasscode ? "verify" : "set");
  }, [hasPasscode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!passcode) {
      setError("Enter your passcode.");
      return;
    }

    if (mode === "set" && passcode !== confirmPasscode) {
      setError("Passcodes must match.");
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = mode === "set" ? "/api/auth/set" : "/api/auth/verify";
      const clientFetch = fetchImpl ?? fetch;
      const response = await clientFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Unable to process passcode.");
        if (response.status === 409) {
          await refetchStatus();
        }
        return;
      }

      setSuccessMessage("Session unlocked. Redirecting…");
      setPasscode("");
      setConfirmPasscode("");
      onAuthenticated();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unexpected error. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-2xl border border-[--border-soft] bg-[--surface] p-8 shadow-lg"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-[--foreground]">
            {hasPasscode
              ? "Unlock Simple Journal"
              : "Secure Your Journal"}
          </h1>
          <p className="text-sm text-[--muted]">
            {hasPasscode
              ? "Enter your passcode to continue."
              : "Create a passcode to keep your entries private."}
          </p>
        </div>

        {statusError ? (
          <StatusBanner status={{ tone: "error", message: statusError }} />
        ) : null}

        {error ? (
          <StatusBanner status={{ tone: "error", message: error }} />
        ) : null}

        {successMessage ? (
          <StatusBanner status={{ tone: "success", message: successMessage }} />
        ) : null}

        <div className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[--muted]">
              {hasPasscode ? "Passcode" : "Create Passcode"}
            </span>
            <input
              type="password"
              value={passcode}
              autoFocus
              onChange={(event) => setPasscode(event.target.value)}
              className="rounded-lg border border-[--border-soft] bg-[--background] px-4 py-2 text-base text-[--foreground] outline-none transition focus:border-[--accent] focus:ring-2 focus:ring-[--accent]/20"
              placeholder={hasPasscode ? "Enter your passcode" : "Choose a secret phrase"}
            />
          </label>

          {!hasPasscode ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[--muted]">
                Confirm Passcode
              </span>
              <input
                type="password"
                value={confirmPasscode}
                onChange={(event) => setConfirmPasscode(event.target.value)}
                className="rounded-lg border border-[--border-soft] bg-[--background] px-4 py-2 text-base text-[--foreground] outline-none transition focus:border-[--accent] focus:ring-2 focus:ring-[--accent]/20"
                placeholder="Enter again to confirm"
              />
            </label>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[--accent] px-4 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-[--accent-strong] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Working..."
            : hasPasscode
              ? "Unlock Journal"
              : "Save Passcode"}
        </button>
      </form>
    </div>
  );
}
