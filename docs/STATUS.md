# Status

**Current phase:** 0 — Setup ✅ complete (2026-09-24)

## Done

- pnpm workspace: `apps/web` (Next 16.3.6, moved from repo root), `apps/api` (Hono), `packages/shared`.
- Strict TS via `tsconfig.base.json`; ESLint per package; Prettier at root; root `check` script.
- Docker Compose Postgres 18 (localhost-only, healthchecked); `.env.example`; API env validated with Zod.
- API: `GET /health` (liveness), explicit CORS for `WEB_ORIGIN`, shared error shape, 404 + error handlers.
- Web: blank shell replacing the create-next-app page.
- Tests: 7 API tests (health, 404 shape, CORS allow/deny, env parsing).

## Next

- Phase 1: Drizzle schema per the data model, first migration, DB client, DB readiness in `/health`.

## Known issues / open questions

- **CLAUDE.md appears truncated at the top:** there is no product, stack or layout section, and the
  Phase 6 "acceptance test" is never defined. The stack was inferred (see DECISIONS 001). The
  acceptance flow must be defined before Phase 6.
- The local machine runs Node 25, which is past end of life. Everything works on it, but Node 24 LTS is the target.
- ESLint 9 is EOL but still required by `eslint-config-next`'s plugins (DECISIONS 004).
