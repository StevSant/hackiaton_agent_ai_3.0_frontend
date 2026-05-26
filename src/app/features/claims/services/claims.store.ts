import { Injectable, computed, signal } from '@angular/core';

import { MOCK_CLAIMS } from './claims-mock.data';
import { MOCK_TREND } from './trend-mock.data';
import type { Claim, TrendPoint } from '../models';

@Injectable({ providedIn: 'root' })
export class ClaimsStore {
  private readonly _claims = signal<Claim[]>(MOCK_CLAIMS);
  private readonly _trend = signal<TrendPoint[]>(MOCK_TREND);

  readonly claims = this._claims.asReadonly();
  readonly trend = this._trend.asReadonly();

  readonly stats = computed(() => {
    const list = this._claims();
    const r = list.filter((c) => c.nivel === 'rojo').length;
    const y = list.filter((c) => c.nivel === 'amarillo').length;
    const g = list.filter((c) => c.nivel === 'verde').length;
    const avg = list.length ? Math.round(list.reduce((s, c) => s + c.score, 0) / list.length) : 0;
    const expuesto = list.filter((c) => c.nivel !== 'verde').reduce((s, c) => s + c.monto_reclamado, 0);
    return { r, y, g, avg, expuesto, total: list.length };
  });

  findById(id: string): Claim | undefined {
    return this._claims().find((c) => c.id === id);
  }
}
