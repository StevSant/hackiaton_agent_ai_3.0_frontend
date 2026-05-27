import { Injectable, inject, signal } from '@angular/core';

import { environment } from '@core/config/env';
import { SseClient } from '@core/realtime/sse.client';
import { ClaimsStore } from '../../claims/services/claims.store';
import type { AgentMessage } from '../models';

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

type AgentStreamEvent = TokenEvent | DoneEvent | ErrorEvent;

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

  readonly messages = this._messages.asReadonly();
  readonly thinking = this._thinking.asReadonly();

  primeForCase(caseId: string | null | undefined): void {
    if (!caseId) return;
    const claim = this.claims.findById(caseId);
    if (!claim) return;
    this.currentContextClaimId = caseId;
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

    const currentHistory = this._messages()
      .map((msg) => ({ role: msg.role, content: msg.content }));

    this._messages.update((messages) => [...messages, { id: newId(), role: 'user', content: trimmed }]);
    this._thinking.set(true);

    const assistantId = newId();
    let assistantAdded = false;

    const url = `${environment.backendUrl}${environment.apiPrefix}/agent/ask`;

    this.sse.stream<AgentStreamEvent>({
      url,
      method: 'POST',
      body: {
        message: trimmed,
        history: currentHistory,
        context_claim_id: this.currentContextClaimId,
      },
    }).subscribe({
      next: (event) => {
        if (event.type === 'token') {
          if (!assistantAdded) {
            // Add the assistant bubble only on the first token — avoids empty bubble flash
            assistantAdded = true;
            this._thinking.set(false);
            this._messages.update((messages) => [
              ...messages,
              { id: assistantId, role: 'assistant', content: event.data.delta },
            ]);
          } else {
            this._messages.update((messages) =>
              messages.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content + event.data.delta }
                  : msg,
              ),
            );
          }
        }
        if (event.type === 'error') {
          this._thinking.set(false);
          this._messages.update((messages) => [
            ...messages,
            { id: assistantId, role: 'assistant', content: `Error: ${event.data.message}` },
          ]);
        }
      },
      complete: () => {
        this._thinking.set(false);
        if (!assistantAdded) {
          this._messages.update((messages) => [
            ...messages,
            { id: assistantId, role: 'assistant', content: 'Lo siento, no pude generar una respuesta.' },
          ]);
        }
      },
      error: () => {
        this._thinking.set(false);
        this._messages.update((messages) => [
          ...messages,
          { id: assistantId, role: 'assistant', content: 'No pude conectar con el agente. Verifica que el backend esté activo.' },
        ]);
      },
    });
  }
}
