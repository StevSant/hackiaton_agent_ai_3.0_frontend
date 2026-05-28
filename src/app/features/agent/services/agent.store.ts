import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConversationsApi } from '@core/api/clients/conversations.api';
import { environment } from '@core/config/env';
import { AppError } from '@core/errors/app-error';
import { SseClient } from '@core/realtime/sse.client';
import type { AgentMessage, AgentStep, ChartPayload } from '../models';
import { ConversationsStore } from './conversations.store';

let nextId = 0;
const newId = (): string => `m_${Date.now()}_${++nextId}`;

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

  readonly messages = this._messages.asReadonly();
  readonly thinking = this._thinking.asReadonly();
  readonly isResponding = this._responding.asReadonly();
  readonly conversationId = this._conversationId.asReadonly();

  startNewConversation(id: string): void {
    this._conversationId.set(id);
    this._messages.set([
      {
        id: `m_${Date.now()}_new`,
        role: 'assistant',
        content:
          'Hola, soy Centinela IA. Puedo ayudarte a explorar tu bandeja: rankings, patrones, casos atípicos y resúmenes ejecutivos. ¿En qué te puedo ayudar?',
      },
    ]);
  }

  async loadConversation(id: string): Promise<void> {
    try {
      const detail = await firstValueFrom(this.conversationsApi.get(id));
      this._conversationId.set(id);
      this._messages.set(
        detail.messages.map((m) => {
          // chart_payload only exists on persisted assistant messages and is
          // typed only after `pnpm gen:api` picks up the new backend schema.
          // Read it defensively so this works pre-regen too.
          const stored = (m as unknown as { chart_payload?: ChartPayload | null }).chart_payload;
          const chart = stored ?? undefined;
          return {
            id: m.id,
            role: m.role,
            content: m.content,
            steps: [],
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
            content:
              'Hola, soy Centinela IA. Puedo ayudarte a explorar tu bandeja: rankings, patrones, casos atípicos y resúmenes ejecutivos. ¿En qué te puedo ayudar?',
          },
        ]);
      }
    } catch (err) {
      if (err instanceof AppError && err.status === 404) {
        this.startNewConversation(id);
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

    this.sse
      .stream<AgentStreamEvent>({
        url,
        method: 'POST',
        body: {
          message: trimmed,
          conversation_id: this._conversationId(),
          context_claim_id: null,
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
