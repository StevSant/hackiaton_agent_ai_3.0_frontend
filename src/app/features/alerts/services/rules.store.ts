import { Injectable, computed, signal } from '@angular/core';

import { MOCK_RULES } from './rules-mock.data';
import type { FraudRule } from '../models';

@Injectable({ providedIn: 'root' })
export class RulesStore {
  private readonly _rules = signal<FraudRule[]>(MOCK_RULES);
  readonly rules = this._rules.asReadonly();

  readonly stats = computed(() => {
    const list = this._rules();
    return {
      total: list.length,
      activas: list.filter((r) => r.enabled).length,
      criticas: list.filter((r) => r.clasificacion === 'rojo').length,
      activaciones: list.reduce((s, r) => s + r.activaciones30d, 0),
    };
  });

  toggle(code: string): void {
    this._rules.update((list) =>
      list.map((r) => (r.code === code ? { ...r, enabled: !r.enabled } : r)),
    );
  }
}
