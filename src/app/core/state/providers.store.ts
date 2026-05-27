import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { NetworkApi, type ProviderDto } from '@core/api/clients/network.api';
import { AuthStore } from '@core/auth/auth.store';
import { AppError } from '@core/errors/app-error';
import type { Provider } from '@shared/models';

function alertasToColor(alertas: number): string {
  if (alertas >= 9) return 'oklch(0.6 0.18 25)';
  if (alertas >= 6) return 'oklch(0.58 0.17 25)';
  if (alertas >= 3) return 'oklch(0.7 0.16 75)';
  return 'oklch(0.62 0.13 155)';
}

function dtoToProvider(dto: ProviderDto): Provider {
  return {
    id: dto.id_proveedor,
    nombre: dto.nombre,
    tipo: dto.tipo,
    ciudad: dto.ciudad,
    casos: dto.casos,
    alertas: dto.alertas,
    monto: dto.monto,
    listaRestrictiva: dto.lista_restrictiva,
    color: alertasToColor(dto.alertas),
    ramos: dto.ramos ?? [],
  };
}

@Injectable({ providedIn: 'root' })
export class ProvidersStore {
  private readonly api = inject(NetworkApi);
  private readonly auth = inject(AuthStore);

  private readonly _providers = signal<Provider[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<AppError | null>(null);

  readonly providers = this._providers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  private lastUserId: string | null = null;

  readonly stats = computed(() => {
    const list = this._providers();
    return {
      total: list.length,
      restrictiva: list.filter((p) => p.listaRestrictiva).length,
      alertas: list.reduce((s, p) => s + p.alertas, 0),
      monto: list.reduce((s, p) => s + p.monto, 0),
    };
  });

  constructor() {
    effect(() => {
      const userId = this.auth.user()?.id ?? null;
      if (userId === this.lastUserId) return;
      this.lastUserId = userId;
      if (userId) {
        void this.loadList();
      } else {
        this._providers.set([]);
      }
    });
  }

  async loadList(): Promise<void> {
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const dtos = await firstValueFrom(this.api.listProviders());
      this._providers.set(dtos.map(dtoToProvider));
    } catch (err) {
      this._error.set(err instanceof AppError ? err : new AppError('unknown', String(err)));
    } finally {
      this._loading.set(false);
    }
  }

  findById(id: string): Provider | undefined {
    return this._providers().find((p) => p.id === id);
  }
}
