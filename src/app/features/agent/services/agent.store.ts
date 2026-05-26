import { Injectable, inject, signal } from '@angular/core';

import { ClaimsStore } from '../../claims/services/claims.store';
import type { AgentMessage } from '../models';

let nextId = 0;
const newId = (): string => `m_${Date.now()}_${++nextId}`;

@Injectable({ providedIn: 'root' })
export class AgentStore {
  private readonly claims = inject(ClaimsStore);

  private readonly _messages = signal<AgentMessage[]>([
    {
      id: newId(),
      role: 'assistant',
      content:
        'Hola Lucía. Soy Centinela. Puedo ayudarte a explorar tu bandeja: rankings, patrones, casos atípicos, resúmenes ejecutivos. Pregúntame lo que necesites.',
    },
  ]);
  private readonly _thinking = signal<boolean>(false);

  readonly messages = this._messages.asReadonly();
  readonly thinking = this._thinking.asReadonly();

  primeForCase(caseId: string | null | undefined): void {
    if (!caseId) return;
    const c = this.claims.findById(caseId);
    if (!c) return;
    this._messages.set([
      {
        id: newId(),
        role: 'assistant',
        content: `Hola, soy Centinela. Estás revisando el caso ${c.id} — ${c.cobertura} de ${c.asegurado} con score ${c.score}/100. ¿En qué puedo ayudarte?`,
      },
    ]);
  }

  reset(): void {
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
    if (!trimmed) return;
    this._messages.update((m) => [...m, { id: newId(), role: 'user', content: trimmed }]);
    this._thinking.set(true);
    await new Promise((r) => setTimeout(r, 900));
    this._messages.update((m) => [
      ...m,
      { id: newId(), role: 'assistant', content: this.mockAnswer(trimmed) },
    ]);
    this._thinking.set(false);
  }

  private mockAnswer(q: string): string {
    const top = [...this.claims.claims()].sort((a, b) => b.score - a.score).slice(0, 5);
    return `Los 5 siniestros con mayor riesgo en tu bandeja son: ${top
      .map((c) => `${c.id} (${c.score})`)
      .join(', ')}. Te recomiendo priorizar los rojos antes de la próxima reunión de la Unidad Antifraude. (respuesta de demostración — la integración con el agente se conectará vía SSE).`;
  }
}
