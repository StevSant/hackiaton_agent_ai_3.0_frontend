import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';

import { ClaimsApi } from '@core/api/clients/claims.api';
import { environment } from '@core/config/env';
import { SseClient } from '@core/realtime/sse.client';
import type { PanelAnalysis } from '@shared/models';
import type { RiskTier } from '@shared/utils';
import type { PanelConsensus, PanelRosterEntry, PanelStreamEvent } from '../models';
import type { SpecialistLane } from '../models/specialist-lane.model';

type PanelPhase = 'idle' | 'round1' | 'round2' | 'moderating' | 'done' | 'error';

@Injectable({ providedIn: 'root' })
export class FraudPanelStore {
  private readonly sse = inject(SseClient);
  private readonly claimsApi = inject(ClaimsApi);

  // Cancel any in-flight SSE run before starting a new one.
  private _runSub: Subscription | null = null;
  private _openSub: Subscription | null = null;

  private _claimId = '';
  private readonly _phase = signal<PanelPhase>('idle');
  private readonly _lanes = signal<SpecialistLane[]>([]);
  private readonly _moderator = signal<string>('');
  private readonly _consensus = signal<PanelConsensus | null>(null);
  private readonly _error = signal<string | null>(null);
  // Deterministic engine verdict for this claim — the panel's baseline to contrast.
  private readonly _engineScore = signal<number | null>(null);
  private readonly _engineNivel = signal<RiskTier | null>(null);
  // Current review status (gates the escalate / mark-reviewed actions).
  private readonly _reviewStatus = signal<string | null>(null);
  private readonly _acting = signal<boolean>(false);
  private readonly _actionDone = signal<string | null>(null);

  readonly phase = this._phase.asReadonly();
  readonly lanes = this._lanes.asReadonly();
  readonly moderator = this._moderator.asReadonly();
  readonly consensus = this._consensus.asReadonly();
  readonly error = this._error.asReadonly();
  readonly engineScore = this._engineScore.asReadonly();
  readonly engineNivel = this._engineNivel.asReadonly();
  readonly reviewStatus = this._reviewStatus.asReadonly();
  readonly acting = this._acting.asReadonly();
  readonly actionDone = this._actionDone.asReadonly();
  readonly running = computed(() => ['round1', 'round2', 'moderating'].includes(this._phase()));
  // Only a still-pendiente claim can be escalated / closed from here.
  readonly canAct = computed(
    () => this._consensus() !== null && this._reviewStatus() === 'pendiente',
  );

  reset(): void {
    this._phase.set('idle');
    this._lanes.set([]);
    this._moderator.set('');
    this._consensus.set(null);
    this._error.set(null);
    this._actionDone.set(null);
  }

  /** Open the panel for a claim: replay the cached debate if one exists, else run live. */
  open(claimId: string): void {
    this._claimId = claimId;
    this._openSub?.unsubscribe();
    this._openSub = this.claimsApi.detail(claimId).subscribe({
      next: (claim) => {
        // Capture the engine baseline + workflow state for the Motor-vs-Panel
        // contrast and the escalate / mark-reviewed actions.
        this._engineScore.set(claim.score);
        this._engineNivel.set(claim.nivel);
        this._reviewStatus.set(claim.review?.status ?? null);
        const cached = claim.panel_analysis;
        if (cached && (cached.lanes?.length || cached.consensus)) {
          this.loadCached(cached);
        } else {
          this.run(claimId);
        }
      },
      // If the claim fetch fails, fall back to a live run rather than blocking.
      error: () => this.run(claimId),
    });
  }

  /** Build the review note carried into escalate / mark-reviewed from the consensus. */
  private panelNote(): string {
    const c = this._consensus();
    if (!c) return 'Panel multi-agente.';
    const pct = Math.round((c.nivel_de_acuerdo ?? 0) * 100);
    const fp = c.posible_falso_positivo ? ' · posible falso positivo' : '';
    return `Panel multi-agente: ${c.nivel_final} (acuerdo ${pct}%)${fp}. ${c.accion_recomendada}`;
  }

  /** Escalate this claim to Antifraude, carrying the panel consensus as evidence. */
  async escalateWithPanel(): Promise<void> {
    if (!this.canAct() || this._acting()) return;
    this._acting.set(true);
    try {
      await firstValueFrom(this.claimsApi.escalate(this._claimId, this.panelNote()));
      this._reviewStatus.set('escalado');
      this._actionDone.set('Escalado a Antifraude con el análisis del panel.');
    } catch {
      this._actionDone.set('No se pudo escalar el caso.');
    } finally {
      this._acting.set(false);
    }
  }

  /** Mark this claim reviewed-without-escalation, carrying the panel consensus as the note. */
  async markReviewedWithPanel(): Promise<void> {
    if (!this.canAct() || this._acting()) return;
    this._acting.set(true);
    try {
      await firstValueFrom(this.claimsApi.close(this._claimId, this.panelNote()));
      this._reviewStatus.set('revisado_sin_escalar');
      this._actionDone.set('Caso marcado como revisado sin escalar.');
    } catch {
      this._actionDone.set('No se pudo marcar el caso.');
    } finally {
      this._acting.set(false);
    }
  }

  /** Hydrate the store from a previously-persisted panel result (static replay). */
  loadCached(panel: PanelAnalysis): void {
    this._runSub?.unsubscribe();
    this._runSub = null;
    this.reset();
    this._lanes.set(
      (panel.lanes ?? []).map((l) => ({
        agentId: l.agent_id,
        displayName: l.display_name,
        lens: l.lens,
        narracion: l.narracion ?? '',
        verdict: l.verdict
          ? {
              nivel: l.verdict.nivel ?? 'verde',
              dictamen: l.verdict.dictamen ?? '',
              puntos_clave: l.verdict.puntos_clave ?? [],
              confianza: l.verdict.confianza ?? 'media',
              citas: l.verdict.citas ?? [],
            }
          : null,
        rebuttalNarracion: l.rebuttal_narracion ?? '',
        rebuttal: l.rebuttal
          ? {
              ajuste: l.rebuttal.ajuste ?? '',
              nivel_actualizado: l.rebuttal.nivel_actualizado ?? 'verde',
              cambia_postura: l.rebuttal.cambia_postura ?? false,
            }
          : null,
        failed: l.failed ?? false,
        r2Failed: !l.rebuttal && !(l.rebuttal_narracion ?? ''),
      })),
    );
    this._moderator.set(panel.moderator_text ?? '');
    const c = panel.consensus;
    this._consensus.set(
      c
        ? {
            nivel_final: c.nivel_final ?? 'verde',
            nivel_de_acuerdo: c.nivel_de_acuerdo ?? 0,
            puntos_de_conflicto: c.puntos_de_conflicto ?? [],
            resumen: c.resumen ?? '',
            accion_recomendada: c.accion_recomendada ?? '',
            posible_falso_positivo: c.posible_falso_positivo ?? false,
          }
        : null,
    );
    this._phase.set('done');
  }

  run(claimId: string): void {
    this._claimId = claimId;
    // Unsubscribe cancels the AbortController inside SseClient, aborting any in-flight fetch.
    this._openSub?.unsubscribe();
    this._openSub = null;
    this._runSub?.unsubscribe();
    this._runSub = null;

    this.reset();
    this._phase.set('round1');

    const url = `${environment.backendUrl}${environment.apiPrefix}/claims/${claimId}/panel`;

    this._runSub = this.sse
      .stream<PanelStreamEvent>({ url, method: 'POST', body: {} })
      .subscribe({
        next: (event) => this.apply(event),
        error: () => {
          this._error.set('Se interrumpió el panel.');
          this._phase.set('error');
        },
        complete: () => {
          if (this._phase() !== 'error') this._phase.set('done');
        },
      });
  }

  private upsertLane(agentId: string, patch: Partial<SpecialistLane>): void {
    this._lanes.update((lanes) =>
      lanes.map((l) => (l.agentId === agentId ? { ...l, ...patch } : l)),
    );
  }

  private apply(event: PanelStreamEvent): void {
    switch (event.type) {
      case 'panel_start':
        this._lanes.set(
          event.data.roster.map((r: PanelRosterEntry) => ({
            agentId: r.agent_id,
            displayName: r.display_name,
            lens: r.lens,
            narracion: '',
            verdict: null,
            rebuttalNarracion: '',
            rebuttal: null,
            failed: false,
            r2Failed: false,
          })),
        );
        break;

      case 'agent_token': {
        const lane = this._lanes().find((l) => l.agentId === event.data.agent_id);
        if (!lane) break;
        if (event.data.round === 1) {
          this.upsertLane(event.data.agent_id, { narracion: lane.narracion + event.data.delta });
        } else {
          if (this._phase() === 'round1') this._phase.set('round2');
          this.upsertLane(event.data.agent_id, {
            rebuttalNarracion: lane.rebuttalNarracion + event.data.delta,
          });
        }
        break;
      }

      case 'agent_verdict':
        this.upsertLane(event.data.agent_id, { verdict: event.data.verdict });
        break;

      case 'agent_rebuttal':
        this._phase.set('round2');
        this.upsertLane(event.data.agent_id, { rebuttal: event.data.rebuttal });
        break;

      case 'moderator_token':
        this._phase.set('moderating');
        this._moderator.update((t) => t + event.data.delta);
        break;

      case 'consensus':
        this._consensus.set(event.data.consensus);
        break;

      case 'error':
        if (event.data.agent_id) {
          // R2 failure keeps the good R1 verdict — only the réplica is missing.
          // R1 (or any other agent error) means the lane has no real opinion.
          if (event.data.code === 'specialist_r2_error') {
            this.upsertLane(event.data.agent_id, { r2Failed: true });
          } else {
            this.upsertLane(event.data.agent_id, { failed: true });
          }
        } else {
          this._error.set(event.data.message);
        }
        break;

      case 'done':
        if (this._phase() !== 'error') this._phase.set('done');
        break;
    }
  }
}
