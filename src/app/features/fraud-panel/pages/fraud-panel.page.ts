import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';

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
  imports: [Button, Icon, SpecialistLaneComponent, ConsensusCardComponent],
  template: `
    <div class="flex flex-col gap-4 p-4">
      <header class="flex items-center gap-3 flex-wrap">
        <ui-button variant="ghost" (click)="back()">
          <ui-icon name="arrow_back" [size]="14" />
        </ui-button>
        <h1 class="text-lg font-semibold">Análisis multi-agente — {{ claimId() }}</h1>
        @if (phaseLabel()) {
          <span class="text-sm text-ink-2">{{ phaseLabel() }}</span>
        }
        <span class="flex-1"></span>
        <ui-button [disabled]="store.running()" (click)="rerun()">
          <ui-icon name="refresh" [size]="14" />
          Reanalizar
        </ui-button>
      </header>

      @if (store.error(); as e) {
        <p class="text-sm text-tier-red-ink">{{ e }}</p>
      }

      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        @for (lane of store.lanes(); track lane.agentId) {
          <app-specialist-lane [lane]="lane" />
        }
      </div>

      <app-consensus-card [consensus]="store.consensus()" [moderatorText]="store.moderator()" />
    </div>
  `,
})
export class FraudPanelPage {
  readonly claimId = input.required<string>();

  protected readonly store = inject(FraudPanelStore);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const id = this.claimId();
      if (id) this.store.run(id);
    });
  }

  protected phaseLabel(): string {
    return PHASE_LABELS[this.store.phase()] ?? '';
  }

  protected rerun(): void {
    this.store.run(this.claimId());
  }

  protected back(): void {
    void this.router.navigate(['/claims', this.claimId()]);
  }
}
