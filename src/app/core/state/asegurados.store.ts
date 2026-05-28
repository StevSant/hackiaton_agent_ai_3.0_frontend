import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  AseguradosApi,
  type AseguradoCreate,
  type AseguradoDto,
  type AseguradoUpdate,
} from '@core/api/clients/asegurados.api';
import { AuthStore } from '@core/auth/auth.store';
import { AppError } from '@core/errors/app-error';
import type { Asegurado } from '@shared/models';

function alertasToColor(alertas: number): string {
  if (alertas >= 9) return 'oklch(0.6 0.18 25)';
  if (alertas >= 6) return 'oklch(0.58 0.17 25)';
  if (alertas >= 3) return 'oklch(0.7 0.16 75)';
  return 'oklch(0.62 0.13 155)';
}

function dtoToAsegurado(dto: AseguradoDto): Asegurado {
  return {
    id: dto.id_asegurado,
    nombre: dto.nombre,
    segmento: dto.segmento,
    ciudad: dto.ciudad,
    antiguedad: dto.antiguedad,
    num_polizas: dto.num_polizas,
    reclamos_ultimos_12_meses: dto.reclamos_ultimos_12_meses,
    mora_actual: dto.mora_actual,
    score_cliente_simulado: dto.score_cliente_simulado,
    casos: dto.casos,
    alertas: dto.alertas,
    monto: dto.monto,
    ramos: dto.ramos ?? [],
    color: alertasToColor(dto.alertas),
  };
}

@Injectable({ providedIn: 'root' })
export class AseguradosStore {
  private readonly api = inject(AseguradosApi);
  private readonly auth = inject(AuthStore);

  private readonly _asegurados = signal<Asegurado[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<AppError | null>(null);

  readonly asegurados = this._asegurados.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  private lastUserId: string | null = null;

  readonly stats = computed(() => {
    const list = this._asegurados();
    return {
      total: list.length,
      mora: list.filter((a) => a.mora_actual).length,
      alertas: list.reduce((s, a) => s + a.alertas, 0),
      monto: list.reduce((s, a) => s + a.monto, 0),
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
        this._asegurados.set([]);
      }
    });
  }

  async loadList(fresh = false): Promise<void> {
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const dtos = await firstValueFrom(this.api.listAsegurados({ fresh }));
      this._asegurados.set(dtos.map(dtoToAsegurado));
    } catch (err) {
      this._error.set(err instanceof AppError ? err : new AppError('unknown', String(err)));
    } finally {
      this._loading.set(false);
    }
  }

  async create(body: AseguradoCreate): Promise<Asegurado> {
    const dto = await firstValueFrom(this.api.createAsegurado(body));
    const created = dtoToAsegurado(dto);
    this._asegurados.update((list) => [created, ...list]); // optimistic
    await this.loadList(true); // reconcile aggregates (cache-busted)
    return created;
  }

  async update(id: string, body: AseguradoUpdate): Promise<void> {
    await firstValueFrom(this.api.updateAsegurado(id, body));
    this._asegurados.update((list) =>
      list.map((a) => (a.id === id ? applyAseguradoUpdate(a, body) : a)),
    );
    await this.loadList(true);
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.deleteAsegurado(id));
    this._asegurados.update((list) => list.filter((a) => a.id !== id)); // optimistic
    await this.loadList(true);
  }

  findById(id: string): Asegurado | undefined {
    return this._asegurados().find((a) => a.id === id);
  }
}

function applyAseguradoUpdate(a: Asegurado, body: AseguradoUpdate): Asegurado {
  return {
    ...a,
    nombre: body.nombre ?? a.nombre,
    segmento: body.segmento ?? a.segmento,
    ciudad: body.ciudad ?? a.ciudad,
    antiguedad: body.antiguedad ?? a.antiguedad,
    num_polizas: body.num_polizas ?? a.num_polizas,
    reclamos_ultimos_12_meses: body.reclamos_ultimos_12_meses ?? a.reclamos_ultimos_12_meses,
    mora_actual: body.mora_actual ?? a.mora_actual,
    score_cliente_simulado: body.score_cliente_simulado ?? a.score_cliente_simulado,
  };
}
