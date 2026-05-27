import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ClaimsApi } from '@core/api/clients/claims.api';
import type { ClaimDto, ClaimSummaryDto } from '@core/api/clients/claim.dto';
import { AuthStore } from '@core/auth/auth.store';
import { AppError } from '@core/errors/app-error';
import type { Claim, ClaimReview, DictamenOutcome } from '@shared/models';

/**
 * Default page size for the initial claims fetch. The list-page filtering
 * happens client-side over this set, so we ask for a generous window — the
 * backend caps `page_size` at 500 (see backend Page schema). If the working
 * set ever grows past that, the loop continues across pages, but the common
 * case is one round-trip and an immediate render.
 */
const PAGE_SIZE = 500;
const DEFAULT_REVIEW: ClaimReview = { status: 'pendiente', bounce_count: 0 };

@Injectable({ providedIn: 'root' })
export class ClaimsStore {
  private readonly api = inject(ClaimsApi);
  private readonly auth = inject(AuthStore);

  private readonly _claims = signal<Claim[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<AppError | null>(null);
  private readonly _detailLoads = new Map<string, Promise<Claim | null>>();
  // Tracks which claim ids have had their full detail fetched (alertas, ML
  // factors, anomaly score, documents, similar narratives). Signal-backed so
  // detail pages can render loading skeletons until the detail call resolves —
  // without this, the page falls back to "Modelo no cargado" empty states
  // while the data is genuinely still in flight.
  private readonly _detailLoadedIds = signal<ReadonlySet<string>>(new Set());

  readonly claims = this._claims.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly detailLoadedIds = this._detailLoadedIds.asReadonly();
  private initialized = false;
  private lastUserId: string | null = null;

  readonly stats = computed(() => {
    const list = this._claims();
    const r = list.filter((c) => c.nivel === 'rojo').length;
    const y = list.filter((c) => c.nivel === 'amarillo').length;
    const g = list.filter((c) => c.nivel === 'verde').length;
    const avg = list.length ? Math.round(list.reduce((s, c) => s + c.score, 0) / list.length) : 0;
    const expuesto = list
      .filter((c) => c.nivel !== 'verde')
      .reduce((s, c) => s + c.monto_reclamado, 0);
    return { r, y, g, avg, expuesto, total: list.length };
  });

  readonly antifraudeInbox = computed(() =>
    this._claims().filter(
      (c) => c.review.status === 'escalado' || c.review.status === 'en_revision',
    ),
  );

  constructor() {
    // Reload whenever the authenticated user changes. Same user (token refresh,
    // re-render) → noop. Logout → clears the list so the next role doesn't
    // briefly see the previous role's data.
    effect(() => {
      const userId = this.auth.user()?.id ?? null;
      if (userId === this.lastUserId) return;
      this.lastUserId = userId;
      this._detailLoads.clear();
      if (userId) {
        void this.loadList();
      } else {
        this._claims.set([]);
      }
    });
  }

  /** Pull the full claims list from the backend, page by page.
   *
   * Retries once after a short delay so Supabase pooler cold-starts (first
   * connection after idle frequently 500s) don't strand the UI in an empty
   * state for the rest of the session.
   */
  async loadList(): Promise<void> {
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    let attempt = 0;
    while (true) {
      try {
        const items: ClaimSummaryDto[] = [];
        let page = 0;
        while (true) {
          const result = await firstValueFrom(
            this.api.list({ page, page_size: PAGE_SIZE }),
          );
          items.push(...result.items);
          if (items.length >= result.total || result.items.length === 0) break;
          page += 1;
        }
        const summaries = items.map((row) => summaryToClaim(row));
        const detailById = new Map(this._claims().filter((c) => c.alertas?.length).map((c) => [c.id, c]));
        const merged = summaries.map((s) => detailById.get(s.id) ?? s);
        this._claims.set(merged);
        this.initialized = true;
        break;
      } catch (error) {
        if (attempt === 0) {
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        this._error.set(error instanceof AppError ? error : toAppError(error));
        break;
      }
    }
    this._loading.set(false);
  }

  /**
   * Load full detail for a single claim. Cached so repeat calls (back/forward
   * navigation between detail pages) hit the network only once per id.
   */
  async loadDetail(id: string): Promise<Claim | null> {
    const cached = this._detailLoads.get(id);
    if (cached) return cached;
    return this.fetchDetail(id);
  }

  async reloadDetail(id: string): Promise<Claim | null> {
    this._detailLoads.delete(id);
    this._detailLoadedIds.update((s) => {
      if (!s.has(id)) return s;
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    return this.fetchDetail(id);
  }

  isDetailLoaded(id: string): boolean {
    return this._detailLoadedIds().has(id);
  }

  private fetchDetail(id: string): Promise<Claim | null> {
    const promise = (async (): Promise<Claim | null> => {
      try {
        const dto = await firstValueFrom(this.api.detail(id));
        const claim = dtoToClaim(dto);
        this.upsert(claim);
        this._detailLoadedIds.update((s) => {
          if (s.has(id)) return s;
          return new Set([...s, id]);
        });
        return claim;
      } catch (error) {
        this._error.set(error instanceof AppError ? error : toAppError(error));
        return null;
      }
    })();
    this._detailLoads.set(id, promise);
    return promise;
  }

  findById(id: string): Claim | undefined {
    return this._claims().find((c) => c.id === id);
  }

  async escalate(id: string, note?: string): Promise<void> {
    const dto = await firstValueFrom(this.api.escalate(id, note));
    this.upsert(dtoToClaim(dto));
  }

  async take(id: string): Promise<void> {
    const dto = await firstValueFrom(this.api.take(id));
    this.upsert(dtoToClaim(dto));
  }

  async dictamen(id: string, outcome: DictamenOutcome, justificacion: string): Promise<void> {
    const dto = await firstValueFrom(this.api.dictamen(id, outcome, justificacion));
    this.upsert(dtoToClaim(dto));
  }

  async close(id: string, note?: string): Promise<void> {
    const dto = await firstValueFrom(this.api.close(id, note));
    this.upsert(dtoToClaim(dto));
  }

  /**
   * Hackathon-grade local override: callers that haven't been migrated to the
   * async action methods still mutate review state through this entry point.
   * Updates the in-memory signal so the UI reflects the new state immediately;
   * does NOT round-trip to the backend.
   *
   * Why: a few call-sites still use it for purely-local UI affordances (e.g.
   * the dictamen modal's optimistic close). New code should call escalate /
   * take / dictamen / close instead.
   */
  patchReview(id: string, patch: Partial<ClaimReview>): void {
    this._claims.update((list) =>
      list.map((c) => (c.id === id ? { ...c, review: { ...c.review, ...patch } } : c)),
    );
  }

  private upsert(claim: Claim): void {
    this._claims.update((list) => {
      const idx = list.findIndex((c) => c.id === claim.id);
      if (idx === -1) return [...list, claim];
      const next = list.slice();
      // Preserve any accordion data we already had if the new payload omits it.
      const prev = next[idx];
      next[idx] = {
        ...claim,
        alertas: claim.alertas?.length ? claim.alertas : prev.alertas ?? [],
        timeline: claim.timeline?.length ? claim.timeline : prev.timeline ?? [],
        documentos: claim.documentos?.length ? claim.documentos : prev.documentos ?? [],
      };
      return next;
    });
  }
}

function summaryToClaim(row: ClaimSummaryDto): Claim {
  return {
    id: row.id,
    ramo: row.ramo,
    cobertura: row.cobertura,
    asegurado: row.asegurado,
    asegurado_id: '',
    poliza: '',
    ciudad: row.ciudad,
    fecha_ocurrencia: row.fecha_ocurrencia,
    fecha_reporte: row.fecha_ocurrencia,
    monto_reclamado: row.monto_reclamado,
    suma_asegurada: 0,
    estado: row.estado,
    sucursal: '',
    proveedor: null,
    descripcion: '',
    score: row.score,
    nivel: row.nivel,
    alertas: [],
    timeline: [],
    documentos: [],
    review: { ...DEFAULT_REVIEW, status: row.review_status },
  };
}

function dtoToClaim(dto: ClaimDto): Claim {
  return {
    id: dto.id,
    ramo: dto.ramo,
    cobertura: dto.cobertura,
    asegurado: dto.asegurado,
    asegurado_id: dto.asegurado_id,
    poliza: dto.poliza,
    ciudad: dto.ciudad,
    fecha_ocurrencia: dto.fecha_ocurrencia,
    fecha_reporte: dto.fecha_reporte,
    monto_reclamado: dto.monto_reclamado,
    suma_asegurada: dto.suma_asegurada,
    estado: dto.estado,
    sucursal: dto.sucursal,
    vehiculo: dto.vehiculo
      ? {
          marca: dto.vehiculo.marca,
          modelo: dto.vehiculo.modelo,
          anio: dto.vehiculo.anio,
          placa: dto.vehiculo.placa,
          chasis: dto.vehiculo.chasis ?? undefined,
        }
      : undefined,
    proveedor: dto.proveedor ?? null,
    descripcion: dto.descripcion,
    score: dto.score,
    nivel: dto.nivel,
    alertas: dto.alertas ?? [],
    timeline: (dto.timeline ?? []).map((t) => ({
      date: t.date,
      title: t.title,
      tone: t.tone,
      desc: t.desc ?? undefined,
    })),
    documentos: (dto.documentos ?? []).map((d) => ({
      tipo: d.tipo,
      estado: d.estado,
      falta: d.falta ?? false,
    })),
    review: reviewFromDto(dto.review),
    ml_probability: dto.ml_probability ?? null,
    ml_factors: dto.ml_factors ?? [],
    anomaly_score: dto.anomaly_score ?? null,
    nearest_normal_claim_id: dto.nearest_normal_claim_id ?? null,
    similar: dto.similar ?? [],
  };
}

function reviewFromDto(review: ClaimDto['review']): ClaimReview {
  if (!review) return { ...DEFAULT_REVIEW };
  return {
    status: review.status,
    escalated_by: review.escalated_by ?? undefined,
    escalated_by_name: review.escalated_by_name ?? undefined,
    escalated_at: review.escalated_at ?? undefined,
    escalation_note: review.escalation_note ?? undefined,
    assigned_to: review.assigned_to ?? undefined,
    assigned_to_name: review.assigned_to_name ?? undefined,
    taken_at: review.taken_at ?? undefined,
    dictamen_outcome: review.dictamen_outcome ?? undefined,
    dictamen_justificacion: review.dictamen_justificacion ?? undefined,
    dictaminado_by: review.dictaminado_by ?? undefined,
    dictaminado_by_name: review.dictaminado_by_name ?? undefined,
    dictaminado_at: review.dictaminado_at ?? undefined,
    bounce_count: review.bounce_count ?? 0,
    bounce_note: review.bounce_note ?? undefined,
    closed_by: review.closed_by ?? undefined,
    closed_by_name: review.closed_by_name ?? undefined,
    closed_at: review.closed_at ?? undefined,
    closed_note: review.closed_note ?? undefined,
  };
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : 'Error al cargar la información.';
  return new AppError('claims/load', message);
}
