import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { suggestedAction } from '../utils/ai-explanation';
import type { Claim } from '../models';

@Component({
  selector: 'claim-recommendation-card',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border-0 rounded-lg shadow-1" [style.background]="bg()">
      <div class="px-5 py-5">
        <div class="flex items-center gap-2 mb-1.5">
          <ui-icon [name]="claim().nivel === 'verde' ? 'check' : 'warning'" [size]="14" [style.color]="ink()" />
          <div class="text-[11px] font-semibold uppercase tracking-wider" [style.color]="ink()">Acción sugerida</div>
        </div>
        <div class="text-[13.5px] font-medium" [style.color]="ink()">{{ action() }}</div>
        <p class="text-[11.5px] mt-2 mb-0 opacity-80" [style.color]="ink()">
          Recuerda: este es un score de posible fraude, no una acusación. La decisión final es siempre humana.
        </p>
      </div>
    </div>
  `,
})
export class RecommendationCard {
  readonly claim = input.required<Claim>();

  protected readonly action = computed(() => suggestedAction(this.claim()));

  protected readonly bg = computed(() => {
    const t = this.claim().nivel;
    return t === 'rojo'
      ? 'var(--tier-red-soft)'
      : t === 'amarillo'
        ? 'var(--tier-yellow-soft)'
        : 'var(--tier-green-soft)';
  });

  protected readonly ink = computed(() => {
    const t = this.claim().nivel;
    return t === 'rojo'
      ? 'var(--tier-red-ink)'
      : t === 'amarillo'
        ? 'var(--tier-yellow-ink)'
        : 'var(--tier-green-ink)';
  });
}
