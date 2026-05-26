import { Injectable, computed, signal } from '@angular/core';

import { MOCK_AUDIT } from './audit-mock.data';
import type { AuditEvent } from '../models';

@Injectable({ providedIn: 'root' })
export class AuditStore {
  private readonly _events = signal<AuditEvent[]>(MOCK_AUDIT);
  readonly events = this._events.asReadonly();

  readonly stats = computed(() => {
    const list = this._events();
    const today = list.length;
    return {
      hoy: today,
      escalamientos: list.filter((e) => e.action === 'escalamiento').length,
      consultas: list.filter((e) => e.action === 'consulta_ia').length,
      manuales: list.filter((e) => e.actor === 'analista').length,
    };
  });
}
