import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { riskTier } from '../utils';

@Component({
  selector: 'ui-risk-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2 w-full">
      <div class="flex-1 h-1.5 bg-soft rounded-full overflow-hidden">
        <div class="bar-fill h-full rounded-full" [style.width.%]="score()" [style.background]="color()"></div>
      </div>
      <span class="tabular-nums text-[12.5px] font-semibold min-w-[24px] text-right">{{ score() }}</span>
    </div>
  `,
})
export class RiskBar {
  readonly score = input.required<number>();

  protected readonly color = computed(() => {
    const tier = riskTier(this.score());
    return tier === 'rojo'
      ? 'var(--tier-red)'
      : tier === 'amarillo'
        ? 'var(--tier-yellow)'
        : 'var(--tier-green)';
  });
}
