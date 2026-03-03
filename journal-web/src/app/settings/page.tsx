import Link from "next/link";
import { AdminControls } from "./components/AdminControls";

const ENV_VARS = [
  {
    name: "DATABASE_URL",
    description: "PostgreSQL connection string used by Prisma.",
  },
  {
    name: "REDIS_URL",
    description: "Redis instance for session caching.",
  },
  {
    name: "OLLAMA_URL",
    description: "Base URL for the internal Ollama API (e.g. http://ollama.tailnet.local:11434).",
  },
  {
    name: "OLLAMA_MODEL",
    description: "Model ID passed to Ollama (mistral:latest, gpt-oss:20b, etc.).",
  },
  {
    name: "JWT_SECRET",
    description: "Secret used to sign the local session cookie.",
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <main className="space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-[--foreground]">
            Settings & Maintenance
          </h1>
          <p className="text-base text-[--muted]">
            Quick reference for connecting Ollama, seeding prompts, and keeping personas in sync.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[--foreground]">Environment Essentials</h2>
          <p className="text-sm text-[--muted]">
            Update <code className="font-semibold text-[--accent]">.env</code> before rebuilding the Docker stack. All values remain on the tailnet.
          </p>
          <div className="space-y-3 rounded-xl border border-[--border-soft] bg-[--surface] p-4">
            {ENV_VARS.map((variable) => (
              <div
                key={variable.name}
                className="rounded-lg border border-[--border-soft] bg-[--panel] p-4"
              >
                <p className="font-mono text-sm font-semibold text-[--foreground]">{variable.name}</p>
                <p className="mt-1 text-sm text-[--muted]">{variable.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[--foreground]">Seeding & Troubleshooting</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-[--border-soft] bg-[--surface] p-4">
              <h3 className="font-semibold text-[--foreground]">Gratitude Prompts</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-[--muted]">
                <li>Edit the array inside <code className="font-semibold text-[--accent]">prisma/seed.ts</code>.</li>
                <li>Run <code className="font-semibold text-[--accent]">npm run db:seed</code> inside <code className="font-semibold text-[--accent]">journal-web</code>.</li>
                <li>Set <code className="font-semibold text-[--accent]">is_active = false</code> to retire prompts.</li>
              </ol>
            </div>
            <div className="space-y-2 rounded-xl border border-[--border-soft] bg-[--surface] p-4">
              <h3 className="font-semibold text-[--foreground]">Creative Personas</h3>
              <p className="text-sm text-[--muted]">
                Also defined in <code className="font-semibold text-[--accent]">prisma/seed.ts</code>. Re-run the seed script after changes.
              </p>
            </div>
             <div className="space-y-2 rounded-xl border border-[--border-soft] bg-[--surface] p-4 md:col-span-2">
              <h3 className="font-semibold text-[--foreground]">Ollama Connection</h3>
              <p className="text-sm text-[--muted]">
                Ensure <code className="font-semibold text-[--accent]">OLLAMA_URL</code> is reachable from the Docker network. Check with: <code className="font-semibold text-[--accent]">docker compose exec journal-web curl $OLLAMA_URL/api/version</code>
              </p>
            </div>
          </div>
        </section>

        <AdminControls />
      </main>
    </div>
  );
}
