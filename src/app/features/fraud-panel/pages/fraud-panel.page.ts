import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { RiskBadge } from '@shared/ui/risk-badge';

import { ConsensusCardComponent } from '../components/consensus-card';
import { SpecialistLaneComponent } from '../components/specialist-lane';
import { FraudPanelStore } from '../services/fraud-panel.store';

const PHASE_LABELS: Record<string, string> = {
  idle: '',
  round1: 'Ronda 1: análisis…',
  round2: 'Ronda 2: réplicas…',
  moderating: 'Sintetizando consenso…',
  done: 'Listo',
  error: 'Error',
};

@Component({
  selector: 'app-fraud-panel-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, RiskBadge, SpecialistLaneComponent, ConsensusCardComponent],
  template: `
    <div class="flex flex-col gap-4 p-4">
      <header class="flex items-center gap-3 flex-wrap">
        <ui-button variant="ghost" (click)="back()">
          <ui-icon name="arrow_back" [size]="14" />
        </ui-button>
        <h1 class="text-lg font-semibold">Análisis multi-agente — {{ claimId() }}</h1>

        <div class="flex items-center gap-1.5 text-xs text-ink-3">
          <span [class.text-brand-ink]="step() >= 1" [class.font-semibold]="step() === 1">① Ronda 1</span>
          <ui-icon name="chevron_right" [size]="12" />
          <span [class.text-brand-ink]="step() >= 2" [class.font-semibold]="step() === 2">② Ronda 2</span>
          <ui-icon name="chevron_right" [size]="12" />
          <span [class.text-brand-ink]="step() >= 3" [class.font-semibold]="step() === 3">③ Consenso</span>
        </div>

        <span class="flex-1"></span>
        <ui-button [disabled]="store.running()" (click)="rerun()">
          <ui-icon name="refresh" [size]="14" />
          Reanalizar
        </ui-button>
      </header>

      @if (store.error(); as e) {
        <p class="text-sm text-tier-red-ink">{{ e }}</p>
      }

      <!-- Motor vs Panel — decision-first contrast + actions -->
      <section class="rounded-lg border border-line bg-surface p-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div class="flex items-center gap-2">
          <span class="text-xs text-ink-3">Motor determinista</span>
          @if (store.engineNivel(); as n) {
            <ui-risk-badge [nivel]="n" />
          }
          @if (store.engineScore() !== null) {
            <span class="text-sm font-semibold tabular-nums">{{ store.engineScore() }}/100</span>
          }
        </div>
        <ui-icon name="compare_arrows" [size]="18" />
        <div class="flex items-center gap-2">
          <span class="text-xs text-ink-3">Panel multi-agente</span>
          @if (store.consensus(); as c) {
            <ui-risk-badge [nivel]="c.nivel_final" />
            <span class="text-sm text-ink-2">acuerdo {{ acuerdoPct() }}%</span>
            @if (c.posible_falso_positivo) {
              <span class="text-xs text-tier-yellow font-medium">⚠ posible falso positivo</span>
            }
          } @else {
            <span class="text-sm text-ink-3">{{ phaseLabel() || 'analizando…' }}</span>
          }
        </div>
        @if (divergence()) {
          <span class="text-xs px-2 py-0.5 rounded-full border border-line bg-soft text-ink-2 font-medium">
            El panel discrepa del motor
          </span>
        }
        <span class="flex-1"></span>
        @if (store.canAct()) {
          <ui-button [disabled]="store.acting()" (click)="escalate()">
            <ui-icon name="arrow_upward" [size]="14" />
            Escalar a Antifraude
          </ui-button>
          <ui-button variant="ghost" [disabled]="store.acting()" (click)="markReviewed()">
            <ui-icon name="check" [size]="14" />
            Marcar revisado
          </ui-button>
        }
      </section>

      @if (store.actionDone(); as msg) {
        <p class="text-sm text-tier-green-ink">{{ msg }}</p>
      }

      <!-- Consensus first (the bottom line), then the debate -->
      <app-consensus-card [consensus]="store.consensus()" [moderatorText]="store.moderator()" />

      <h2 class="text-sm font-semibold text-ink-2 mt-1">Debate de especialistas</h2>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        @for (lane of store.lanes(); track lane.agentId) {
          <app-specialist-lane [lane]="lane" />
        }
      </div>
    </div>
  `,
})
export class FraudPanelPage {
  readonly claimId = input.required<string>();

  protected readonly store = inject(FraudPanelStore);
  private readonly router = inject(Router);

  protected readonly acuerdoPct = computed(() =>
    Math.round((this.store.consensus()?.nivel_de_acuerdo ?? 0) * 100),
  );

  // Stepper position: 1 = Ronda 1, 2 = Ronda 2, 3 = Consenso/Listo.
  protected readonly step = computed(() => {
    switch (this.store.phase()) {
      case 'round1':
        return 1;
      case 'round2':
        return 2;
      case 'moderating':
      case 'done':
        return 3;
      default:
        return 0;
    }
  });

  // True when the panel's final tier differs from the deterministic engine tier.
  protected readonly divergence = computed(() => {
    const c = this.store.consensus();
    const engine = this.store.engineNivel();
    return c != null && engine != null && c.nivel_final !== engine;
  });

  constructor() {
    effect(() => {
      const id = this.claimId();
      // Replay the cached debate if one exists; otherwise run a fresh one.
      if (id) this.store.open(id);
    });
  }

  protected phaseLabel(): string {
    return PHASE_LABELS[this.store.phase()] ?? '';
  }

  protected rerun(): void {
    this.store.run(this.claimId());
  }

  protected escalate(): void {
    void this.store.escalateWithPanel();
  }

  protected markReviewed(): void {
    void this.store.markReviewedWithPanel();
  }

  protected back(): void {
    void this.router.navigate(['/claims', this.claimId()]);
  }
}
