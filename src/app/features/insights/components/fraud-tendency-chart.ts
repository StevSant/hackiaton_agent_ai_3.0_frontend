import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Icon } from '../../../shared/ui/icon';
import { STITCH_REGIONAL_BARS } from '../constants/stitch-insights.constants';

@Component({
  selector: 'insights-fraud-tendency',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white border border-[#c4c6cf] rounded-md p-3 h-full">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-[12px] font-bold text-[#000515] m-0">Tendencia de fraude por región</h3>
        <div class="flex items-center gap-1 text-[#44474e]">
          <span class="text-[10px] font-mono">12 meses</span>
          <ui-icon name="calendar_today" [size]="13" />
        </div>
      </div>

      <div class="flex items-end justify-between h-24 gap-2">
        @for (bar of bars; track bar.region) {
          <div class="flex flex-col items-center flex-1 gap-1 h-full justify-end">
            <div
              class="w-full bg-[#041e41] rounded-t-sm insights-chart-bar transition-all duration-1000 ease-out"
              [style.height.%]="bar.heightPct"
              [style.opacity]="bar.opacity"
            ></div>
            <span class="text-[9px] font-mono text-[#44474e] text-center leading-none">{{ bar.region }}</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class FraudTendencyChart {
  protected readonly bars = STITCH_REGIONAL_BARS;
}
