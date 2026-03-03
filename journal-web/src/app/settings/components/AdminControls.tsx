"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type GratitudePromptAdmin = {
  id: string;
  text: string;
  isActive: boolean;
};

type CreativePersonaAdmin = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

type SectionState<T> = {
  loading: boolean;
  error: string | null;
  items: T[];
};

const INITIAL_STATE: SectionState<never> = {
  loading: true,
  error: null,
  items: [],
};

export function AdminControls() {
  const [promptState, setPromptState] = useState<SectionState<GratitudePromptAdmin>>({
    ...INITIAL_STATE,
    items: [],
  });
  const [personaState, setPersonaState] = useState<SectionState<CreativePersonaAdmin>>({
    ...INITIAL_STATE,
    items: [],
  });

  const refreshPrompts = useCallback(async () => {
    setPromptState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch("/api/admin/prompts/gratitude", { cache: "no-store" });
      if (response.status === 401) {
        throw new Error("Unlock your journal to manage prompts.");
      }
      if (!response.ok) {
        throw new Error("Unable to load gratitude prompts.");
      }
      const data = (await response.json()) as { prompts: GratitudePromptAdmin[] };
      setPromptState({ loading: false, error: null, items: data.prompts });
    } catch (error) {
      setPromptState({
        loading: false,
        items: [],
        error:
          error instanceof Error ? error.message : "Unexpected error loading prompts.",
      });
    }
  }, []);

  const refreshPersonas = useCallback(async () => {
    setPersonaState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch("/api/admin/prompts/creative-personas", {
        cache: "no-store",
      });
      if (response.status === 401) {
        throw new Error("Unlock your journal to manage creative personas.");
      }
      if (!response.ok) {
        throw new Error("Unable to load personas.");
      }
      const data = (await response.json()) as { personas: CreativePersonaAdmin[] };
      setPersonaState({ loading: false, error: null, items: data.personas });
    } catch (error) {
      setPersonaState({
        loading: false,
        items: [],
        error:
          error instanceof Error ? error.message : "Unexpected error loading personas.",
      });
    }
  }, []);

  useEffect(() => {
    void refreshPrompts();
    void refreshPersonas();
  }, [refreshPrompts, refreshPersonas]);

  const activePromptCount = useMemo(
    () => promptState.items.filter((prompt) => prompt.isActive).length,
    [promptState.items],
  );
  const activePersonaCount = useMemo(
    () => personaState.items.filter((persona) => persona.isActive).length,
    [personaState.items],
  );

  const togglePrompt = async (prompt: GratitudePromptAdmin) => {
    const nextState = !prompt.isActive;
    setPromptState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === prompt.id ? { ...item, isActive: nextState } : item,
      ),
    }));
    try {
      const response = await fetch("/api/admin/prompts/gratitude", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: prompt.id, isActive: nextState }),
      });
      if (!response.ok) {
        throw new Error("Unable to update prompt.");
      }
    } catch (error) {
      setPromptState((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === prompt.id ? { ...item, isActive: !nextState } : item,
        ),
        error:
          error instanceof Error ? error.message : "Failed to toggle prompt status.",
      }));
    }
  };

  const togglePersona = async (persona: CreativePersonaAdmin) => {
    const nextState = !persona.isActive;
    setPersonaState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === persona.id ? { ...item, isActive: nextState } : item,
      ),
    }));
    try {
      const response = await fetch("/api/admin/prompts/creative-personas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: persona.id, isActive: nextState }),
      });
      if (!response.ok) {
        throw new Error("Unable to update persona.");
      }
    } catch (error) {
      setPersonaState((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === persona.id ? { ...item, isActive: !nextState } : item,
        ),
        error:
          error instanceof Error ? error.message : "Failed to toggle persona status.",
      }));
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-[--foreground]">In-App Admin</h2>
        <p className="text-sm text-[--muted]">
          Toggle gratitude prompts and creative personas without touching the database.
        </p>
      </div>

      <AdminSection
        title="Gratitude Prompts"
        description={`${activePromptCount} active · ${promptState.items.length} total`}
        state={promptState}
        onRefresh={refreshPrompts}
        renderItem={(prompt) => (
          <li
            key={prompt.id}
            className="flex flex-col gap-2 rounded-lg border border-[--border-soft] bg-[--surface] p-3 text-sm text-[--foreground] md:flex-row md:items-center md:justify-between"
          >
            <p className="md:flex-1">{prompt.text}</p>
            <button
              type="button"
              onClick={() => {
                void togglePrompt(prompt);
              }}
              className={`w-full rounded-md px-3 py-1 text-xs font-semibold md:w-auto ${
                prompt.isActive
                  ? "bg-[--accent-soft] text-[--accent-strong]"
                  : "bg-[--panel] text-[--muted]"
              } transition hover:opacity-80`}
            >
              {prompt.isActive ? "Active" : "Hidden"}
            </button>
          </li>
        )}
      />

      <AdminSection
        title="Creative Personas"
        description={`${activePersonaCount} active · ${personaState.items.length} total`}
        state={personaState}
        onRefresh={refreshPersonas}
        renderItem={(persona) => (
          <li
            key={persona.id}
            className="rounded-lg border border-[--border-soft] bg-[--surface] p-3 text-sm text-[--foreground]"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="md:flex-1">
                <p className="font-semibold">{persona.name}</p>
                <p className="text-xs text-[--muted]">{persona.description}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void togglePersona(persona);
                }}
                className={`w-full rounded-md px-3 py-1 text-xs font-semibold md:w-auto ${
                  persona.isActive
                    ? "bg-[--accent-soft] text-[--accent-strong]"
                    : "bg-[--panel] text-[--muted]"
                } transition hover:opacity-80`}
              >
                {persona.isActive ? "Active" : "Hidden"}
              </button>
            </div>
          </li>
        )}
      />
    </section>
  );
}

type AdminSectionProps<T> = {
  title: string;
  description: string;
  state: SectionState<T>;
  onRefresh: () => Promise<void>;
  renderItem: (item: T) => React.ReactNode;
};

function AdminSection<T>({
  title,
  description,
  state,
  onRefresh,
  renderItem,
}: AdminSectionProps<T>) {
  return (
    <div className="space-y-3 rounded-xl border border-[--border-soft] bg-[--panel] p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-[--foreground]">{title}</p>
          <p className="text-xs font-medium uppercase tracking-wider text-[--muted]">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void onRefresh();
          }}
          className="self-start rounded-lg border border-[--border-soft] bg-[--surface] px-3 py-1.5 text-xs font-semibold text-[--foreground] transition hover:bg-[--accent-soft]"
        >
          Refresh
        </button>
      </div>

      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.loading ? (
        <p className="text-sm text-[--muted]">Loading…</p>
      ) : state.items.length === 0 ? (
        <p className="text-sm text-[--muted]">No records found.</p>
      ) : (
        <ul className="space-y-2">{state.items.map((item) => renderItem(item))}</ul>
      )}
    </div>
  );
}
