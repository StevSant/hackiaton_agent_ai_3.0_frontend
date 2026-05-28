import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConversationsApi } from '@core/api/clients/conversations.api';
import { environment } from '@core/config/env';
import { AppError } from '@core/errors/app-error';
import { SseClient } from '@core/realtime/sse.client';
import type { AgentMessage, AgentStep, ChartPayload } from '../models';
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

type AgentStreamEvent =
  | TokenEvent
  | DoneEvent
  | ErrorEvent
  | AgentStepEvent
  | ToolCallEvent
  | ToolResultEvent
  | ChartEvent;

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

  readonly messages = this._messages.asReadonly();
  readonly thinking = this._thinking.asReadonly();
  readonly isResponding = this._responding.asReadonly();
  readonly conversationId = this._conversationId.asReadonly();
  readonly chatContext = this._chatContext.asReadonly();

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

  startNewConversation(
    id: string,
    entity?: Claim | Provider | { kind: 'provider'; data: Provider } | { kind: 'asegurado'; data: Asegurado } | null,
    asegurado?: Asegurado | null,
  ): void {
    this._conversationId.set(id);

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
          return {
            id: m.id,
            role: m.role,
            content: m.content,
            steps,
            chart,
            // Already-rendered charts skip the "Ver como gráfico" affordance.
            chartAccepted: chart !== undefined ? true : undefined,
          };
        }),
      );
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

    const url = `${environment.backendUrl}${environment.apiPrefix}/agent/ask`;
    const ctx = this._chatContext();

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
            case 'tool_result':
              attachResult(event.data.call_id, summarizeResult(event.data.result));
              break;
            case 'chart':
              attachChart(event.data);
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
