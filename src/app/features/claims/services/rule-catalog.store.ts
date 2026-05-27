import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { RulesApi, type RuleMetaDto } from '@core/api/clients/rules.api';
import { AppError } from '@core/errors/app-error';

/**
 * Caches the rule catalog (GET /rules/catalog) for the rule-detail dialog.
 *
 * Replaces the hand-written `rule-narratives-mock.ts` so descriptions and
 * trigger text always come from the backend. The catalog is tiny (~21 rows)
 * so we fetch the whole thing once and look up by code locally.
 */
@Injectable({ providedIn: 'root' })
export class RuleCatalogStore {
  private readonly api = inject(RulesApi);

  private readonly _byCode = signal<ReadonlyMap<string, RuleMetaDto>>(new Map());
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<AppError | null>(null);
  private loadPromise: Promise<void> | null = null;

  readonly byCode = this._byCode.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Lazy-load the catalog once per app session. Idempotent. */
  ensureLoaded(): Promise<void> {
    if (this._byCode().size > 0) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.loadCatalog();
    return this.loadPromise;
  }

  findByCode(code: string): RuleMetaDto | null {
    return this._byCode().get(code) ?? null;
  }

  private async loadCatalog(): Promise<void> {
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const dtos = await firstValueFrom(this.api.listCatalog());
      const map = new Map<string, RuleMetaDto>();
      for (const dto of dtos) map.set(dto.code, dto);
      this._byCode.set(map);
    } catch (err) {
      this._error.set(err instanceof AppError ? err : new AppError('unknown', String(err)));
    } finally {
      this._loading.set(false);
    }
  }
}
