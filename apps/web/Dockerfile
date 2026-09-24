# syntax=docker/dockerfile:1
# Web image (Next.js standalone output). Build from the repo root: docker build -f apps/web/Dockerfile .

FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter "@gbt/web..."
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
# The /api/* rewrite to the API is fixed at build time (next.config.ts), so the API's address
# on the internal network is a build argument. Fonts are fetched from Google Fonts here too.
ARG API_INTERNAL_URL=http://api:8787
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
RUN pnpm --filter @gbt/web build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/manifest.webmanifest').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "apps/web/server.js"]
