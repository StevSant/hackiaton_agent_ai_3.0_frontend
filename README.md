# hackiaton_agent_ai_3.0_frontend

Frontend Angular (standalone + signals) + TailwindCSS de **Centinela IA** — detector de posibles fraudes en siniestros para el reto Aseguradora del Sur (hackIAthon 2026). Ver [`CLAUDE.md`](./CLAUDE.md) para las convenciones de desarrollo.

## Prerrequisitos

- Node.js 20+ (24 recomendado — el script `gen:api` usa `--env-file-if-exists`)
- [`pnpm`](https://pnpm.io/) 10+

## Configuración

```bash
pnpm install
cp .env.example .env             # opcional — sólo si gen:api apunta a un backend distinto al default
```

## Ejecutar

```bash
pnpm dev                         # ng serve en http://localhost:4200
pnpm build                       # build de producción (es el gate de CI — no hay script `lint`)
pnpm watch                       # build de desarrollo con file watching
```

## Generación de tipos de la API

El `/openapi.json` del backend es la **única fuente de verdad** de los tipos cross-stack. Regenera después de cada cambio de schema en el backend:

```bash
pnpm gen:api                     # escribe src/app/core/api/generated/schema.ts
```

`BACKEND_URL` por defecto es `http://localhost:8000`. Se sobreescribe vía env o `.env`.
La carpeta `core/api/generated/` es **read-only** — nunca editar a mano, regenerar.

## Formato

```bash
pnpm format                      # prettier --write
pnpm format:check                # prettier --check
```

## Funcionalidades (rutas)

Bajo `AppShell` (protegidas por `authGuard`):

- `/claims` — triage de siniestros (lista ordenada por score + filtros) y detalle explicable.
- `/agent` — chat con el agente IA (SSE), voz (Whisper + TTS), historial de conversaciones, gráficas ECharts.
- `/fraud-panel` — panel multiagente: 4 especialistas debaten el caso en vivo.
- `/insights` — dashboard ejecutivo: mapa de Ecuador, tendencias, top anomalías.
- `/antifraude` — bandeja de escalados + investigación (rol `antifraude`).
- `/network` — grafo de relaciones asegurado ↔ proveedor ↔ siniestro (rol `antifraude`).
- `/providers`, `/asegurados` — vistas maestras + detalle.
- `/alerts` — catálogo de reglas FS/RF.
- `/audit` — bitácora de auditoría (rol `antifraude`).
- `/uploads` — wizard de importación de siniestros + subida de documentos.
- `/settings` — preferencias.

`/` y `/landing` → página de aterrizaje pública. `/auth/login` → login (JWT local V0).

## Estructura

Ver [`CLAUDE.md §3`](./CLAUDE.md) para la arquitectura. El esqueleto:

- `src/app/core/` — singletons (auth, api, realtime/SSE, config, errores, interceptors, guards)
- `src/app/shared/` — primitivas cross-feature (ui/, pipes/, directives/, utils/)
- `src/app/features/` — slices verticales: `claims`, `agent`, `fraud-panel`, `insights`, `antifraude`, `network`, `providers`, `asegurados`, `alerts`, `audit`, `uploads`, `auth`, `settings`, `landing`
- `src/app/layouts/` — `AppShell`, `AuthShell`
- `src/app/app.config.ts` — `provideRouter`, `provideHttpClient(withFetch(), withInterceptors([...]))`, `provideAnimationsAsync`
- `src/app/app.routes.ts` — rutas lazy bajo `AppShell` + flujo de auth bajo `AuthShell`
