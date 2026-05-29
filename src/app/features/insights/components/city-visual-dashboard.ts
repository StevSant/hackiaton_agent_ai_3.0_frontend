import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon } from '@shared/ui/icon';

import { ChartExplainer } from './chart-explainer';
import { InsightsEchart } from './insights-echart';
import { CitySavingsChart } from './city-savings-chart';
import type { ChartExplainEntry } from '../services/insights-explain.store';
import {
  buildChartExplainContext,
  type ChartExplainContext,
} from '../utils/chart-explain-context';
import type { CityInsightsSnapshot } from '../utils/city-insights';
import {
  buildCityBenchmarkOption,
  buildCityExposureScatterOption,
  buildCityRamoBarOption,
  buildCityRamoCompareOption,
  buildCityRamoPolarOption,
  buildCityScoreGaugeOption,
  buildCitySignalRadarOption,
  buildCityStackedTrendOption,
  buildCityStackedTrendCompareOption,
  buildCityTierCompareRoseOption,
  buildCityTierRoseOption,
} from '../utils/city-chart-options';

@Component({
  selector: 'insights-city-visual-dashboard',
  standalone: true,
  imports: [Icon, InsightsEchart, CitySavingsChart, ChartExplainer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="insights-city-viz" [class.insights-city-viz--comparing]="isComparing()">
      <section class="insights-viz-card insights-viz-card--hero">
        <header class="insights-viz-card__head insights-viz-card__head--compact">
          <ui-icon name="stacked_line_chart" [size]="16" />
          <div class="min-w-0">
            <h3 class="insights-viz-card__title">
              {{ isComparing() ? 'Ola de alertas comparada' : 'Ola de alertas — 6 meses' }}
            </h3>
            <p class="insights-viz-card__sub insights-viz-card__sub--visible">
              @if (isComparing()) {
                {{ view().city }} vs {{ compareView()!.city }} — misma escala, 6 meses
              } @else {
                Evolución apilada por nivel de riesgo
              }
            </p>
          </div>
          @if (!isComparing() && view().nationalRank; as rank) {
            <span class="insights-viz-badge">#{{ rank }} nacional</span>
          }
        </header>
        <insights-echart [option]="stackedOption()" [height]="isComparing() ? '380px' : '360px'" />
        @if (!isComparing()) {
          <insights-chart-explainer
            [entry]="explainState()['stacked_trend']"
            (explain)="onExplain('stacked_trend')"
            (toggle)="toggleExplain.emit('stacked_trend')"
          />
        }
      </section>

      @if (isComparing()) {
        <div class="insights-city-viz__main insights-city-viz__main--compare">
          <section class="insights-viz-card insights-viz-card--primary">
            <header class="insights-viz-card__head insights-viz-card__head--compact">
              <ui-icon name="scatter_plot" [size]="16" />
              <div>
                <h3 class="insights-viz-card__title">Mapa de exposición</h3>
                <p class="insights-viz-card__sub insights-viz-card__sub--visible">
                  {{ view().city }} — monto vs. score
                </p>
              </div>
            </header>
            <insights-echart [option]="scatterOption()" height="280px" />
          </section>

          <section class="insights-viz-card insights-viz-card--mini">
            <header class="insights-viz-card__head insights-viz-card__head--compact">
              <ui-icon name="donut_large" [size]="14" />
              <h3 class="insights-viz-card__title">Semáforo comparado</h3>
            </header>
            <insights-echart [option]="roseOption()" height="280px" />
          </section>
        </div>
      } @else {
        <div class="insights-city-viz__main">
          <section class="insights-viz-card insights-viz-card--primary">
            <header class="insights-viz-card__head insights-viz-card__head--compact">
              <ui-icon name="scatter_plot" [size]="16" />
              <div>
                <h3 class="insights-viz-card__title">Mapa de exposición</h3>
                <p class="insights-viz-card__sub">Monto reclamado vs. score de alerta</p>
              </div>
            </header>
            <insights-echart [option]="scatterOption()" height="340px" />
            <insights-chart-explainer
              [entry]="explainState()['exposure_scatter']"
              (explain)="onExplain('exposure_scatter')"
              (toggle)="toggleExplain.emit('exposure_scatter')"
            />
          </section>

          <div class="insights-city-viz__side">
            <section class="insights-viz-card insights-viz-card--mini">
              <header class="insights-viz-card__head insights-viz-card__head--compact">
                <ui-icon name="speed" [size]="14" />
                <h3 class="insights-viz-card__title">Score promedio</h3>
              </header>
              <insights-echart [option]="gaugeOption()" height="168px" />
              <insights-chart-explainer
                [entry]="explainState()['score_gauge']"
                (explain)="onExplain('score_gauge')"
                (toggle)="toggleExplain.emit('score_gauge')"
              />
            </section>
            <section class="insights-viz-card insights-viz-card--mini">
              <header class="insights-viz-card__head insights-viz-card__head--compact">
                <ui-icon name="donut_large" [size]="14" />
                <h3 class="insights-viz-card__title">Semáforo</h3>
              </header>
              <insights-echart [option]="roseOption()" height="168px" />
              <insights-chart-explainer
                [entry]="explainState()['tier_rose']"
                (explain)="onExplain('tier_rose')"
                (toggle)="toggleExplain.emit('tier_rose')"
              />
            </section>
            <insights-city-savings-chart
              [savings]="view().savings"
              [explainEntry]="explainState()['savings']"
              (explain)="onExplain('savings')"
              (toggleExplain)="toggleExplain.emit('savings')"
            />
          </div>
        </div>
      }

      <div
        class="insights-city-viz__bottom"
        [class.insights-city-viz__bottom--compare]="isComparing()"
      >
        <section class="insights-viz-card">
          <header class="insights-viz-card__head insights-viz-card__head--compact">
            <ui-icon name="cyclone" [size]="16" />
            <div>
              <h3 class="insights-viz-card__title">
                {{ isComparing() ? 'Riesgo por ramo comparado' : 'Riesgo por ramo' }}
              </h3>
              <p class="insights-viz-card__sub insights-viz-card__sub--visible">
                @if (isComparing()) {
                  {{ view().city }} vs {{ compareView()!.city }} — % sospechoso
                } @else {
                  % sospechoso por línea
                }
              </p>
            </div>
          </header>
          <insights-echart [option]="polarOption()" [height]="isComparing() ? '280px' : '240px'" />
          @if (!isComparing()) {
            <insights-chart-explainer
              [entry]="explainState()['ramo_polar']"
              (explain)="onExplain('ramo_polar')"
              (toggle)="toggleExplain.emit('ramo_polar')"
            />
          }
        </section>

        @if (isComparing()) {
          <section class="insights-viz-card insights-viz-card--score-split">
            <header class="insights-viz-card__head insights-viz-card__head--compact">
              <ui-icon name="speed" [size]="16" />
              <div>
                <h3 class="insights-viz-card__title">Score comparado</h3>
                <p class="insights-viz-card__sub insights-viz-card__sub--visible">
                  Promedio de alerta por ciudad
                </p>
              </div>
            </header>
            <div class="insights-score-compare">
              <div class="insights-score-compare__col">
                <span class="insights-score-compare__chip insights-score-compare__chip--primary">
                  {{ view().city }}
                </span>
                <insights-echart [option]="gaugeOption()" height="228px" />
              </div>
              <div class="insights-score-compare__mid" aria-hidden="true">
                <span class="insights-score-compare__vs">vs</span>
                <span
                  class="insights-score-compare__delta"
                  [class.insights-score-compare__delta--bad]="scoreDelta() > 0"
                  [class.insights-score-compare__delta--good]="scoreDelta() < 0"
                >
                  {{ scoreDeltaLabel() }}
                </span>
              </div>
              <div class="insights-score-compare__col">
                <span class="insights-score-compare__chip insights-score-compare__chip--other">
                  {{ compareView()!.city }}
                </span>
                <insights-echart [option]="gaugeOtherOption()!" height="228px" />
              </div>
            </div>
          </section>
        } @else {
          <section class="insights-viz-card">
            <header class="insights-viz-card__head insights-viz-card__head--compact">
              <ui-icon [name]="hasSignals() ? 'radar' : 'leaderboard'" [size]="16" />
              <div>
                <h3 class="insights-viz-card__title">
                  {{ hasSignals() ? 'Radar de señales' : 'Comparativa nacional' }}
                </h3>
                <p class="insights-viz-card__sub">
                  {{ hasSignals() ? 'Reglas más activas' : '% casos sospechosos' }}
                </p>
              </div>
            </header>
            <insights-echart [option]="secondaryOption()" height="240px" />
            <insights-chart-explainer
              [entry]="explainState()[secondaryChartId()]"
              (explain)="onExplain(secondaryChartId())"
              (toggle)="toggleExplain.emit(secondaryChartId())"
            />
          </section>
        }
      </div>
    </div>
  `,
})
export class CityVisualDashboard {
  readonly view = input.required<CityInsightsSnapshot>();
  readonly compareView = input<CityInsightsSnapshot | null>(null);
  readonly explainState = input<Record<string, ChartExplainEntry>>({});

  readonly explain = output<ChartExplainContext>();
  readonly toggleExplain = output<string>();

  protected readonly isComparing = computed(() => this.compareView() !== null);

  protected readonly hasSignals = computed(() => this.view().topSignals.length > 0);

  protected readonly secondaryChartId = computed(() =>
    this.hasSignals() ? 'signal_radar' : 'national_benchmark',
  );

  protected onExplain(chartId: string): void {
    this.explain.emit(buildChartExplainContext(chartId, this.view()));
  }

  protected readonly gaugeOption = computed(() => buildCityScoreGaugeOption(this.view()));

  protected readonly gaugeOtherOption = computed(() => {
    const other = this.compareView();
    return other ? buildCityScoreGaugeOption(other) : null;
  });

  protected readonly scoreDelta = computed(() => {
    const other = this.compareView();
    if (!other) return 0;
    return this.view().kpis.avgScore - other.kpis.avgScore;
  });

  protected readonly scoreDeltaLabel = computed(() => {
    const delta = this.scoreDelta();
    if (delta === 0) return 'Igual';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta} pts`;
  });

  protected readonly roseOption = computed(() => {
    const other = this.compareView();
    return other
      ? buildCityTierCompareRoseOption(this.view(), other)
      : buildCityTierRoseOption(this.view());
  });

  protected readonly stackedOption = computed(() => {
    const other = this.compareView();
    return other
      ? buildCityStackedTrendCompareOption(this.view(), other)
      : buildCityStackedTrendOption(this.view());
  });

  protected readonly scatterOption = computed(() => buildCityExposureScatterOption(this.view()));

  protected readonly polarOption = computed(() => {
    const other = this.compareView();
    return other
      ? buildCityRamoCompareOption(this.view(), other)
      : buildCityRamoPolarOption(this.view());
  });

  protected readonly secondaryOption = computed(() =>
    this.hasSignals()
      ? buildCitySignalRadarOption(this.view())
      : this.view().ramoBreakdown.length > 0
        ? buildCityRamoBarOption(this.view())
        : buildCityBenchmarkOption(this.view()),
  );
}
