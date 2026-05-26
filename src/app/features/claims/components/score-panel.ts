import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { RiskRing } from '../../../shared/ui/risk-ring';
import { suggestedAction } from '../utils/ai-explanation';
import type { Claim } from '../models';

@Component({
  selector: 'claim-score-panel',
  standalone: true,
  imports: [RiskRing],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="px-5 py-5 flex items-center gap-7">
        <ui-risk-ring [score]="claim().score" [size]="132" [stroke]="10" />
        <div class="flex-1">
          <div class="text-ink-3 text-[11px] uppercase tracking-wider font-medium">Score de posible fraude</div>
          <div class="text-[22px] font-semibold mt-1 tracking-tight">{{ headline() }}</div>
          <p class="text-ink-3 text-[12.5px] mt-2 mb-0 max-w-[520px]">
            {{ suggestedAction(claim()) }}
            @if (claim().alertas.length > 0) {
              Se activaron {{ claim().alertas.length }} señales con un total de {{ totalPts() }} puntos sobre 100.
            }
          </p>
          <div class="flex items-center gap-1.5 mt-3.5 flex-wrap">
            @for (a of topAlerts(); track a.code) {
              <span class="font-mono text-[11px] px-2 py-0.5 rounded" [class]="chipClass(a.severidad)">
                {{ a.code }} · +{{ a.puntos }}
              </span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ScorePanel {
  readonly claim = input.required<Claim>();

  protected readonly suggestedAction = suggestedAction;

  protected readonly headline = computed(() => {
    const tier = this.claim().nivel;
    return tier === 'rojo'
      ? 'Riesgo alto — requiere revisión especializada'
      : tier === 'amarillo'
        ? 'Riesgo medio — revisión documental'
        : 'Riesgo bajo — flujo normal';
  });

  protected readonly totalPts = computed(() =>
    this.claim().alertas.reduce((s, a) => s + a.puntos, 0),
  );

  protected topAlerts() {
    return this.claim().alertas.slice(0, 4);
  }

  protected chipClass(sev: 'high' | 'med' | 'low'): string {
    return sev === 'high'
      ? 'bg-tier-red-soft text-tier-red-ink'
      : sev === 'med'
        ? 'bg-tier-yellow-soft text-tier-yellow-ink'
        : 'bg-tier-green-soft text-tier-green-ink';
  }
}
