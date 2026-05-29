import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { RulesApi, type RuleConfigDto } from '@core/api/clients/rules.api';
import { AuthStore } from '@core/auth/auth.store';
import { AppError } from '@core/errors/app-error';
import type { FraudRule } from '@shared/models';

// Bump suffix to invalidate cached payloads after a schema change.
const CACHE_KEY = 'centinela:rules-catalog:v1';

function dtoToRule(dto: RuleConfigDto): FraudRule {
  return {
    code: dto.code,
    titulo: dto.titulo,
    descripcion: dto.descripcion,
    clasificacion: dto.clasificacion,
    kind: dto.kind,
    maxPts: dto.max_pts,
    activaciones30d: dto.activaciones_30d,
    enabled: dto.enabled,
  };
}

function readCache(): FraudRule[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FraudRule[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(rules: FraudRule[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(rules));
  } catch {
    // storage quota / disabled — silently skip
  }
}

@Injectable({ providedIn: 'root' })
export class RulesStore {
  private readonly api = inject(RulesApi);
  private readonly auth = inject(AuthStore);

  private readonly _rules = signal<FraudRule[]>(readCache() ?? []);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<AppError | null>(null);
  private readonly _hydratedFromCache = signal<boolean>(readCache() !== null);

  readonly rules = this._rules.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  // True while we have no data (no cache, no fetched payload yet) AND a fetch
  // is in flight — the page uses this to decide whether to show a skeleton vs.
  // render the (possibly stale) cached rows while a background revalidate runs.
  readonly initialLoading = computed(
    () => this._loading() && this._rules().length === 0,
  );

  private lastUserId: string | null = null;

  readonly stats = computed(() => {
    const list = this._rules();
    return {
      total: list.length,
      activas: list.filter((r) => r.enabled).length,
      criticas: list.filter((r) => r.clasificacion === 'rojo').length,
      activaciones: list.reduce((s, r) => s + r.activaciones30d, 0),
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
        this._rules.set([]);
        this._hydratedFromCache.set(false);
      }
    });
  }

  async loadList(): Promise<void> {
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const dtos = await firstValueFrom(this.api.listConfig());
      const next = dtos.map(dtoToRule);
      this._rules.set(next);
      writeCache(next);
      this._hydratedFromCache.set(false);
    } catch (err) {
      this._error.set(err instanceof AppError ? err : new AppError('unknown', String(err)));
    } finally {
      this._loading.set(false);
    }
  }

  toggle(code: string): void {
    // Optimistic local toggle — persistence endpoint not yet implemented.
    this._rules.update((list) =>
      list.map((r) => (r.code === code ? { ...r, enabled: !r.enabled } : r)),
    );
  }
}
