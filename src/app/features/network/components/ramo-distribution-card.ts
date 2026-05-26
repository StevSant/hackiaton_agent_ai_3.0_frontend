import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Icon } from '../../../shared/ui/icon';
import { ramoIcon, ramoLabel } from '../../../shared/utils';
import { ClaimsStore } from '../../claims/services/claims.store';
import { computeRamoStats } from '../utils/ramo-stats';

@Component({
  selector: 'network-ramo-distribution-card',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 h-full">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div>
          <h3 class="text-[13px] font-semibold m-0">Alertas por ramo</h3>
          <div class="text-[12px] text-ink-3 mt-0.5">% de siniestros con score ≥ 40</div>
        </div>
      </div>
      @for (r of stats(); track r.key) {
        <div class="grid grid-cols-[120px_1fr_40px] gap-3 items-center px-5 py-2.5 border-t border-line first:border-t-0">
          <div class="flex items-center gap-2.5">
            <ui-icon [name]="ramoIcon(r.key)" [size]="14" />
            <div>
              <div class="text-[13px]">{{ ramoLabel(r.key) }}</div>
              <div class="text-[11.5px] text-ink-3">{{ r.total }} casos</div>
            </div>
          </div>
          <div class="h-2 bg-soft rounded-full relative overflow-hidden">
            <div class="bar-fill h-full rounded-full" [style.width.%]="r.pct" [style.background]="barColor(r.pct)"></div>
          </div>
          <div class="text-[12.5px] tabular-nums text-ink-2 text-right">{{ r.pct }}%</div>
        </div>
      }
    </div>
  `,
})
export class RamoDistributionCard {
  private readonly claims = inject(ClaimsStore);

  protected readonly stats = computed(() => computeRamoStats(this.claims.claims()));
  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;

  protected barColor(pct: number): string {
    return pct >= 60 ? 'var(--tier-red)' : pct >= 30 ? 'var(--tier-yellow)' : 'var(--tier-green)';
  }
}
