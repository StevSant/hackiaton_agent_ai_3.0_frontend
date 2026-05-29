import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  NetworkApi,
  type NetworkRelationsDto,
  type ProviderCreate,
  type ProviderDto,
  type ProviderUpdate,
} from '@core/api/clients/network.api';
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
  private readonly _relations = signal<NetworkRelationsDto>({ nodes: [], edges: [], casos: [] });
  private readonly _relationsLoading = signal<boolean>(false);

  readonly providers = this._providers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly relations = this._relations.asReadonly();
  readonly relationsLoading = this._relationsLoading.asReadonly();

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
        void this.loadRelations();
      } else {
        this._providers.set([]);
        this._relations.set({ nodes: [], edges: [], casos: [] });
      }
    });
  }

  async loadRelations(): Promise<void> {
    if (this._relationsLoading()) return;
    this._relationsLoading.set(true);
    try {
      this._relations.set(await firstValueFrom(this.api.relations()));
    } catch {
      // Relations are a visualization aid — keep the page usable on failure.
      this._relations.set({ nodes: [], edges: [], casos: [] });
    } finally {
      this._relationsLoading.set(false);
    }
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

  async create(body: ProviderCreate): Promise<Provider> {
    const dto = await firstValueFrom(this.api.createProvider(body));
    const created = dtoToProvider(dto);
    // Prepend the confirmed row so the analyst immediately sees what they added.
    this._providers.update((list) => [created, ...list]);
    return created;
  }

  async update(id: string, body: ProviderUpdate): Promise<void> {
    await firstValueFrom(this.api.updateProvider(id, body));
    // Merge the edited descriptive fields; aggregates are unchanged by an edit.
    this._providers.update((list) =>
      list.map((p) => (p.id === id ? applyProviderUpdate(p, body) : p)),
    );
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.deleteProvider(id));
    this._providers.update((list) => list.filter((p) => p.id !== id));
  }

  findById(id: string): Provider | undefined {
    return this._providers().find((p) => p.id === id);
  }
}

function applyProviderUpdate(p: Provider, body: ProviderUpdate): Provider {
  return {
    ...p,
    nombre: body.nombre ?? p.nombre,
    tipo: body.tipo ?? p.tipo,
    ciudad: body.ciudad ?? p.ciudad,
    listaRestrictiva: body.lista_restrictiva ?? p.listaRestrictiva,
  };
}
