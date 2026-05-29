import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { InsightsStore } from '../services/insights.store';

interface FraudBar {
  region: string;
  value: number;
  heightPct: number;
  opacity: number;
}

@Component({
  selector: 'insights-fraud-tendency',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="centinela-insight-card">
      <header class="flex justify-between items-start gap-2 mb-3.5">
        <div class="min-w-0">
          <h3 class="text-[13px] font-semibold text-ink m-0">Tendencia de fraude</h3>
          <p class="text-[11.5px] text-ink-3 m-0 mt-0.5">Concentración por región</p>
        </div>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-soft text-ink-3 border border-line shrink-0">
          <ui-icon name="calendar_today" [size]="11" />
          12 meses
        </span>
      </header>

      <div class="flex items-end justify-between h-24 gap-1">
        @for (bar of bars(); track bar.region) {
          <div class="flex flex-col items-center flex-1 gap-1 h-full justify-end min-w-0">
            <span class="font-mono text-[10px] text-ink-3 tabular-nums leading-none">
              {{ bar.value }}
            </span>
            <div
              class="w-full rounded-t-sm transition-all duration-700 ease-out"
              [style.height.%]="bar.heightPct"
              [style.background]="'var(--brand)'"
              [style.opacity]="bar.opacity"
            ></div>
          </div>
        }
      </div>
      <div class="flex justify-between gap-1 mt-1.5">
        @for (bar of bars(); track bar.region) {
          <div class="flex-1 min-w-0 text-center px-0.5">
            <span
              class="block text-[9px] font-medium text-ink-2 leading-snug truncate"
              [title]="bar.region"
            >
              {{ regionLabel(bar.region) }}
            </span>
          </div>
        }
      </div>
    </section>
  `,
})
export class FraudTendencyChart {
  private readonly store = inject(InsightsStore);

  protected readonly bars = computed<FraudBar[]>(() => {
    const points = this.store.regionalFraud();
    if (!points.length) return [];
    const max = Math.max(...points.map((p) => p.value), 1);
    return points.map((p, idx) => ({
      region: p.region,
      value: p.value,
      heightPct: (p.value / max) * 100,
      opacity: Math.max(1 - idx * 0.18, 0.25),
    }));
  });

  protected regionLabel(region: string): string {
    return REGION_CHART_LABELS[region] ?? region;
  }
}

const REGION_CHART_LABELS: Readonly<Record<string, string>> = {
  Esmeraldas: 'Esmer.',
  Riobamba: 'Riob.',
  'Santo Domingo': 'Sto. Dom.',
  'Puerto Baquerizo Moreno': 'Galápagos',
};
