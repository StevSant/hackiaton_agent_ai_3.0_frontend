import { Injectable, inject, signal } from '@angular/core';

import { environment } from '@core/config/env';
import { SseClient } from '@core/realtime/sse.client';
import { ClaimsStore } from '../../claims/services/claims.store';
import type { AgentMessage, AgentStep } from '../models';

let nextId = 0;
const newId = (): string => `m_${Date.now()}_${++nextId}`;

const newConversationId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

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

type AgentStreamEvent =
  | TokenEvent
  | DoneEvent
  | ErrorEvent
  | AgentStepEvent
  | ToolCallEvent
  | ToolResultEvent;

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
  private readonly claims = inject(ClaimsStore);

  private readonly _messages = signal<AgentMessage[]>([
    {
      id: newId(),
      role: 'assistant',
      content:
        'Hola, soy Centinela IA. Puedo ayudarte a explorar tu bandeja: rankings, patrones, casos atípicos y resúmenes ejecutivos. ¿En qué te puedo ayudar?',
    },
  ]);
  private readonly _thinking = signal<boolean>(false);
  private currentContextClaimId: string | null = null;
  private conversationId: string | null = null;

  readonly messages = this._messages.asReadonly();
  readonly thinking = this._thinking.asReadonly();

  primeForCase(caseId: string | null | undefined): void {
    if (!caseId) return;
    const claim = this.claims.findById(caseId);
    if (!claim) return;
    this.currentContextClaimId = caseId;
    this.conversationId = null;
    this._messages.set([
      {
        id: newId(),
        role: 'assistant',
        content: `Hola, soy Centinela IA. Estás revisando el caso **${claim.id}** — ${claim.cobertura} de ${claim.asegurado} (score ${claim.score}/100). ¿En qué te puedo ayudar con este caso?`,
      },
    ]);
  }

  reset(): void {
    this.currentContextClaimId = null;
    this.conversationId = null;
    this._messages.set([
      {
        id: newId(),
        role: 'assistant',
        content: 'Conversación nueva. ¿Qué quieres consultar?',
      },
    ]);
  }

  async ask(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || this._thinking()) return;

    if (!this.conversationId) {
      this.conversationId = newConversationId();
    }

    this._messages.update((messages) => [
      ...messages,
      { id: newId(), role: 'user', content: trimmed },
    ]);
    this._thinking.set(true);

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

    const url = `${environment.backendUrl}${environment.apiPrefix}/agent/ask`;

    this.sse
      .stream<AgentStreamEvent>({
        url,
        method: 'POST',
        body: {
          message: trimmed,
          conversation_id: this.conversationId,
          context_claim_id: this.currentContextClaimId,
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
              break;
          }
        },
        complete: () => {
          this._thinking.set(false);
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
