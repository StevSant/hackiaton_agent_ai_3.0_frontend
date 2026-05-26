import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { riskTier, riskTierLabel, type RiskTier } from '../utils';

@Component({
  selector: 'ui-risk-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-medium whitespace-nowrap" [class]="badgeClasses()">
      @if (withDot()) {
        <span class="tier-dot" [class]="dotClasses()" style="box-shadow: none"></span>
      }
      {{ label() }}
    </span>
  `,
})
export class RiskBadge {
  readonly nivel = input<RiskTier | null>(null);
  readonly score = input<number | null>(null);
  readonly withDot = input<boolean>(true);

  protected readonly tier = computed<RiskTier>(() => this.nivel() ?? riskTier(this.score() ?? 0));

  protected readonly badgeClasses = computed(() => {
    const tier = this.tier();
    return tier === 'rojo'
      ? 'bg-tier-red-soft text-tier-red-ink'
      : tier === 'amarillo'
        ? 'bg-tier-yellow-soft text-tier-yellow-ink'
        : 'bg-tier-green-soft text-tier-green-ink';
  });

  protected readonly dotClasses = computed(() => {
    const tier = this.tier();
    return tier === 'rojo' ? 'tier-dot-r' : tier === 'amarillo' ? 'tier-dot-y' : 'tier-dot-g';
  });

  protected readonly label = computed(() => riskTierLabel(this.tier()));
}
