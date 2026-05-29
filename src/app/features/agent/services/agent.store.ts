import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type { DocumentContext } from '@core/api/clients/agent.api';
import { ConversationsApi } from '@core/api/clients/conversations.api';
import { environment } from '@core/config/env';
import { AppError } from '@core/errors/app-error';
import { SseClient } from '@core/realtime/sse.client';
import type {
  AgentMessage,
  AgentStep,
  ChartPayload,
  ConversationDocument,
  DocumentPayload,
  TableRow,
} from '../models';
import type { ChatContext } from '../models/chat-context';
import { ConversationsStore } from './conversations.store';
import { buildCaseWelcomeMessage } from '../utils/case-context-message';
import { buildProviderWelcomeMessage } from '../utils/provider-context-message';
import { buildAseguradoWelcomeMessage } from '../utils/asegurado-context-message';
import type { Asegurado, Claim, Provider } from '@shared/models';

let nextId = 0;
const newId = (): string => `m_${Date.now()}_${++nextId}`;

const DEFAULT_WELCOME =
  'Hola, soy Centinela IA. Puedo ayudarte a explorar tu bandeja: rankings, patrones, casos atípicos y resúmenes ejecutivos. ¿En qué te puedo ayudar?';

interface TokenEvent {
  type: 'token';
  data: { delta: string; message_id: string };
}

interface DoneEvent {
  type: 'done';
  data: { message_id: string };
}

interface ErrorEvent {
  type: 'error';
  data: { code: string; message: string };
}

interface AgentStepEvent {
  type: 'agent_step';
  data: { node: string; meta?: { thought?: string; step?: number } | null };
}

interface ToolCallEvent {
  type: 'tool_call';
  data: { tool: string; args: unknown; call_id: string };
}

interface ToolResultEvent {
  type: 'tool_result';
  data: { call_id: string; result: unknown };
}

interface ChartEvent {
  type: 'chart';
  data: ChartPayload;
}

interface DocumentEvent {
  type: 'document';
  data: DocumentPayload;
}

type AgentStreamEvent =
  | TokenEvent
  | DoneEvent
  | ErrorEvent
  | AgentStepEvent
  | ToolCallEvent
  | ToolResultEvent
  | ChartEvent
  | DocumentEvent;

// Shape of the transparency_metadata JSONB column persisted by the backend.
interface StoredScratchpadEntry {
  thought?: string;
  step?: number;
}

interface StoredToolCall {
  call_id: string;
  tool: string;
  args: unknown;
  result: unknown;
}

interface TransparencyMetadata {
  steps?: StoredScratchpadEntry[];
  tool_calls?: StoredToolCall[];
  citations?: { claim_id: string }[];
  document?: DocumentPayload | null;
}

/**
 * Reconstruct an AgentStep[] from the persisted transparency_metadata so that
 * loading a past conversation renders the same transparency cards that appeared
 * during the live SSE stream.
 *
 * The metadata stores scratchpad entries (agent reasoning steps) and tool calls
 * separately. We reconstruct in the natural interleaved order:
 *  1. One agent_step card per scratchpad entry (reasoning thought).
 *  2. One tool_call card per tool call, with its result folded into `detail`.
 *  3. A final compose agent_step card (mirrors the live stream's compose event).
 *
 * Returns [] when metadata is missing or empty (user messages, legacy messages).
 */
function buildStepsFromMetadata(meta: TransparencyMetadata | null | undefined): AgentStep[] {
  if (!meta) return [];
  const steps: AgentStep[] = [];

  for (const entry of meta.steps ?? []) {
    const thought = typeof entry.thought === 'string' ? entry.thought.trim() : undefined;
    steps.push({
      kind: 'agent_step',
      label: nodeLabel('react_step'),
      detail: thought || undefined,
    });
  }

  for (const tc of meta.tool_calls ?? []) {
    const argDetail = summarizeArgs(tc.args);
    const resultDetail = summarizeResult(tc.result);
    const detail =
      argDetail && resultDetail
        ? `${argDetail}\n→ ${resultDetail}`
        : (argDetail ?? resultDetail);
    steps.push({
      kind: 'tool_call',
      label: tc.tool,
      detail,
      callId: tc.call_id,
    });
  }

  // The compose step is always the final node — mirror the live stream.
  if (steps.length > 0) {
    steps.push({ kind: 'agent_step', label: nodeLabel('compose') });
  }

  return steps;
}

const NODE_LABEL: Record<string, string> = {
  react_step: 'Razonamiento',
  compose: 'Componiendo respuesta',
};

function nodeLabel(node: string): string {
  return NODE_LABEL[node] ?? node;
}

function summarizeArgs(args: unknown): string | undefined {
  if (args == null) return undefined;
  if (typeof args === 'string') return args;
  try {
    const json = JSON.stringify(args);
    return json.length > 140 ? `${json.slice(0, 137)}…` : json;
  } catch {
    return undefined;
  }
}

function summarizeResult(result: unknown): string | undefined {
  if (result == null) return undefined;
  if (typeof result === 'string') return result;
  if (Array.isArray(result)) return `${result.length} items`;
  if (typeof result === 'object') {
    const keys = Object.keys(result as Record<string, unknown>);
    if (keys.length === 0) return undefined;
    return `${keys.length} campos · ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''}`;
  }
  return String(result);
}

/** Envelope keys returned by backend tools, checked in priority order. */
const ENVELOPE_ARRAY_KEYS = ['claims', 'rows', 'items', 'results', 'data'] as const;

/** Minimum key count for an object row to qualify as a table row (avoid 1-column string lists). */
const MIN_ROW_KEYS = 2;

/**
 * Returns true when `arr` is a non-empty array of objects each having at least
 * MIN_ROW_KEYS own properties — i.e. it looks like structured tabular data.
 */
function isObjectArray(arr: unknown): arr is Record<string, unknown>[] {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const first = arr[0];
  return (
    first !== null &&
    typeof first === 'object' &&
    !Array.isArray(first) &&
    Object.keys(first as object).length >= MIN_ROW_KEYS
  );
}

/**
 * Returns structured rows when the tool result is:
 *  - a bare non-empty array of objects (original behavior), OR
 *  - an enveloped object whose first matching array-of-objects property is used.
 *
 * Backend tools return enveloped results, e.g.:
 *   query_claims      → { mode: "top_risk", claims: ClaimSummary[] }
 *   aggregate_by_dim  → { dimension: "...", rows: [...] }
 *   missing_documents → { tier: "...", claims: [...] }
 *
 * Check ENVELOPE_ARRAY_KEYS first; fall back to scanning all values for the
 * first qualifying array. Returns null when no table-shaped data is found.
 */
function extractTableRows(result: unknown): TableRow[] | null {
  // Fast path: bare array-of-objects.
  if (isObjectArray(result)) return result as TableRow[];

  // Enveloped object: look for a nested array-of-objects.
  if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
    const obj = result as Record<string, unknown>;

    // Check well-known envelope keys first.
    for (const key of ENVELOPE_ARRAY_KEYS) {
      if (isObjectArray(obj[key])) return obj[key] as TableRow[];
    }

    // Fallback: scan all values for the first qualifying array.
    for (const val of Object.values(obj)) {
      if (isObjectArray(val)) return val as TableRow[];
    }
  }

  return null;
}

/**
 * State for the artifact side panel (document canvas). A single panel is open at
 * a time (`activeDocumentId`), but the conversation can hold MANY attachments.
 */
export interface ActiveDocument {
  titulo: string;
  contenidoMarkdown: string;
  /** The message ID that sourced this document, if any. */
  messageId?: string;
}

let nextDocId = 0;
const newDocId = (): string => `doc_${Date.now()}_${++nextDocId}`;

@Injectable({ providedIn: 'root' })
export class AgentStore {
  private readonly sse = inject(SseClient);
  private readonly conversationsApi = inject(ConversationsApi);
  private readonly conversationsStore = inject(ConversationsStore);

  private readonly _messages = signal<AgentMessage[]>([
    {
      id: newId(),
      role: 'assistant',
      content:
        'Hola, soy Centinela IA. Puedo ayudarte a explorar tu bandeja: rankings, patrones, casos atípicos y resúmenes ejecutivos. ¿En qué te puedo ayudar?',
    },
  ]);
  private readonly _thinking = signal<boolean>(false);
  private readonly _responding = signal<boolean>(false);
  private readonly _conversationId = signal<string | null>(null);
  private readonly _chatContext = signal<ChatContext>(null);
  /** All document attachments in this conversation (multiple coexist). */
  private readonly _documents = signal<ConversationDocument[]>([]);
  /** Id of the document currently open in the right-side canvas panel, if any. */
  private readonly _activeDocumentId = signal<string | null>(null);
  /**
   * CHANGE 1 — document the analyst chose to improve via the MAIN chat. Stashed
   * when "Mejorar con IA" prefills the input; the next `ask()` reads & clears it
   * so the full markdown rides in `document_context` (not capped by the message).
   */
  private readonly _pendingDocumentContext = signal<DocumentContext | null>(null);
  /**
   * CHANGE 2 — PNG data URL of the most recent chart rendered in this conversation.
   * Set by `agent-chart.ts` on render; read by the canvas panel to embed in the .docx.
   */
  private readonly _latestChartImage = signal<string | null>(null);

  readonly messages = this._messages.asReadonly();
  readonly thinking = this._thinking.asReadonly();
  readonly isResponding = this._responding.asReadonly();
  readonly conversationId = this._conversationId.asReadonly();
  readonly chatContext = this._chatContext.asReadonly();
  readonly documents = this._documents.asReadonly();
  readonly latestChartImage = this._latestChartImage.asReadonly();

  /** The document open in the panel, resolved from the active id. */
  readonly activeDocument = computed<ConversationDocument | null>(() => {
    const id = this._activeDocumentId();
    if (!id) return null;
    return this._documents().find((d) => d.id === id) ?? null;
  });

  /**
   * Appends a new document attachment to the conversation and returns it.
   * Each generated/improved document is a NEW attachment — never overwrites.
   */
  addDocument(
    payload: DocumentPayload,
    opts?: { messageId?: string; parentId?: string; version?: number },
  ): ConversationDocument {
    const doc: ConversationDocument = {
      id: newDocId(),
      titulo: payload.titulo,
      contenidoMarkdown: payload.contenido_markdown,
      createdAt: Date.now(),
      messageId: opts?.messageId,
      parentId: opts?.parentId,
      version: opts?.version,
    };
    this._documents.update((docs) => [...docs, doc]);
    return doc;
  }

  /**
   * Opens a document by content. Reuses an existing attachment with the same
   * title + content (so clicking a chat card re-focuses its doc); otherwise
   * creates a transient attachment. Used by the per-message "Abrir en canvas".
   */
  openDocument(doc: ActiveDocument): void {
    const existing = this._documents().find(
      (d) => d.titulo === doc.titulo && d.contenidoMarkdown === doc.contenidoMarkdown,
    );
    if (existing) {
      this._activeDocumentId.set(existing.id);
      return;
    }
    const created = this.addDocument(
      { titulo: doc.titulo, contenido_markdown: doc.contenidoMarkdown },
      { messageId: doc.messageId },
    );
    this._activeDocumentId.set(created.id);
  }

  closeDocument(): void {
    this._activeDocumentId.set(null);
  }

  /** Persists edited content (from the canvas WYSIWYG editor) back to the attachment. */
  updateDocumentContent(id: string, contenidoMarkdown: string): void {
    this._documents.update((docs) =>
      docs.map((d) => (d.id === id ? { ...d, contenidoMarkdown } : d)),
    );
  }

  /**
   * CHANGE 1 — "Mejorar con IA" routes through the MAIN chat. The panel calls this
   * to stash the document the analyst wants improved; the next `ask()` reads it,
   * attaches the full markdown via `document_context`, then clears it. One improve
   * turn = one document_context — subsequent turns don't carry it.
   */
  setPendingDocumentContext(ctx: DocumentContext): void {
    this._pendingDocumentContext.set(ctx);
  }

  /** CHANGE 2 — register the latest chart's PNG data URL (called by agent-chart). */
  setLatestChartImage(dataUrl: string): void {
    this._latestChartImage.set(dataUrl);
  }

  /** Backward-compat wrapper — maps claim id to ChatContext union. */
  readonly contextClaimId = computed(() => {
    const ctx = this._chatContext();
    return ctx?.kind === 'claim' ? ctx.id : null;
  });

  setChatContext(ctx: ChatContext): void {
    this._chatContext.set(ctx);
  }

  /** Backward-compat wrapper for existing call sites that pass a claim id. */
  setContextClaimId(claimId: string | null): void {
    this._chatContext.set(claimId ? { kind: 'claim', id: claimId } : null);
  }

  /**
   * Resets the store to an empty-messages state for a brand-new conversation
   * that hasn't been persisted yet. Called by the page when it detects a fresh
   * UUID so we avoid a backend GET that would 404.
   */
  resetToFresh(id: string): void {
    this._conversationId.set(id);
    this._messages.set([]);
    this.clearDocuments();
  }

  /** Clears the canvas + all attachments — called when switching conversations. */
  private clearDocuments(): void {
    this._documents.set([]);
    this._activeDocumentId.set(null);
    this._latestChartImage.set(null);
    this._pendingDocumentContext.set(null);
  }

  startNewConversation(
    id: string,
    entity?: Claim | Provider | { kind: 'provider'; data: Provider } | { kind: 'asegurado'; data: Asegurado } | null,
    asegurado?: Asegurado | null,
  ): void {
    this._conversationId.set(id);
    this.clearDocuments();

    // Overloaded: when called with (id, claim) from legacy sites, entity is a Claim.
    // New callers pass tagged objects.
    if (entity && 'kind' in entity && entity.kind === 'provider') {
      this._chatContext.set({ kind: 'provider', id: entity.data.id });
      this._messages.set([{ id: newId(), role: 'assistant', content: buildProviderWelcomeMessage(entity.data) }]);
      return;
    }

    if (entity && 'kind' in entity && entity.kind === 'asegurado') {
      this._chatContext.set({ kind: 'asegurado', id: entity.data.id });
      this._messages.set([{ id: newId(), role: 'assistant', content: buildAseguradoWelcomeMessage(entity.data) }]);
      return;
    }

    // Legacy call: entity is a Claim (no 'kind' property on Claim shape)
    const claim = entity as Claim | null | undefined;
    if (claim && !('kind' in (claim as object))) {
      this._chatContext.set({ kind: 'claim', id: claim.id });
      this._messages.set([{ id: newId(), role: 'assistant', content: buildCaseWelcomeMessage(claim) }]);
      return;
    }

    // Asegurado passed as third arg (legacy compat path not used currently)
    if (asegurado) {
      this._chatContext.set({ kind: 'asegurado', id: asegurado.id });
      this._messages.set([{ id: newId(), role: 'assistant', content: buildAseguradoWelcomeMessage(asegurado) }]);
      return;
    }

    this._chatContext.set(null);
    this._messages.set([{ id: newId(), role: 'assistant', content: DEFAULT_WELCOME }]);
  }

  async loadConversation(id: string): Promise<void> {
    try {
      const detail = await firstValueFrom(this.conversationsApi.get(id));
      this._conversationId.set(id);
      // Restore the tagged ChatContext from whichever context field is set.
      const restoredCtx: ChatContext =
        detail.context_claim_id    ? { kind: 'claim',     id: detail.context_claim_id }    :
        detail.context_provider_id ? { kind: 'provider',  id: detail.context_provider_id } :
        detail.context_asegurado_id? { kind: 'asegurado', id: detail.context_asegurado_id }: null;
      this._chatContext.set(restoredCtx);
      // Loading a different conversation resets the canvas + attachments.
      this._documents.set([]);
      this._activeDocumentId.set(null);
      this._messages.set(
        detail.messages.map((m) => {
          // chart_payload and transparency_metadata only exist on persisted
          // assistant messages and are typed only after `pnpm gen:api` picks up
          // the new backend schema. Read both defensively.
          const raw = m as unknown as {
            chart_payload?: ChartPayload | null;
            transparency_metadata?: TransparencyMetadata | null;
          };
          const chart = raw.chart_payload ?? undefined;
          const steps = buildStepsFromMetadata(raw.transparency_metadata);
          // Restore table payload from the first list-shaped tool_call result.
          const tablePayload = (raw.transparency_metadata?.tool_calls ?? []).reduce<TableRow[] | undefined>(
            (acc, tc) => acc ?? (extractTableRows(tc.result) ?? undefined),
            undefined,
          );
          // Restore document payload if the agent called crear_documento during this turn.
          const documentPayload = raw.transparency_metadata?.document ?? null;
          return {
            id: m.id,
            role: m.role,
            content: m.content,
            steps,
            chart,
            // Already-rendered charts skip the "Ver como gráfico" affordance.
            chartAccepted: chart !== undefined ? true : undefined,
            tablePayload: tablePayload ?? null,
            documentPayload,
          };
        }),
      );
      // Restore every document attachment found across the loaded messages so a
      // conversation with N generated documents shows N cards, each openable.
      const restoredDocs: ConversationDocument[] = [];
      for (const msg of this._messages()) {
        const payload = msg.documentPayload;
        if (payload) {
          restoredDocs.push({
            id: newDocId(),
            titulo: payload.titulo,
            contenidoMarkdown: payload.contenido_markdown,
            createdAt: Date.now(),
            messageId: msg.id,
          });
        }
      }
      this._documents.set(restoredDocs);
      if (this._messages().length === 0) {
        this._messages.set([
          {
            id: newId(),
            role: 'assistant',
            content: DEFAULT_WELCOME,
          },
        ]);
      }
    } catch (err) {
      if (err instanceof AppError && err.status === 404) {
        this._conversationId.set(id);
        this._messages.set([]);
        return;
      }
      this._messages.set([
        {
          id: newId(),
          role: 'assistant',
          content: 'No se pudo cargar el historial de esta conversación.',
        },
      ]);
    }
  }

  /** Toggle visibility of the chart attached to a message. */
  toggleChart(messageId: string): void {
    this._messages.update((messages) =>
      messages.map((msg) =>
        msg.id === messageId ? { ...msg, chartAccepted: !(msg.chartAccepted === true) } : msg,
      ),
    );
  }

  async ask(text: string, conversationId?: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || this._thinking()) return;

    if (conversationId) {
      this._conversationId.set(conversationId);
    } else if (!this._conversationId()) {
      this._conversationId.set(
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      );
    }

    this._messages.update((messages) => [
      ...messages,
      { id: newId(), role: 'user', content: trimmed },
    ]);
    this._thinking.set(true);
    this._responding.set(true);

    const assistantId = newId();
    let assistantAdded = false;
    const ensureAssistantBubble = (): void => {
      if (assistantAdded) return;
      assistantAdded = true;
      this._thinking.set(false);
      this._messages.update((messages) => [
        ...messages,
        { id: assistantId, role: 'assistant', content: '', steps: [] },
      ]);
    };

    const appendStep = (step: AgentStep): void => {
      ensureAssistantBubble();
      this._messages.update((messages) =>
        messages.map((msg) =>
          msg.id === assistantId ? { ...msg, steps: [...(msg.steps ?? []), step] } : msg,
        ),
      );
    };

    const attachResult = (callId: string, detail: string | undefined): void => {
      if (!detail) return;
      this._messages.update((messages) =>
        messages.map((msg) => {
          if (msg.id !== assistantId) return msg;
          const steps = msg.steps ?? [];
          const idx = steps.findIndex((s) => s.kind === 'tool_call' && s.callId === callId);
          if (idx === -1) return msg;
          const updated = [...steps];
          updated[idx] = {
            ...updated[idx],
            detail: `${updated[idx].detail ?? ''}\n→ ${detail}`.trim(),
          };
          return { ...msg, steps: updated };
        }),
      );
    };

    const attachTable = (rows: TableRow[]): void => {
      ensureAssistantBubble();
      this._messages.update((messages) =>
        messages.map((msg) =>
          msg.id === assistantId ? { ...msg, tablePayload: rows } : msg,
        ),
      );
    };

    const attachChart = (chart: ChartPayload): void => {
      ensureAssistantBubble();
      // Charts now arrive only when the analyst explicitly asked — no intermediate
      // "Ver como gráfico" gate; render immediately.
      this._messages.update((messages) =>
        messages.map((msg) =>
          msg.id === assistantId ? { ...msg, chart, chartAccepted: true } : msg,
        ),
      );
    };

    const attachDocument = (documentPayload: DocumentPayload): void => {
      ensureAssistantBubble();
      this._messages.update((messages) =>
        messages.map((msg) =>
          msg.id === assistantId ? { ...msg, documentPayload } : msg,
        ),
      );
      // Append as a NEW conversation attachment (multiple docs coexist) and
      // auto-open it in the artifact side panel.
      const doc = this.addDocument(documentPayload, { messageId: assistantId });
      this._activeDocumentId.set(doc.id);
    };

    const url = `${environment.backendUrl}${environment.apiPrefix}/agent/ask`;
    const ctx = this._chatContext();
    // CHANGE 1 — one improve turn carries the full document; clear after reading.
    const documentContext = this._pendingDocumentContext();
    this._pendingDocumentContext.set(null);

    this.sse
      .stream<AgentStreamEvent>({
        url,
        method: 'POST',
        body: {
          message: trimmed,
          conversation_id: this._conversationId(),
          context_claim_id:     ctx?.kind === 'claim'     ? ctx.id : null,
          context_provider_id:  ctx?.kind === 'provider'  ? ctx.id : null,
          context_asegurado_id: ctx?.kind === 'asegurado' ? ctx.id : null,
          document_context: documentContext,
        },
      })
      .subscribe({
        next: (event) => {
          switch (event.type) {
            case 'agent_step': {
              const thought = event.data.meta?.thought?.trim();
              appendStep({
                kind: 'agent_step',
                label: nodeLabel(event.data.node),
                detail: thought || undefined,
              });
              break;
            }
            case 'tool_call':
              appendStep({
                kind: 'tool_call',
                label: event.data.tool,
                detail: summarizeArgs(event.data.args),
                callId: event.data.call_id,
              });
              break;
            case 'tool_result': {
              attachResult(event.data.call_id, summarizeResult(event.data.result));
              const rows = extractTableRows(event.data.result);
              if (rows) attachTable(rows);
              break;
            }
            case 'chart':
              attachChart(event.data);
              break;
            case 'document':
              attachDocument(event.data);
              break;
            case 'token':
              ensureAssistantBubble();
              this._messages.update((messages) =>
                messages.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: msg.content + event.data.delta }
                    : msg,
                ),
              );
              break;
            case 'error':
              this._thinking.set(false);
              this._responding.set(false);
              this._messages.update((messages) => [
                ...messages,
                {
                  id: assistantId,
                  role: 'assistant',
                  content: `Error: ${event.data.message}`,
                },
              ]);
              break;
            case 'done':
              this._thinking.set(false);
              this._responding.set(false);
              void this.conversationsStore.refresh();
              break;
          }
        },
        complete: () => {
          this._thinking.set(false);
          this._responding.set(false);
          if (!assistantAdded) {
            this._messages.update((messages) => [
              ...messages,
              {
                id: assistantId,
                role: 'assistant',
                content: 'Lo siento, no pude generar una respuesta.',
              },
            ]);
          }
        },
        error: () => {
          this._thinking.set(false);
          this._responding.set(false);
          this._messages.update((messages) => [
            ...messages,
            {
              id: assistantId,
              role: 'assistant',
              content: 'No pude conectar con el agente. Verifica que el backend esté activo.',
            },
          ]);
        },
      });
  }
}
