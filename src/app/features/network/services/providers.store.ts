import { Injectable, computed, signal } from '@angular/core';

import { MOCK_PROVIDERS } from './providers-mock.data';
import type { Provider } from '../models';

@Injectable({ providedIn: 'root' })
export class ProvidersStore {
  private readonly _providers = signal<Provider[]>(MOCK_PROVIDERS);

  readonly providers = this._providers.asReadonly();

  readonly stats = computed(() => {
    const list = this._providers();
    return {
      total: list.length,
      restrictiva: list.filter((p) => p.listaRestrictiva).length,
      alertas: list.reduce((s, p) => s + p.alertas, 0),
      monto: list.reduce((s, p) => s + p.monto, 0),
    };
  });

  findById(id: string): Provider | undefined {
    return this._providers().find((p) => p.id === id);
  }
}
