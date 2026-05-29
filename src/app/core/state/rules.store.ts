import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  RulesApi,
  type RescoreStatusDto,
  type RuleConfigDto,
  type RuleConfigPatchDto,
} from '@core/api/clients/rules.api';
import { AuthStore } from '@core/auth/auth.store';
import { AppError } from '@core/errors/app-error';
import type { FraudRule } from '@shared/models';

// Bump suffix to invalidate cached payloads after a schema change.
const CACHE_KEY = 'centinela:rules-catalog:v1';
// Count of rule edits saved since the last full rescore (survives a refresh).
const PENDING_KEY = 'centinela:rules-pending-rescore';

function readPending(): number {
  if (typeof window === 'undefined') return 0;
  const n = Number(window.localStorage.getItem(PENDING_KEY) ?? '0');
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function writePending(n: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PENDING_KEY, String(n));
  } catch {
    // storage quota / disabled — silently skip
  }
}

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
    thresholds: dto.thresholds ?? {},
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

// Poll cadence for the background rescore job's status (ms).
const RESCORE_POLL_MS = 1200;

@Injectable({ providedIn: 'root' })
export class RulesStore {
  private readonly api = inject(RulesApi);
  private readonly auth = inject(AuthStore);

  private readonly _rules = signal<FraudRule[]>(readCache() ?? []);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<AppError | null>(null);
  private readonly _hydratedFromCache = signal<boolean>(readCache() !== null);
  // Rule code currently being saved (PATCH in flight); null when idle.
  private readonly _saving = signal<string | null>(null);
  // Edits saved since the last rescore — drives the "Recalcular" affordance.
  private readonly _pendingChanges = signal<number>(readPending());
  // Latest progress snapshot of the background rescore job; null when idle.
  private readonly _rescoreProgress = signal<RescoreStatusDto | null>(null);
  private readonly _rescoring = signal<boolean>(false);
  // Result of the last completed rescore (cleared on the next rule edit).
  private readonly _lastRescore = signal<RescoreStatusDto | null>(null);
  private _pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly rules = this._rules.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly pendingChanges = this._pendingChanges.asReadonly();
  readonly rescoreProgress = this._rescoreProgress.asReadonly();
  readonly rescoring = this._rescoring.asReadonly();
  readonly lastRescore = this._lastRescore.asReadonly();
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
        // A background rescore may be mid-flight from before a refresh.
        void this.resumeRescoreIfRunning();
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

  /** Pause/reactivate a rule. Optimistic flip, reverted if the PATCH fails. */
  async toggle(code: string): Promise<void> {
    const current = this._rules().find((r) => r.code === code);
    if (!current || this._saving()) return;
    const next = !current.enabled;
    this.applyLocal(code, { enabled: next });
    await this.patch(code, { enabled: next }, { enabled: current.enabled });
  }

  /** Retune a rule's thresholds. Optimistic, reverted if the PATCH fails. */
  async updateThresholds(code: string, thresholds: Record<string, number>): Promise<void> {
    const current = this._rules().find((r) => r.code === code);
    if (!current || this._saving()) return;
    this.applyLocal(code, { thresholds: { ...current.thresholds, ...thresholds } });
    await this.patch(code, { thresholds }, { thresholds: current.thresholds });
  }

  private applyLocal(code: string, patch: Partial<FraudRule>): void {
    this._rules.update((list) => list.map((r) => (r.code === code ? { ...r, ...patch } : r)));
  }

  private async patch(
    code: string,
    body: RuleConfigPatchDto,
    rollback: Partial<FraudRule>,
  ): Promise<void> {
    this._saving.set(code);
    this._error.set(null);
    try {
      const dto = await firstValueFrom(this.api.patchRule(code, body));
      this.applyLocal(code, dtoToRule(dto));
      writeCache(this._rules());
      // Edits no longer rescore server-side — track them so the analyst can
      // batch several changes and apply them with ONE explicit rescore.
      this._lastRescore.set(null);
      this._pendingChanges.update((n) => n + 1);
      writePending(this._pendingChanges());
    } catch (err) {
      this.applyLocal(code, rollback); // revert the optimistic change
      this._error.set(err instanceof AppError ? err : new AppError('unknown', String(err)));
    } finally {
      this._saving.set(null);
    }
  }

  /** Start the background rescore job and poll its progress until it settles. */
  async rescore(): Promise<void> {
    if (this._rescoring()) return;
    this._rescoring.set(true);
    this._rescoreProgress.set(null);
    this._lastRescore.set(null);
    this._error.set(null);
    try {
      // 202 returns immediately — the job runs server-side, detached.
      const status = await firstValueFrom(this.api.startRescore());
      this.applyRescoreStatus(status);
      if (status.status === 'running') this.beginPolling();
    } catch (err) {
      this._rescoring.set(false);
      this._error.set(err instanceof AppError ? err : new AppError('unknown', String(err)));
    }
  }

  /** Adopt an already-running job after a page refresh / late navigation. */
  async resumeRescoreIfRunning(): Promise<void> {
    if (this._rescoring()) return;
    try {
      const status = await firstValueFrom(this.api.rescoreStatus());
      if (status.status === 'running') {
        this._rescoring.set(true);
        this._rescoreProgress.set(status);
        this.beginPolling();
      }
    } catch {
      // status probe is best-effort — the page works without it
    }
  }

  private beginPolling(): void {
    this.stopPolling();
    this._pollTimer = setInterval(() => void this.pollRescore(), RESCORE_POLL_MS);
  }

  private stopPolling(): void {
    if (this._pollTimer !== null) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  private async pollRescore(): Promise<void> {
    try {
      this.applyRescoreStatus(await firstValueFrom(this.api.rescoreStatus()));
    } catch {
      // transient poll failure (e.g. dev-server reload) — keep polling
    }
  }

  private applyRescoreStatus(status: RescoreStatusDto): void {
    switch (status.status) {
      case 'running':
        this._rescoring.set(true);
        this._rescoreProgress.set(status);
        break;
      case 'done':
        this.stopPolling();
        this._rescoring.set(false);
        this._rescoreProgress.set(null);
        this._lastRescore.set(status);
        this._pendingChanges.set(0);
        writePending(0);
        void this.loadList(); // refresh activation counts with the new scores
        break;
      case 'error':
        this.stopPolling();
        this._rescoring.set(false);
        this._rescoreProgress.set(null);
        this._error.set(
          new AppError('rescore_failed', status.error ?? 'El recálculo falló.'),
        );
        break;
      case 'idle':
        // Job vanished mid-poll (server restarted) — stop and surface it.
        if (this._rescoring()) {
          this.stopPolling();
          this._rescoring.set(false);
          this._rescoreProgress.set(null);
          this._error.set(
            new AppError('rescore_interrupted', 'El recálculo se interrumpió. Vuelve a lanzarlo.'),
          );
        }
        break;
    }
  }
}
