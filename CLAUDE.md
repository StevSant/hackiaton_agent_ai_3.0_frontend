# CLAUDE.md — Frontend (Angular)

This file governs everything inside `hackiaton_agent_ai_3.0_frontend/`. Read the [root `CLAUDE.md`](../CLAUDE.md) first for cross-stack rules, and especially **§2 Challenge spec — ground truth** (Aseguradora del Sur). The product spec lives at `docs/superpowers/specs/2026-05-26-centinela-claims-design.md`.

> If you're an AI assistant and you're about to write `*ngIf`, `@Input()`, `NgModule`, `HttpClientModule`, or `BehaviorSubject` for component state — **stop**. This project uses modern Angular. See §2.

---

## 1. Stack

- **Angular** — latest stable, **standalone components only**, **signals-first**.
- **TailwindCSS** — primary styling. Utility-first.
- **Angular Material** — icons (`mat-icon`) and a11y primitives (`@angular/cdk/a11y`, overlay, dialog/snackbar). **Not** the primary component library — we build our own with Tailwind.
- **TypeScript** — strict mode, no `any`.
- **Package manager** — `pnpm`.
- **Generated API types** — `openapi-typescript` against the backend's `/openapi.json`.
- **Force-graph (stretch)** — `force-graph` or `sigma.js` for the relationship network view.

---

## 2. Hard rules for Claude Code (modern Angular only)

- **Standalone components only.** No `NgModule` except where a third-party lib requires one.
- **Signals for state** — `signal()`, `computed()`, `effect()`. Use `toSignal()` to bridge from `Observable`.
- **RxJS only for streams** — HTTP, SSE/WS, debounced inputs. Not for component-local state.
- **Signal inputs/outputs** — `input()`, `input.required()`, `output()`, `model()`. **Not** `@Input()` / `@Output()` decorators.
- **New control flow** — `@if`, `@for` (with `track`), `@switch`, `@defer`. **Not** `*ngIf` / `*ngFor` / `*ngSwitch`.
- **`inject()` over constructor DI** for services. Constructor params are fine when it actually reads better.
- **Functional APIs in `app.config.ts`** — `provideRouter`, `provideHttpClient(withFetch(), withInterceptors([...]))`, `provideAnimationsAsync`. No `RouterModule.forRoot`, no `HttpClientModule`.
- **Functional guards / interceptors** — `CanActivateFn`, `HttpInterceptorFn`. No class-based guards/interceptors.
- **No deprecated APIs.** If you're unsure whether an API is current, consult <https://angular.dev>. Do **not** pattern-match from pre-v17 examples in memory.
- **Spanish UI strings only.** Code, identifiers, comments stay in English. Every user-visible string is Spanish.
- **Never use `"fraude"` as a UI label** without `"posible"`. Use `"posible fraude"`, `"alerta"`, `"requiere revisión"`. The framing is *alerta para revisión*, never *acusación*. Root CLAUDE.md §2.10.

---

## 3. Folder structure

```
src/app/
├── core/                       ← app-wide singletons; provided in app.config.ts
│   ├── api/
│   │   ├── generated/          ← openapi-typescript output — DO NOT EDIT
│   │   └── clients/            ← claims.api.ts, agent.api.ts, reports.api.ts, auth.api.ts (typed wrappers)
│   ├── auth/                   ← auth.store.ts (signals: user, token), token storage (V0)
│   ├── config/                 ← env.ts, runtime config (incl. demoMode flag)
│   ├── interceptors/           ← error.interceptor.ts, auth.interceptor.ts (Bearer header)
│   ├── guards/                 ← auth.guard.ts (CanActivateFn → /login if no token)
│   ├── realtime/               ← SseClient
│   └── errors/                 ← AppError model, error mapping
├── shared/                     ← reusable across features
│   ├── ui/                     ← Button, Card, Spinner, EmptyState, TrafficLightBadge, ScoreBar, RuleChip, CitationChip, RoleBadge (presentational)
│   ├── pipes/                  ← RelativeTimePipe, ScoreColorPipe, …
│   ├── directives/
│   └── utils/
├── features/                   ← vertical slices, lazy-loaded
│   ├── auth/
│   │   ├── pages/              ← LoginPage (V0)
│   │   └── auth.routes.ts
│   ├── claims/
│   │   ├── pages/              ← ClaimsListPage, ClaimDetailPage (smart)
│   │   ├── components/         ← ClaimsTable, FilterBar, ClaimDetailHeader,
│   │   │                          RulesFiredAccordion, MlFactorsAccordion, SimilarNarrativesAccordion,
│   │   │                          AnomalyIndicatorCard, WorkflowActions, WorkflowStatusBadge,
│   │   │                          DebugFechaEdit (Ctrl+Shift+D-revealed fire-test affordance)
│   │   ├── services/           ← ClaimsStore (signal-based), claims.api.ts wrapper
│   │   ├── models/             ← feature-local types (re-exporting from core/api/generated when needed)
│   │   └── claims.routes.ts
│   ├── agent/
│   │   ├── components/         ← ChatPanel, MessageItem, ToolCallCard, AgentStepCard, CitationChip
│   │   ├── services/           ← AgentStore (signal-based), agent.api.ts wrapper
│   │   └── agent.routes.ts     ← (none today; rendered as a right-rail inside claims)
│   ├── network/                ← stretch: NetworkGraphPage + force-graph wrapper
│   │   ├── pages/              ← NetworkGraphPage
│   │   ├── components/         ← ForceGraphView, NodeTooltip
│   │   └── network.routes.ts
│   └── reports/                ← stretch: ExecutiveReportPage + CSV/PDF download
│       ├── pages/              ← ExecutiveReportPage
│       ├── components/         ← ReportTilesGrid, ProviderRanking, RamoDistributionChart, ReportDownloadButton
│       └── reports.routes.ts
├── layouts/                    ← AppShell
├── app.routes.ts               ← top-level lazy-loaded routes
└── app.config.ts               ← providers
```

> **Live feature set (broader than the tree above).** The tree shows the original core slices; the shipped app also has: `fraud-panel/` (multi-agent panel debate, `/fraud-panel`), `insights/` (the executive dashboard — the `reports/` stretch slice shipped as `insights`), `antifraude/` (escalation `bandeja` + `investigacion`), `providers/`, `asegurados/`, `alerts/` (rules catalog), `audit/`, `settings/`, and `landing/`. `agent/` includes voice (Whisper transcription + `tts-player`), the conversations sidebar, and `agent-chart` (ECharts). When in doubt about routes, read `app.routes.ts`.

**Deferred (do NOT scaffold for the hackathon submission):** `features/memory/`. See spec §11 for re-introduction triggers.

> **Auth is in scope now (V0):** `features/auth/`, `core/auth/`, `core/guards/`, and `core/interceptors/auth.interceptor.ts` are first-class. They were originally on the deferred list; spec §17 (2026-05-26) added them back as **local JWT only** (Bearer header, no OAuth, no third-party SDK).

> **Originally deferred, landed during the hackathon — now first-class:**
> - `features/uploads/` — claim-import wizard + document upload UI.
> - `features/agent/` voice-recording + Whisper transcription components.
> - `features/agent/` conversation history sidebar + drawer.
> - `features/agent/components/agent-chart.ts` — ECharts rendering of agent SSE chart events.
> Don't move these back behind the deferred line.

**Import rules (enforced by ESLint where possible):**

- `features/*` may import from `core/*` and `shared/*`.
- `features/*` must **never** import from another `features/*`.
- `core/*` must **never** import from `features/*` or `shared/ui/*`.
- `shared/*` must **never** import from `features/*` or `core/*` (except `core/errors`).

---

## 4. Smart vs presentational

- **Smart components** = `features/*/pages/`. They inject services, hold signals, call APIs.
- **Presentational components** = `features/*/components/` and everything in `shared/ui/`. They accept `input()`, emit `output()`. **No service injection. No HTTP. No `inject(Router)`.**
- A presentational component you can't drop into Storybook (when we add it) is doing too much — refactor.

---

## 5. State management

- **Signals** for UI and feature state. Period.
- One `*Store` service per feature (e.g. `ClaimsStore` in `features/claims/services/claims.store.ts`, `AgentStore` in `features/agent/services/agent.store.ts`) exposing signals + methods. Provided at the feature route level, not globally.
- **`computed()`** for derived state. **`effect()`** for side-effects (rarely — usually a method on the store is cleaner).
- **RxJS** for streams: SSE events, debounced search inputs. Pipe into a signal via `toSignal()` once you cross the boundary.
- **No NgRx.** If we ever need it, flag it and ask. We won't.
- **No `BehaviorSubject` for component state.** Use `signal()`.

---

## 6. API service conventions

- Every feature gets **one** `*.api.ts` in `core/api/clients/` (e.g. `claims.api.ts`, `agent.api.ts`, `reports.api.ts`).
- Each `*.api.ts` wraps the generated types from `core/api/generated/`. Components and stores call the api wrapper, **never** `HttpClient` directly.
- Errors flow through `core/interceptors/error.interceptor.ts` which maps HTTP failures to a typed `AppError` (in `core/errors/`).
- Regenerate types after every backend schema change:
  ```bash
  pnpm gen:api
  ```
  This script runs `openapi-typescript $BACKEND_URL/openapi.json -o src/app/core/api/generated/schema.ts`.
- **Spanish schema field names** — generated types will have Spanish snake_case (`id_siniestro`, `monto_reclamado`, `documentos_completos`). Don't write a camelCase adapter layer. Render Spanish field names directly in templates where they appear.

---

## 7. Streaming AI responses (SSE)

The backend streams `ChatStreamEvent`s from the claims agent over Server-Sent Events. The shape (must match `hackiaton_agent_ai_3.0_backend/CLAUDE.md` §7):

```ts
// Discriminated union — regenerated from backend OpenAPI
type ChatStreamEvent =
  | { type: 'token';       data: { delta: string; message_id: string } }
  | { type: 'tool_call';   data: { tool: string; args: unknown; call_id: string } }
  | { type: 'tool_result'; data: { call_id: string; result: unknown } }
  | { type: 'agent_step';  data: { node: string; meta?: unknown } }
  | { type: 'error';       data: { code: string; message: string } }
  | { type: 'done';        data: { message_id: string } };
```

**Implementation rules:**

- **Use `fetch` + `ReadableStream`**, not `EventSource`. `EventSource` cannot send `Authorization` headers or POST bodies.
- Implement once in `core/realtime/sse.client.ts` as `SseClient.stream<T>(req): Observable<T>`. Features subscribe.
- `AgentStore.ask(query, context?)` opens the stream against `POST /api/v1/agent/ask`, pipes events into the store's signals:
  ```ts
  // AgentStore (sketch)
  ask(query: string, context?: { focus_claim_id?: string }) {
    this.streaming.set(true);
    const id = uuid();
    this.messages.update(m => [...m, { id, role: 'assistant', content: '', steps: [], citations: [] }]);
    this.sse.stream<ChatStreamEvent>({ url: '/api/v1/agent/ask', body: { query, context } })
      .subscribe({
        next: e => this.applyEvent(id, e),
        complete: () => this.streaming.set(false),
        error: err => { this.error.set(err); this.streaming.set(false); },
      });
  }
  ```
- The token applier uses `messages.update(...)` to append to the last assistant message. Never mutate signal values in place.
- `agent_step` and `tool_call` / `tool_result` events render as collapsible `AgentStepCard` / `ToolCallCard` inside the message thread — **this transparency is part of the explainability story we're graded on** (root CLAUDE.md §2.4, 25% bucket).

---

## 8. UI architecture overview

Two primary features wire together for the demo: **`features/claims/`** owns the dashboard, and **`features/agent/`** provides a right-rail chat panel that the dashboard mounts.

### `features/claims/`

- **`ClaimsListPage`** (smart): holds `claims: Signal<ClaimSummary[]>`, `loading: Signal<boolean>`, `error: Signal<AppError | null>`. Filter bar (`tier`, `ramo`, date range) drives the API call. Table sorted by `score` desc with `TrafficLightBadge` per row.
- **`ClaimDetailPage`** (smart): loads one claim via `ClaimsStore.loadDetail(id)`. Renders:
  - `ClaimDetailHeader` — asegurado, póliza, fechas, montos.
  - `TrafficLightBadge` + `ScoreBar` (0-100 with tier color).
  - Three accordions in this exact order: **"Reglas activadas"** (`RulesFiredAccordion`), **"Factores del modelo"** (`MlFactorsAccordion` — SHAP top-3), **"Narrativas similares"** (`SimilarNarrativesAccordion` — clickable cards linking back to /claims/:id).
  - `AnomalyIndicatorCard` between header and accordions.
  - Right-rail mount point for `ChatPanel` with `context: { focus_claim_id: id }`.

### `features/agent/`

- **`ChatPanel`** (smart): holds `messages: Signal<AgentMessage[]>`, `streaming`, `error`. NL query box + send. Streams responses via `AgentStore.ask(...)`. Citations render as `CitationChip` that navigates to `/claims/:id`.
- **`MessageItem`** (presentational): renders user / assistant messages. Uses `MarkdownPipe` for assistant content. Shows `AgentStepCard` + `ToolCallCard` inline for transparency.
- **`ToolCallCard`**, **`AgentStepCard`**: collapsible cards exposing the agent's reasoning.

### `features/network/` (stretch)

- **`NetworkGraphPage`**: force-directed graph of asegurados ↔ proveedores ↔ claims. Color by claim tier, size by degree. Clicking a node updates a route-level signal that filters the claims list when the analyst returns.

### `features/reports/` (stretch)

- **`ExecutiveReportPage`**: KPI tiles (top-10 claims, top providers by alerts, ramo distribution, alert reasons histogram) + a download button (CSV + printable HTML for PDF).

**Incremental rendering for the chat panel:** signal updates only. `MessageList` uses `ChangeDetectionStrategy.OnPush`. Tracking by `m.id` keeps the DOM stable as tokens stream in.

**Markdown:** `shared/pipes/markdown.pipe.ts` wraps a markdown lib (e.g. `marked`) and sanitizes with `DomSanitizer`. Never bind raw HTML.

---

## 9. Explainability accordion pattern

The three accordions on `ClaimDetailPage` are **the** explainability surface — they're 25% of our grade (root CLAUDE.md §2.4). They follow a shared visual + interaction pattern; build them as one component family.

- **Common shape:** each accordion is a `BaseAccordion` (in `shared/ui/`) wrapping a header (icon + label + count) and a body slot. Closed by default; click toggles. Persist open/closed state in the route fragment.
- **Empty states are mandatory.** A 🟢 claim with no rules fired shows the "Reglas activadas" accordion with the body "No se activaron reglas para este caso." — never hide the accordion. The empty-state copy is part of the explainability story.
- **Citations are clickable.** Rule chips inside "Reglas activadas" link to the rules-engine doc anchor; similar-narratives cards link to `/claims/:other_id`.
- **Evidence shows numbers, not adjectives.** The rule evidence payload (root CLAUDE.md backend §9) is rendered as a small key-value strip below the rule chip — `proveedor_id P-0042 · casos observados 7` reads better than "recurrent provider".
- **Loading states use skeletons**, not spinners. The detail page is fetched eagerly; skeletons keep the layout stable while data lands.

---

## 10. Loading, error, optimistic UI

Every async surface exposes three signals:

```ts
data:    Signal<T | null>
loading: Signal<boolean>
error:   Signal<AppError | null>
```

- Components render `@if (loading()) { ... } @else if (error()) { ... } @else if (data()) { ... }`.
- **Optimistic updates** only where the server confirms idempotently (chat send). Reconcile on the `done` event; revert on `error`.

---

## 10b. Auth pattern (V0 — local JWT)

*(Added 2026-05-26 — see backend CLAUDE.md §6 and design spec §17.)*

The frontend authenticates against `POST /api/v1/auth/login` and stores a single short-lived JWT. Scope is intentionally minimal — login only, no signup, no refresh tokens, no role-based UI gating.

**Three pieces wire it together:**

1. **`core/auth/auth.store.ts`** — signals:
   ```ts
   user:    Signal<CurrentUser | null>
   token:   Signal<string | null>
   loading: Signal<boolean>
   error:   Signal<AppError | null>
   ```
   Methods: `login(email, password)`, `logout()`. Initializes `token` from `localStorage` on construction. Persists token writes on every change. Calls `auth.api.login()` and routes to `/claims` on success.
2. **`core/interceptors/auth.interceptor.ts`** — `HttpInterceptorFn` that injects `Authorization: Bearer <token>` on every request except `/auth/login`. Registered alongside `errorInterceptor` in `app.config.ts`.
3. **`core/guards/auth.guard.ts`** — `CanActivateFn` returning `true` if `AuthStore.token() != null`, else `router.navigate(['/login'])`. Applied to the `claims` lazy route in `app.routes.ts`.

**Hard rules:**

- The token lives in `localStorage` for hackathon speed. **Document this as a known limitation** in `docs/limitaciones.md` (XSS exposure). Post-hackathon: httpOnly cookie + refresh tokens.
- **Never** read the token outside `AuthStore`. Components that need the user read `authStore.user()`.
- **Never** call `HttpClient` directly — go through `core/api/clients/*.api.ts` so the interceptor runs.
- The login page is the **only** route that the auth guard doesn't gate. The error interceptor must surface a 401 from any other route by redirecting to `/login` (token may have expired).
- Spanish copy only: "Iniciar sesión", "Correo", "Contraseña", "Entrar", "Credenciales inválidas", "Sesión expirada — vuelve a iniciar sesión".

### Role-aware UI (RBAC on the client)

The backend gates state-changing endpoints by role (see backend CLAUDE.md §6b). The client mirrors that with **two design rules**:

1. **Hide forbidden actions — don't disable them.** A button the user can't successfully click is worse than no button. `WorkflowActions` decides visibility off `AuthStore.user().role` + `claim.workflow_status` + `claim.tier`; if the action isn't allowed, the button doesn't render. Reserve disabled state for "valid action, momentarily blocked" (e.g. while a save is in flight).
2. **One place per role check.** Components branch on role *only* in two spots: `WorkflowActions` (button visibility) and `ClaimsListPage.ngOnInit` (role-seeded default filter). Everywhere else, role is invisible — components consume the data the backend returns, and forbidden actions never reach the UI.

**Components:**
- **`RoleBadge`** (`shared/ui/`) — renders "Analista" or "Antifraude" pill in the app shell header. Stateless, takes a `Role` input.
- **`WorkflowActions`** (`features/claims/components/`) — the only component that contains role-based branching for action buttons. Inputs: `claim: ClaimDetail`. Emits `escalate` / `resolve` events handled by the page.
- **`WorkflowStatusBadge`** (`features/claims/components/`) — "Pendiente" / "Escalado" / "Resuelto" pill on detail-page header. Role-agnostic — it just renders `claim.workflow_status`.

**Default view per role.** `ClaimsListPage` reads `authStore.user().role` once on init and seeds the filter signal:
- analista → `status=pending` (their queue is the unfiltered triage list).
- antifraude → `status=escalated` (their queue is the escalation list).

The user can override the filter via the FilterBar. Don't lock the filter — the role only sets the *default*, never the *available options*.

**Backend 403 handling.** If the user somehow triggers a forbidden action (e.g. via API debug tools), the error interceptor maps 403 to a Spanish toast: "No tienes permisos para esa acción." Don't crash, don't redirect — just surface the message.

---

## 11. Styling & UX

- **Tailwind utility-first.** When a class string repeats twice, extract a presentational component (not an `@apply` rule).
- **Design tokens** in `tailwind.config.ts` (colors, spacing, radii, shadows). Reference tokens, not raw values, in components.
- **Tier colors** are first-class design tokens — `tier-green`, `tier-yellow`, `tier-red`. Used by `TrafficLightBadge`, `ScoreBar`, and any chart that shows tier data.
- **Dark mode** via Tailwind's `class` strategy. Toggle stored in a signal-backed `ThemeStore` and persisted to a single non-secret cookie.
- **Icons:** Angular Material `mat-icon` with the Material Symbols set.
- **Animations:** keep them tasteful and purposeful. Tailwind transitions for hover/state. `@angular/animations` only for non-trivial sequences (accordion expand, chat scroll-into-view).
- **Microcopy in Spanish.** Empty / loading / error states all deserve a one-liner that says what's happening and what the user can do. Never use *"fraude"* without *"posible"*.

---

## 12. Accessibility

- Every interactive element must be keyboard-reachable. Visible focus rings (Tailwind `focus-visible:` utilities).
- Chat transcript uses `role="log" aria-live="polite" aria-relevant="additions"`.
- Use `LiveAnnouncer` from `@angular/cdk/a11y` for important non-visual updates (e.g. "Análisis completado").
- Color contrast meets WCAG AA. The 🟢🟡🔴 traffic light is NEVER conveyed by color alone — always paired with a label or symbol.
- Don't ship a UI you can't navigate with the keyboard.

---

## 13. Responsive design

- **Mobile-first.** Default styles target small screens; use Tailwind `md:`/`lg:` to layer up.
- The claims layout collapses the right-rail chat panel into a bottom sheet at `md`. The composer stays sticky-bottom on mobile.
- Test at 360px width before declaring a feature done.
- The pitch will likely happen on a wide laptop screen — but if a juror opens the deployed URL on a phone, it should still look right.

---

## 14. Anti-patterns (do NOT do these)

- ❌ `*.component.ts` > **250 LOC** → split into smart + presentational + signals/store.
- ❌ Template > **100 lines** → extract child components.
- ❌ Business logic in templates (`{{ someComplexFn(item) }}`) → use `computed()` or a method.
- ❌ Duplicate API calls scattered across components → centralize in the feature's `*.api.ts`.
- ❌ `BehaviorSubject` for component state → `signal()`.
- ❌ Hand-written DTOs that mirror backend models → use `core/api/generated/`.
- ❌ `any` → use `unknown` and narrow, or fix the generated types upstream.
- ❌ Deeply nested RxJS pipelines → extract operators or split into smaller observables.
- ❌ `features/a/...` importing from `features/b/...` → lift the shared bit to `shared/` or `core/`.
- ❌ Putting feature components in `shared/ui/` → `shared/ui/` is for cross-feature primitives only.
- ❌ Inline secrets, hardcoded backend URLs → use `core/config/env.ts`.
- ❌ Calling `console.log` in committed code → use a `Logger` service if you need conditional logging.
- ❌ A UI string with `"fraude"` not preceded by `"posible"` — see §2 and root §2.10.
- ❌ Scaffolding `features/memory/` — deferred (§3). *(`features/auth/` and `features/uploads/` were removed from this list during the hackathon — both are now V0 and in scope.)*
- ❌ Storing the JWT outside the `AuthStore` / `localStorage` — no other components read or write the token directly.
- ❌ Calling `HttpClient` without the auth interceptor in the chain — every protected request needs Bearer header automatically; never set it by hand.

---

## 15. Commands

```bash
pnpm install              # install deps
pnpm dev                  # ng serve with HMR
pnpm build                # production build — THIS is the gate (catches TS/template errors)
pnpm watch                # dev build with file watching
pnpm format               # prettier --write
pnpm format:check         # prettier --check
pnpm gen:api              # regenerate src/app/core/api/generated/ from $BACKEND_URL/openapi.json
```

> There is **no `pnpm lint` script** and the unit-test runner is deferred (`pnpm test` maps to `ng test` but no specs are wired). The real quality gate is **`pnpm build`** — the repo is not prettier-clean, so don't gate on `format:check`.

**Before opening a PR**, run `pnpm build`. If you changed anything that consumes the API, also run `pnpm gen:api` against a running backend (or the staging URL).

---

## 16. AI-assistant checklist (Claude Code, Cursor, Copilot)

Before you submit a change, verify:

- [ ] No `NgModule`, no `*ngIf`/`*ngFor`, no `@Input()/@Output()` decorators.
- [ ] No `BehaviorSubject` for component-local state.
- [ ] Component file ≤ 250 LOC; template ≤ 100 lines.
- [ ] No `features/*` → `features/*` imports.
- [ ] API calls go through `core/api/clients/*.api.ts`.
- [ ] If you changed an API surface, you ran `pnpm gen:api`.
- [ ] Streaming events use the `ChatStreamEvent` shape from generated types.
- [ ] Loading / error / data signals exist for every async surface.
- [ ] All user-visible strings are Spanish.
- [ ] No `"fraude"` literal in any user-facing string without `"posible"`.
- [ ] All three accordions on `ClaimDetailPage` render with empty-state copy when there's nothing to show.
- [ ] Keyboard works. Focus rings visible. Contrast passes. Traffic-light not color-only.
