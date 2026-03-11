FROM node:20-alpine AS base

# ── deps ──────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── builder ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Dummy env vars for build time (real values injected at runtime via Secret Manager)
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV AUTH_SECRET=build-time-placeholder-secret-32chars!!
ENV NEXTAUTH_URL=http://localhost:3000
ENV OPENAI_API_KEY=sk-dummy-build-time-key

# Supabase public vars — anon key is intentionally public (safe to bake in)
ENV NEXT_PUBLIC_SUPABASE_URL=https://wwoprgtzbwknhilfuwuo.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3b3ByZ3R6YndrbmhpbGZ1d3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTk4MzgsImV4cCI6MjA4ODM5NTgzOH0.hPgYZrSl6MjcFTA009TOvjNV6e869mACECs8DynN6xk

# Feature flags (baked in at build time)
ENV ENABLE_RAG=true
ENV ENABLE_KNOWLEDGE_BASE=true
ENV ENABLE_HYBRID_SEARCH=false
ENV ENABLE_RISK_ANALYSIS=false
ENV ENABLE_MULTI_STEP_AGENT=false

# Build Next.js (standalone)
RUN npm run build

# ── runner ────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
# Force Prisma to use OpenSSL 3.x compatible binary (Alpine Linux)
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node

RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
