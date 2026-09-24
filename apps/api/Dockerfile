# syntax=docker/dockerfile:1
# API image. Build from the repo root: docker build -f apps/api/Dockerfile .
# The API runs its TypeScript through tsx (DECISIONS 023) and keeps the repo layout, because the
# migrations and pinned data are found relative to the source files.

FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

# Production dependencies for the API and the workspace package it uses.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod --filter "@gbt/api..."

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY apps/api/drizzle ./apps/api/drizzle
COPY apps/api/src ./apps/api/src
# The pinned MorphGNT and Dodson files and their licences, for the release step's import.
COPY data ./data
WORKDIR /app/apps/api
USER node
EXPOSE 8787
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.API_PORT || 8787) + '/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
# `release` (migrate, import, seed) runs as a one-off with: node --import tsx src/scripts/release.ts
CMD ["node", "--import", "tsx", "src/index.ts"]
