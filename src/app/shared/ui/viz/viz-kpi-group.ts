// src/app/shared/ui/viz/viz-kpi-group.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TIER_COLOR } from './viz-theme';
import type { KpiVisual } from './visual.model';

@Component({
  selector: 'viz-kpi-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full">
      @if (payload().title) {
        <div class="text-[12.5px] font-semibold text-ink mb-2">{{ payload().title }}</div>
      }
      <div class="flex flex-wrap gap-2">
        @for (item of payload().items; track item.label) {
          <div class="flex-1 min-w-[120px] rounded-xl border border-line bg-surface p-3">
            <div class="text-[10px] uppercase tracking-wide text-ink-3 flex items-center gap-1.5">
              @if (item.tier) {
                <span class="inline-block w-2 h-2 rounded-full" [style.background]="tierColor(item.tier)"></span>
              }
              {{ item.label }}
            </div>
            <div class="text-[22px] font-bold text-ink mt-1 leading-none">{{ item.value }}</div>
            @if (item.delta) {
              <div class="text-[10.5px] mt-1"
                   [class.text-tier-red]="item.delta_dir === 'up'"
                   [class.text-tier-green]="item.delta_dir === 'down'"
                   [class.text-ink-3]="item.delta_dir === 'flat' || !item.delta_dir">
                {{ item.delta }}
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class VizKpiGroup {
  readonly payload = input.required<KpiVisual>();

  protected tierColor(t: 'verde' | 'amarillo' | 'rojo'): string {
    return TIER_COLOR[t];
  }
}
