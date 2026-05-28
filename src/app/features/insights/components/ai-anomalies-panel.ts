import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Icon } from '@shared/ui/icon';
import { insightsClaimReturnQuery } from '@shared/utils';
import { InsightsStore } from '../services/insights.store';
import type { AiAnomaly } from '../models';

@Component({
  selector: 'insights-ai-anomalies',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line border-t-2 border-t-[#8b5cf6] rounded-lg p-3 shadow-1 flex flex-col">
      <div class="flex items-center gap-1 mb-2 shrink-0">
        <span class="text-[#8b5cf6]"><ui-icon name="auto_awesome" [size]="15" /></span>
        <h3 class="text-[12px] font-bold text-ink m-0">Anomalías IA</h3>
      </div>

      @if (anomalies().length === 0) {
        <div class="flex flex-col items-center justify-center gap-1 text-center px-2 py-3">
          <span class="text-ink-4"><ui-icon name="auto_awesome" [size]="20" /></span>
          <p class="text-[10.5px] text-ink-3 m-0 leading-snug">
            Sin anomalías detectadas en la ventana actual.
          </p>
        </div>
      } @else {
        <div class="space-y-1.5 max-h-[240px] overflow-y-auto scroll-pretty">
          @for (item of anomalies(); track item.id) {
            <button
              type="button"
              class="w-full text-left px-2 py-1.5 border border-line rounded-md hover:bg-hover transition-colors cursor-pointer group"
              (click)="openCase(item.id)"
            >
              <div class="flex justify-between items-center gap-1.5">
                <span class="text-[11px] font-bold text-ink leading-tight truncate">{{ item.title }}</span>
                <span class="text-[8px] font-mono px-1 py-px rounded shrink-0" [class]="severityClass(item)">
                  {{ severityLabel(item) }}
                </span>
              </div>
              <div class="flex justify-between items-center mt-0.5">
                <span class="text-[9px] font-mono text-[#8b5cf6] tabular-nums">{{ item.confidence }}%</span>
                <span class="text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ui-icon name="arrow_forward" [size]="12" />
                </span>
              </div>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class AiAnomaliesPanel {
  private readonly store = inject(InsightsStore);
  private readonly router = inject(Router);
  protected readonly anomalies = this.store.anomalies;

  protected openCase(claimId: string): void {
    void this.router.navigate(['/claims', claimId], { queryParams: insightsClaimReturnQuery() });
  }

  protected severityLabel(item: AiAnomaly): string {
    return item.severity === 'critical' ? 'Crítico' : 'Potencial';
  }

  protected severityClass(item: AiAnomaly): string {
    return item.severity === 'critical'
      ? 'bg-tier-red-soft text-tier-red-ink'
      : 'bg-soft text-ink-3';
  }
}
