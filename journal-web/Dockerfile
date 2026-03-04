# syntax=docker/dockerfile:1.8

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# Compile seed.ts → prisma/compiled/seed.js (no ts-node needed at runtime)
RUN printf '{"compilerOptions":{"module":"commonjs","target":"ES2017","esModuleInterop":true,"skipLibCheck":true,"rootDir":"prisma","outDir":"prisma/compiled","moduleResolution":"node","strict":false},"files":["prisma/seed.ts"]}' \
    > ./seed.tsconfig.json \
  && node_modules/.bin/tsc -p ./seed.tsconfig.json

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001 \
  && mkdir -p /data && chown nextjs:nodejs /data

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json

# Prisma CLI (build/index.js) + engines
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Prisma schema, migrations, pre-compiled seed
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/prisma/migrations ./prisma/migrations
COPY --from=builder /app/prisma/compiled/seed.js ./prisma/seed.js

# Entrypoint
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3003
ENV PORT=3003
ENTRYPOINT ["./entrypoint.sh"]
