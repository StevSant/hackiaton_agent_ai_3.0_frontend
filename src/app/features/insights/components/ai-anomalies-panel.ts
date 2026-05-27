import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Icon } from '../../../shared/ui/icon';
import { MOCK_ANOMALIES } from '../services/insights-mock.data';
import type { AiAnomaly } from '../models';

@Component({
  selector: 'insights-ai-anomalies',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white border-t-2 border-[#8b5cf6] rounded-md p-3 shadow-sm h-full">
      <div class="flex items-center gap-1 mb-2">
        <span class="text-[#8b5cf6]"><ui-icon name="auto_awesome" [size]="15" /></span>
        <h3 class="text-[12px] font-bold text-[#000515] m-0">Anomalías IA</h3>
      </div>

      <div class="space-y-1.5">
        @for (item of anomalies; track item.id) {
          <button
            type="button"
            class="w-full text-left px-2 py-1.5 border border-[#c4c6cf] rounded hover:bg-[#eeeeee] transition-colors cursor-pointer group"
          >
            <div class="flex justify-between items-center gap-1.5">
              <span class="text-[11px] font-bold text-[#000515] leading-tight truncate">{{ item.title }}</span>
              <span class="text-[8px] font-mono px-1 py-px rounded shrink-0" [class]="severityClass(item)">
                {{ severityLabel(item) }}
              </span>
            </div>
            <div class="flex justify-between items-center mt-0.5">
              <span class="text-[9px] font-mono text-[#8b5cf6] tabular-nums">{{ item.confidence }}%</span>
              <span class="text-[#44474e] opacity-0 group-hover:opacity-100 transition-opacity">
                <ui-icon name="arrow_forward" [size]="12" />
              </span>
            </div>
          </button>
        }
      </div>
    </div>
  `,
})
export class AiAnomaliesPanel {
  protected readonly anomalies = MOCK_ANOMALIES;

  protected severityLabel(item: AiAnomaly): string {
    return item.severity === 'critical' ? 'Crítico' : 'Potencial';
  }

  protected severityClass(item: AiAnomaly): string {
    return item.severity === 'critical'
      ? 'bg-[#ffdad6] text-[#93000a]'
      : 'bg-[#e8e8e8] text-[#44474e]';
  }
}
