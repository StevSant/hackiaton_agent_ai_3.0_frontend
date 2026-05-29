import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Icon } from '@shared/ui/icon';

import { InsightsEchart } from './insights-echart';
import { InsightsStore } from '../services/insights.store';
import { citySlugEncode } from '../utils/city-insights';
import { buildRegionalFraudBarOption } from '../utils/city-chart-options';

const CHART_CITY_LIMIT = 8;

@Component({
  selector: 'insights-fraud-tendency',
  standalone: true,
  imports: [Icon, InsightsEchart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="centinela-insight-card insights-fraud-tendency-card">
      <header class="insights-fraud-tendency-card__head">
        <div class="min-w-0">
          <h3 class="text-[13px] font-semibold text-ink m-0">Tendencia de fraude</h3>
          <p class="text-[11px] text-ink-3 m-0 mt-0.5">
            Top {{ CHART_CITY_LIMIT }} por alertas · clic en barra
          </p>
        </div>
        <span class="insights-fraud-tendency-card__badge">
          <ui-icon name="calendar_today" [size]="11" />
          12 meses
        </span>
      </header>

      @if (bars().length === 0) {
        <p class="text-[11px] text-ink-3 m-0 py-4 text-center">Sin datos regionales.</p>
      } @else {
        <insights-echart
          class="insights-fraud-tendency-card__chart"
          [option]="chartOption()"
          height="132px"
          (barClick)="openRegionCases($event)"
        />
      }
    </section>
  `,
})
export class FraudTendencyChart {
  protected readonly CHART_CITY_LIMIT = CHART_CITY_LIMIT;

  private readonly store = inject(InsightsStore);
  private readonly router = inject(Router);

  protected readonly bars = computed(() => {
    const points = this.store.regionalFraud();
    return points.slice(0, CHART_CITY_LIMIT).map((point) => ({
      region: point.region,
      value: point.value,
      label: REGION_CHART_LABELS[point.region] ?? point.region,
    }));
  });

  protected readonly chartOption = computed(() => buildRegionalFraudBarOption(this.bars()));

  protected openRegionCases(region: string): void {
    void this.router.navigate(['/insights', 'ciudad', citySlugEncode(region)]);
  }
}

const REGION_CHART_LABELS: Readonly<Record<string, string>> = {
  Esmeraldas: 'Esmer.',
  Riobamba: 'Riob.',
  'Santo Domingo': 'Sto. Dom.',
  'Puerto Baquerizo Moreno': 'Galápagos',
  Portoviejo: 'Portov.',
};
