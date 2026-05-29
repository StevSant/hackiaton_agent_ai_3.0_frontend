import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { environment } from '@core/config/env';
import { SseClient } from '@core/realtime/sse.client';
import type { PanelConsensus, PanelRosterEntry, PanelStreamEvent } from '../models';
import type { SpecialistLane } from '../models/specialist-lane.model';

type PanelPhase = 'idle' | 'round1' | 'round2' | 'moderating' | 'done' | 'error';

@Injectable({ providedIn: 'root' })
export class FraudPanelStore {
  private readonly sse = inject(SseClient);

  // Cancel any in-flight SSE run before starting a new one.
  private _runSub: Subscription | null = null;

  private readonly _phase = signal<PanelPhase>('idle');
  private readonly _lanes = signal<SpecialistLane[]>([]);
  private readonly _moderator = signal<string>('');
  private readonly _consensus = signal<PanelConsensus | null>(null);
  private readonly _error = signal<string | null>(null);

  readonly phase = this._phase.asReadonly();
  readonly lanes = this._lanes.asReadonly();
  readonly moderator = this._moderator.asReadonly();
  readonly consensus = this._consensus.asReadonly();
  readonly error = this._error.asReadonly();
  readonly running = computed(() => ['round1', 'round2', 'moderating'].includes(this._phase()));

  reset(): void {
    this._phase.set('idle');
    this._lanes.set([]);
    this._moderator.set('');
    this._consensus.set(null);
    this._error.set(null);
  }

  run(claimId: string): void {
    // Unsubscribe cancels the AbortController inside SseClient, aborting any in-flight fetch.
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
          this.upsertLane(event.data.agent_id, { failed: true });
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
