import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Icon } from '@shared/ui/icon';

export interface RamoRiskRow {
  ramo: string;
  label: string;
  total: number;
  sospechosos: number;
  pct: number;
}

@Component({
  selector: 'insights-ramo-risk',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 p-3 h-full flex flex-col">
      <div class="flex items-center gap-1.5 mb-2.5">
        <ui-icon name="category" [size]="15" class="text-ink-3" />
        <h3 class="text-[12.5px] font-semibold tracking-tight m-0">% sospechoso por ramo</h3>
      </div>
      @if (items().length === 0) {
        <p class="text-ink-3 text-[12px] m-0">Sin datos de siniestros para calcular.</p>
      } @else {
        <ul class="flex flex-col gap-2 m-0 p-0 list-none">
          @for (r of items(); track r.ramo) {
            <li>
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="text-[12px] text-ink truncate">{{ r.label }}</span>
                <span class="text-[11.5px] text-ink-3 tabular-nums shrink-0">
                  {{ r.pct }}% · {{ r.sospechosos }}/{{ r.total }}
                </span>
              </div>
              <div class="h-1.5 rounded-full bg-soft overflow-hidden">
                <div
                  class="h-full rounded-full"
                  [class.bg-tier-red]="r.pct >= 50"
                  [class.bg-tier-yellow]="r.pct >= 25 && r.pct < 50"
                  [class.bg-brand]="r.pct < 25"
                  [style.width.%]="r.pct"
                ></div>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class InsightsRamoRisk {
  readonly items = input.required<readonly RamoRiskRow[]>();
}
