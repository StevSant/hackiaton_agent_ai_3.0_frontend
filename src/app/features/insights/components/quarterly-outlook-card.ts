import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { InsightsStore } from '../services/insights.store';

@Component({
  selector: 'insights-quarterly-outlook',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-[#041e41] text-white rounded-md p-3">
      <h3 class="text-[12px] font-bold mb-1 m-0">Perspectiva trimestral</h3>
      <p class="text-[10px] leading-snug opacity-80 mb-1.5 m-0 text-[#d7e3ff] line-clamp-2">{{ outlook().body }}</p>
      <div class="flex items-center gap-1 text-[#10b981]">
        <ui-icon name="trending_down" [size]="14" />
        <span class="text-[10px] font-mono font-medium truncate">Fraude {{ outlook().systematicFraudDelta }}</span>
      </div>
    </div>
  `,
})
export class QuarterlyOutlookCard {
  private readonly store = inject(InsightsStore);
  protected readonly outlook = this.store.quarterlyOutlook;
}
