#!/bin/sh
set -e

# ── Auto-generate JWT_SECRET if not provided ─────────────────────────────────
if [ -z "$JWT_SECRET" ]; then
  SECRET_FILE="/data/jwt_secret"
  if [ ! -f "$SECRET_FILE" ]; then
    openssl rand -hex 32 > "$SECRET_FILE"
    echo "[simple-journal] Generated new JWT_SECRET (stored in /data)"
  fi
  export JWT_SECRET="$(cat "$SECRET_FILE")"
fi

# ── Database migrations ───────────────────────────────────────────────────────
echo "[simple-journal] Applying database migrations..."
node node_modules/prisma/build/index.js migrate deploy

# ── Seed database ─────────────────────────────────────────────────────────────
echo "[simple-journal] Seeding database..."
node prisma/seed.js || echo "[simple-journal] Seed skipped (already seeded)"

# ── Start server ──────────────────────────────────────────────────────────────
exec node server.js
