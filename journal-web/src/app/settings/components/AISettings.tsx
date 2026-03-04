"use client";

import { useEffect, useState } from "react";

type FormState = {
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function AISettings() {
  const [form, setForm] = useState<FormState>({ aiBaseUrl: "", aiModel: "", aiApiKey: "" });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/user/ai-settings", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as {
            aiBaseUrl: string | null;
            aiModel: string | null;
            aiApiKey: string | null;
          };
          setForm({
            aiBaseUrl: data.aiBaseUrl ?? "",
            aiModel: data.aiModel ?? "",
            aiApiKey: data.aiApiKey ?? "",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaveState("saving");
    setErrorMsg(null);
    try {
      const response = await fetch("/api/user/ai-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiBaseUrl: form.aiBaseUrl || null,
          aiModel: form.aiModel || null,
          aiApiKey: form.aiApiKey || null,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save AI settings.");
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Unexpected error.");
      setSaveState("error");
    }
  };

  if (loading) {
    return <p className="text-sm text-[--muted]">Loading…</p>;
  }

  return (
    <div className="space-y-4 rounded-xl border border-[--border-soft] bg-[--panel] p-4">
      <p className="text-sm text-[--muted]">
        Override the operator defaults for your session. Leave a field blank to fall back to the server environment variable.
      </p>

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[--muted]">Base URL</span>
          <input
            type="url"
            value={form.aiBaseUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, aiBaseUrl: e.target.value }))}
            placeholder="e.g. http://localhost:11434/v1"
            className="w-full rounded-lg border border-[--border-soft] bg-[--surface] px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted] focus:outline-none focus:ring-2 focus:ring-[--accent]"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[--muted]">Model</span>
          <input
            type="text"
            value={form.aiModel}
            onChange={(e) => setForm((prev) => ({ ...prev, aiModel: e.target.value }))}
            placeholder="e.g. mistral:latest"
            className="w-full rounded-lg border border-[--border-soft] bg-[--surface] px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted] focus:outline-none focus:ring-2 focus:ring-[--accent]"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[--muted]">API Key</span>
          <input
            type="password"
            value={form.aiApiKey}
            onChange={(e) => setForm((prev) => ({ ...prev, aiApiKey: e.target.value }))}
            placeholder="Leave blank to clear stored key"
            className="w-full rounded-lg border border-[--border-soft] bg-[--surface] px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted] focus:outline-none focus:ring-2 focus:ring-[--accent]"
          />
        </label>
      </div>

      {saveState === "error" && errorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => { void handleSave(); }}
        disabled={saveState === "saving"}
        className="rounded-lg bg-[--accent] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
      >
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved!" : "Save"}
      </button>
    </div>
  );
}
