import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { formatMoney } from '@shared/utils/format-money';

import { ChartExplainer } from './chart-explainer';
import { InsightsEchart } from './insights-echart';
import type { ChartExplainEntry } from '../services/insights-explain.store';
import type { CitySavingsSnapshot } from '../utils/city-insights';
import { buildSavingsBarOption, type SavingsBucketChartPoint } from '../utils/city-chart-options';
import { tierFill, type AlertTier } from '../utils/insights-chart-theme';

const TIER_LABELS: Readonly<Record<string, string>> = {
  amarillo: 'Atención',
  rojo: 'Urgente',
};

@Component({
  selector: 'insights-city-savings-chart',
  standalone: true,
  imports: [InsightsEchart, ChartExplainer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="insights-viz-card insights-viz-card--mini">
      <header class="insights-viz-card__head insights-viz-card__head--compact">
        <div class="min-w-0">
          <h3 class="insights-viz-card__title">Ahorro potencial</h3>
          <p class="insights-viz-card__sub">Estimado · {{ savings().casos }} casos alerta</p>
        </div>
        <span class="insights-city-savings-chart__total">{{ formatMoney(savings().totalAhorro) }}</span>
      </header>

      @if (savings().casos === 0) {
        <p class="text-[11px] text-ink-3 m-0 py-6 text-center">Sin casos con alerta en esta ciudad.</p>
      } @else {
        <insights-echart [option]="chartOption()" height="112px" />
      }

      <insights-chart-explainer
        [entry]="explainEntry()"
        (explain)="explain.emit()"
        (toggle)="toggleExplain.emit()"
      />
    </section>
  `,
})
export class CitySavingsChart {
  readonly savings = input.required<CitySavingsSnapshot>();
  readonly explainEntry = input<ChartExplainEntry | undefined>(undefined);

  readonly explain = output<void>();
  readonly toggleExplain = output<void>();

  protected readonly formatMoney = formatMoney;

  protected readonly buckets = computed<SavingsBucketChartPoint[]>(() =>
    this.savings().buckets.map((bucket) => ({
      nivel: bucket.nivel,
      label: TIER_LABELS[bucket.nivel] ?? bucket.nivel,
      casos: bucket.casos,
      ahorro: bucket.ahorro,
      riesgo: bucket.riesgo,
      color: tierFill(bucket.nivel as AlertTier),
    })),
  );

  protected readonly chartOption = computed(() => buildSavingsBarOption(this.buckets()));
}
