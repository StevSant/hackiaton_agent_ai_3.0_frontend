import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { formatMoney, formatMoneyShort } from '@shared/utils/format-money';

import { InsightsEchart } from './insights-echart';
import { InsightsStore } from '../services/insights.store';
import { buildSavingsBarOption, type SavingsBucketChartPoint } from '../utils/city-chart-options';
import { tierFill, type AlertTier } from '../utils/insights-chart-theme';

const TIER_LABELS: Readonly<Record<string, string>> = {
  amarillo: 'Atención',
  rojo: 'Urgente',
};

interface SavingsBarRow extends SavingsBucketChartPoint {
  widthPct: number;
  amountLabel: string;
}

@Component({
  selector: 'insights-potential-savings',
  standalone: true,
  imports: [Icon, InsightsEchart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="centinela-insight-card insights-savings-card"
      [class.insights-savings-card--compact]="compact()"
    >
      <header class="insights-savings-card__head">
        <h3 class="text-[13px] font-semibold text-ink m-0 leading-tight">
          Ahorro potencial estimado
        </h3>
        @if (savings(); as s) {
          <span class="insights-savings-card__badge">
            <ui-icon name="savings" [size]="11" />
            {{ s.casos }}
          </span>
        }
      </header>

      @if (savingsLoading()) {
        <p class="insights-savings-card__empty">Calculando…</p>
      } @else if (savingsError()) {
        <p class="insights-savings-card__empty insights-savings-card__empty--error">
          Sin datos de ahorro.
        </p>
      } @else if (savings(); as s) {
        @if (compact()) {
          <div class="insights-savings-compact">
            <div class="insights-savings-compact__metrics">
              <div class="insights-savings-compact__metric">
                <span class="insights-savings-compact__metric-label">Ahorro</span>
                <span class="insights-savings-compact__metric-value insights-savings-compact__metric-value--green">
                  {{ formatMoneyShort(s.total_ahorro_potencial) }}
                </span>
              </div>
              <div class="insights-savings-compact__metric">
                <span class="insights-savings-compact__metric-label">En riesgo</span>
                <span class="insights-savings-compact__metric-value insights-savings-compact__metric-value--red">
                  {{ formatMoneyShort(s.total_valor_en_riesgo) }}
                </span>
              </div>
            </div>

            <p class="insights-savings-compact__hint">Ahorro estimado por nivel de alerta</p>

            @if (barRows().length === 0) {
              <p class="insights-savings-card__empty">Sin alertas activas.</p>
            } @else {
              <ul class="insights-savings-compact__rows m-0 p-0 list-none">
                @for (row of barRows(); track row.nivel) {
                  <li class="insights-savings-compact__row">
                    <span
                      class="insights-savings-compact__dot"
                      [class.insights-savings-compact__dot--rojo]="row.nivel === 'rojo'"
                      [class.insights-savings-compact__dot--amarillo]="row.nivel === 'amarillo'"
                    ></span>
                    <span class="insights-savings-compact__row-label">
                      {{ row.label }}
                      <span class="insights-savings-compact__row-cases">{{ row.casos }}</span>
                    </span>
                    <span class="insights-savings-compact__track">
                      <span
                        class="insights-savings-compact__fill"
                        [class.insights-savings-compact__fill--rojo]="row.nivel === 'rojo'"
                        [class.insights-savings-compact__fill--amarillo]="row.nivel === 'amarillo'"
                        [style.width.%]="row.widthPct"
                      ></span>
                    </span>
                    <span class="insights-savings-compact__row-value">{{ row.amountLabel }}</span>
                  </li>
                }
              </ul>
            }
          </div>
        } @else {
          <p class="text-[11px] text-ink-3 m-0 mt-0.5 mb-2">
            Desglose por nivel de alerta · sujeto a revisión humana
          </p>

          <div class="insights-savings-card__totals">
            <div class="insights-savings-card__total insights-savings-card__total--primary">
              <span class="insights-savings-card__total-label">Ahorro potencial</span>
              <span class="insights-savings-card__total-value">{{ formatMoney(s.total_ahorro_potencial) }}</span>
            </div>
            <div class="insights-savings-card__total">
              <span class="insights-savings-card__total-label">Valor en riesgo</span>
              <span class="insights-savings-card__total-value insights-savings-card__total-value--muted">
                {{ formatMoney(s.total_valor_en_riesgo) }}
              </span>
            </div>
          </div>

          @if (buckets().length === 0) {
            <p class="insights-savings-card__empty">Sin casos con alerta activa.</p>
          } @else {
            <insights-echart
              class="insights-savings-card__chart"
              [option]="chartOption()"
              height="96px"
            />
          }

          <p class="insights-savings-card__disclaimer">
            Estimación basada en señales de riesgo, sujeta a revisión humana. No representa posible
            fraude confirmado.
          </p>
        }
      }
    </section>
  `,
})
export class PotentialSavingsChart {
  readonly compact = input(false);

  private readonly store = inject(InsightsStore);

  protected readonly savings = this.store.savings;
  protected readonly savingsLoading = this.store.savingsLoading;
  protected readonly savingsError = this.store.savingsError;
  protected readonly formatMoney = formatMoney;
  protected readonly formatMoneyShort = formatMoneyShort;

  protected readonly buckets = computed<SavingsBucketChartPoint[]>(() => {
    const analysis = this.store.savings();
    if (!analysis) return [];

    return analysis.por_nivel.map((bucket) => ({
      nivel: bucket.nivel,
      label: TIER_LABELS[bucket.nivel] ?? bucket.nivel,
      casos: bucket.casos,
      ahorro: bucket.ahorro_potencial,
      riesgo: bucket.valor_en_riesgo,
      color: tierFill(bucket.nivel as AlertTier),
    }));
  });

  protected readonly barRows = computed<SavingsBarRow[]>(() => {
    const buckets = this.buckets().filter((bucket) => bucket.casos > 0);
    const peak = Math.max(...buckets.map((bucket) => bucket.ahorro), 1);

    return buckets.map((bucket) => ({
      ...bucket,
      widthPct: Math.max(8, Math.round((bucket.ahorro / peak) * 100)),
      amountLabel: formatMoneyShort(bucket.ahorro),
    }));
  });

  protected readonly chartOption = computed(() => buildSavingsBarOption(this.buckets()));
}
