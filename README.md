# hackiaton_agent_ai_3.0_frontend

Angular (standalone + signals) + TailwindCSS frontend for the Hackiaton 3.0 Agent AI project. See [`CLAUDE.md`](./CLAUDE.md) for conventions.

## Prerequisites

- Node.js 20+ (24 recommended — the `gen:api` script uses `--env-file-if-exists`)
- [`pnpm`](https://pnpm.io/) 10+

## Setup

```bash
pnpm install
cp .env.example .env             # optional — only needed to point gen:api at a non-default backend
```

## Run

```bash
pnpm dev                         # ng serve on http://localhost:4200
pnpm build                       # production build
pnpm watch                       # dev build with file watching
```

## API types codegen

The backend's `/openapi.json` is the single source of truth for cross-stack types. Regenerate after every backend schema change:

```bash
pnpm gen:api                     # writes src/app/core/api/generated/schema.ts
```

`BACKEND_URL` defaults to `http://localhost:8000`. Override via env or `.env`.

## Formatting

```bash
pnpm format                      # prettier --write
pnpm format:check                # prettier --check
```

## Layout

See [`CLAUDE.md §3`](./CLAUDE.md) for the architecture. The skeleton lays out:

- `src/app/core/` — app-wide singletons (auth, api, realtime, config, errors, interceptors)
- `src/app/shared/` — cross-feature primitives (ui/, pipes/, directives/, utils/)
- `src/app/features/` — vertical slices (chat, auth, uploads, home)
- `src/app/layouts/` — `AppShell`, `AuthShell`
- `src/app/app.config.ts` — `provideRouter`, `provideHttpClient(withFetch(), withInterceptors([...]))`, `provideAnimationsAsync`
- `src/app/app.routes.ts` — lazy-loaded feature routes under `AppShell` + auth flow under `AuthShell`
