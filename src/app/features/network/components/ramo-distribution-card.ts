import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { ramoIcon, ramoLabel } from '@shared/utils';
import { ClaimsStore } from '@core/state/claims.store';
import { computeRamoStats } from '../utils/ramo-stats';

@Component({
  selector: 'network-ramo-distribution-card',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 h-full flex flex-col min-h-[420px]">
      <div class="px-5 py-3.5 border-b border-line shrink-0">
        <h3 class="text-[13px] font-semibold m-0">Alertas por ramo</h3>
        <div class="text-[12px] text-ink-3 mt-0.5">% de siniestros con score ≥ 40</div>
      </div>

      <div class="flex-1 py-2">
        @for (ramoStat of stats(); track ramoStat.key; let index = $index) {
          <div
            class="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_44px] gap-3 items-center px-5 py-3"
            [class.border-t]="index > 0"
            [class.border-line]="index > 0"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-soft text-ink-2">
                <ui-icon [name]="ramoIcon(ramoStat.key)" [size]="16" />
              </span>
              <div class="min-w-0">
                <div class="text-[13px] font-medium truncate">{{ ramoLabel(ramoStat.key) }}</div>
                <div class="text-[11.5px] text-ink-3 whitespace-nowrap">{{ ramoStat.total }} casos</div>
              </div>
            </div>

            <div class="h-2.5 bg-soft rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                [style.width.%]="ramoStat.pct"
                [style.background]="barColor(ramoStat.pct)"
              ></div>
            </div>

            <div class="text-[13px] tabular-nums font-semibold text-ink text-right">{{ ramoStat.pct }}%</div>
          </div>
        }
      </div>
    </div>
  `,
})
export class RamoDistributionCard {
  private readonly claims = inject(ClaimsStore);

  protected readonly stats = computed(() => computeRamoStats(this.claims.claims()));
  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;

  protected barColor(percentage: number): string {
    return percentage >= 60
      ? 'var(--tier-red)'
      : percentage >= 30
        ? 'var(--tier-yellow)'
        : 'var(--tier-green)';
  }
}
