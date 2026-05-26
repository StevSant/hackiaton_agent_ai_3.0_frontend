# CLAUDE.md — Frontend (Angular)

This file governs everything inside `hackiaton_agent_ai_3.0_frontend/`. Read the [root `CLAUDE.md`](../CLAUDE.md) first for cross-stack rules.

> If you're an AI assistant and you're about to write `*ngIf`, `@Input()`, `NgModule`, `HttpClientModule`, or `BehaviorSubject` for component state — **stop**. This project uses modern Angular. See §2.

---

## 1. Stack

- **Angular** — latest stable, **standalone components only**, **signals-first**.
- **TailwindCSS** — primary styling. Utility-first.
- **Angular Material** — icons (`mat-icon`) and a11y primitives (`@angular/cdk/a11y`, overlay, dialog/snackbar). **Not** the primary component library — we build our own with Tailwind.
- **TypeScript** — strict mode, no `any`.
- **Package manager** — `pnpm`.
- **Generated API types** — `openapi-typescript` against the backend's `/openapi.json`.

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

---

## 3. Folder structure

```
src/app/
├── core/                       ← app-wide singletons; provided in app.config.ts
│   ├── api/
│   │   ├── generated/          ← openapi-typescript output — DO NOT EDIT
│   │   └── clients/            ← thin typed wrappers around generated types
│   ├── auth/                   ← AuthStore (signal-based), auth.guard.ts, auth.interceptor.ts
│   ├── config/                 ← env.ts, runtime config
│   ├── interceptors/           ← error.interceptor.ts, etc.
│   ├── realtime/               ← SseClient
│   └── errors/                 ← AppError model, error mapping
├── shared/                     ← reusable across features
│   ├── ui/                     ← Button, Card, Spinner, Avatar, EmptyState, ... (presentational)
│   ├── pipes/                  ← MarkdownPipe (sanitized), RelativeTimePipe, ...
│   ├── directives/
│   └── utils/
├── features/                   ← vertical slices, lazy-loaded
│   ├── chat/
│   │   ├── pages/              ← routed smart components (ChatPage)
│   │   ├── components/         ← MessageList, MessageItem, MessageComposer, ToolCallCard, AgentStepCard, ...
│   │   ├── services/           ← ChatStore (signal-based), chat.api.ts
│   │   ├── models/             ← feature-local types (re-exporting from core/api/generated when needed)
│   │   └── chat.routes.ts
│   ├── auth/
│   ├── uploads/
│   └── memory/
├── layouts/                    ← AppShell, AuthShell
├── app.routes.ts               ← top-level lazy-loaded routes
└── app.config.ts               ← providers
```

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
- One `*Store` service per feature (e.g. `ChatStore` in `features/chat/services/chat.store.ts`) exposing signals + methods. Provided at the feature route level, not globally.
- **`computed()`** for derived state. **`effect()`** for side-effects (rarely — usually a method on the store is cleaner).
- **RxJS** for streams: SSE events, websocket frames, debounced search inputs. Pipe into a signal via `toSignal()` once you cross the boundary.
- **No NgRx.** If we ever need it, flag it and ask. We won't.
- **No `BehaviorSubject` for component state.** Use `signal()`.

---

## 6. API service conventions

- Every feature gets **one** `*.api.ts` in `core/api/clients/` (e.g. `chat.api.ts`, `files.api.ts`, `auth.api.ts`).
- Each `*.api.ts` wraps the generated types from `core/api/generated/`. Components and stores call the api wrapper, **never** `HttpClient` directly.
- Errors flow through `core/interceptors/error.interceptor.ts` which maps HTTP failures to a typed `AppError` (in `core/errors/`).
- Regenerate types after every backend schema change:
  ```bash
  pnpm gen:api
  ```
  This script runs `openapi-typescript $BACKEND_URL/openapi.json -o src/app/core/api/generated/schema.ts`.

---

## 7. Streaming AI responses (SSE)

The backend streams `ChatStreamEvent`s over Server-Sent Events. The shape (must match `hackiaton_agent_ai_3.0_backend/CLAUDE.md` §7):

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
- The feature pipes the stream into the store's signals:
  ```ts
  // ChatStore (sketch)
  send(prompt: string) {
    this.streaming.set(true);
    const id = uuid();
    this.messages.update(m => [...m, { id, role: 'assistant', content: '' }]);
    this.sse.stream<ChatStreamEvent>({ url: '/api/v1/chat/stream', body: { prompt } })
      .subscribe({
        next: e => this.applyEvent(id, e),
        complete: () => this.streaming.set(false),
        error: err => { this.error.set(err); this.streaming.set(false); },
      });
  }
  ```
- The token applier uses `messages.update(...)` to append to the last assistant message. Never mutate signal values in place.

---

## 8. AI chat UI architecture

`features/chat/`:

- **`ChatPage`** (smart): holds `messages: Signal<Message[]>`, `streaming: Signal<boolean>`, `error: Signal<AppError | null>`. Wires `MessageList` ← messages, `MessageComposer` → `chatStore.send()`.
- **`MessageList`** (presentational): `input<Message[]>('messages')`. Uses `@for (m of messages(); track m.id)`.
- **`MessageItem`**: renders user / assistant / tool messages. Uses `MarkdownPipe` for assistant content. Renders `ToolCallCard` for tool messages.
- **`MessageComposer`**: textarea + send button. Emits `output<string>('submit')`.
- **`ToolCallCard`**, **`AgentStepCard`**: collapsible cards for transparency into the agent's reasoning.

**Incremental rendering:** signal updates only. `MessageList` is `ChangeDetectionStrategy.OnPush` (Angular default for standalone in modern versions but be explicit). Tracking by `m.id` keeps the DOM stable as tokens stream in.

**Markdown:** `shared/pipes/markdown.pipe.ts` wraps a markdown lib (e.g. `marked`) and sanitizes with `DomSanitizer`. Never bind raw HTML.

---

## 9. Authentication

- **Library:** `@supabase/supabase-js` on the client. Configured once in `core/auth/supabase.client.ts`.
- **Token storage:**
  - **Access token** lives in memory only — a signal inside `AuthStore` (`core/auth/auth.store.ts`).
  - **Refresh token** lives in an `httpOnly` cookie set by the backend's `/auth/session` endpoint. The frontend never reads or writes it.
  - **Never** persist the access token in `localStorage` or `sessionStorage`. On page reload, the frontend calls `/auth/session/refresh` which uses the httpOnly cookie to mint a fresh access token.
- **`authInterceptor`** (functional) attaches `Authorization: Bearer <token>` to every `/api/**` request.
- **`authGuard`** (functional `CanActivateFn`) protects feature routes:
  ```ts
  // chat.routes.ts
  export const routes: Routes = [
    { path: '', loadComponent: () => import('./pages/chat.page'), canActivate: [authGuard] },
  ];
  ```
- **Sign-in/up flows** live in `features/auth/`. Magic link + OAuth providers (Google, GitHub) via Supabase.

---

## 10. File uploads

- UI lives in `features/uploads/`.
- `UploadsApi` posts `multipart/form-data` to `POST /api/v1/files`, receives `{ file_id }`.
- Ingestion progress streamed via `SseClient.stream(/api/v1/files/{file_id}/events)`. Shape matches backend `FileIngestEvent` (`uploaded`, `parsing`, `embedding`, `ready`, `error`).
- **Validation:** mime type allow-list + size limit on the client (cheap UX) **and** on the server (source of truth). Show the user friendly errors for both.
- **Optimistic UI:** show the file in the list immediately with a `uploading` status; transition to `ready` on the SSE `ready` event.

---

## 11. Loading, error, optimistic UI

Every async surface exposes three signals:

```ts
data:    Signal<T | null>
loading: Signal<boolean>
error:   Signal<AppError | null>
```

- Components render `@if (loading()) { ... } @else if (error()) { ... } @else if (data()) { ... }`.
- **Optimistic updates** only where the server confirms idempotently (chat message send, "like" actions). Reconcile on the `done` event; revert on `error`.

---

## 12. Styling & UX

- **Tailwind utility-first.** When a class string repeats twice, extract a presentational component (not an `@apply` rule).
- **Design tokens** in `tailwind.config.ts` (colors, spacing, radii, shadows). Reference tokens, not raw values, in components.
- **Dark mode** via Tailwind's `class` strategy. Toggle stored in a signal-backed `ThemeStore` and persisted to a single non-secret cookie.
- **Icons:** Angular Material `mat-icon` with the Material Symbols set.
- **Animations:** keep them tasteful and purposeful. Tailwind transitions for hover/state. `@angular/animations` only for non-trivial sequences (drawer slide, chat scroll-into-view).
- **Microcopy** matters for hackathon impact — empty states, loading states, and error states all deserve a one-liner that says what's happening and what the user can do.

---

## 13. Accessibility

- Every interactive element must be keyboard-reachable. Visible focus rings (Tailwind `focus-visible:` utilities).
- Chat transcript uses `role="log" aria-live="polite" aria-relevant="additions"`.
- Use `LiveAnnouncer` from `@angular/cdk/a11y` for important non-visual updates (e.g. "Tool call completed").
- Color contrast meets WCAG AA. Don't ship a UI you can't navigate with the keyboard.

---

## 14. Responsive design

- **Mobile-first.** Default styles target small screens; use Tailwind `md:`/`lg:` to layer up.
- The chat layout collapses the sidebar to a drawer at `md`. The composer stays sticky-bottom on mobile.
- Test at 360px width before declaring a feature done.

---

## 15. Anti-patterns (do NOT do these)

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

---

## 16. Commands

```bash
pnpm install              # install deps
pnpm dev                  # ng serve with HMR
pnpm build                # production build
pnpm test                 # unit tests (Karma/Jest — TBD)
pnpm lint                 # eslint + prettier check
pnpm gen:api              # regenerate src/app/core/api/generated/ from $BACKEND_URL/openapi.json
```

**Before opening a PR**, run: `pnpm lint && pnpm build && pnpm test`. If you changed anything that consumes the API, also run `pnpm gen:api` against a running backend (or the staging URL).

---

## 17. AI-assistant checklist (Claude Code, Cursor, Copilot)

Before you submit a change, verify:

- [ ] No `NgModule`, no `*ngIf`/`*ngFor`, no `@Input()/@Output()` decorators.
- [ ] No `BehaviorSubject` for component-local state.
- [ ] Component file ≤ 250 LOC; template ≤ 100 lines.
- [ ] No `features/*` → `features/*` imports.
- [ ] API calls go through `core/api/clients/*.api.ts`.
- [ ] If you changed an API surface, you ran `pnpm gen:api`.
- [ ] Streaming events use the `ChatStreamEvent` shape from generated types.
- [ ] Access token never written to `localStorage`/`sessionStorage`.
- [ ] Loading / error / data signals exist for every async surface.
- [ ] Keyboard works. Focus rings visible. Contrast passes.
