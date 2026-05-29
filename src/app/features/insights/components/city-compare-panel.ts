import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon } from '@shared/ui/icon';

import type { CityInsightsSnapshot } from '../utils/city-insights';
import {
  buildCityCompareMetrics,
  compareTierRows,
  type CityCompareMetric,
} from '../utils/city-compare';

@Component({
  selector: 'insights-city-compare-panel',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="insights-city-compare-panel" [class.insights-city-compare-panel--wide]="wide()">
      <header class="insights-city-compare-panel__head">
        <div class="min-w-0">
          <p class="insights-city-compare-panel__eyebrow">Resumen</p>
          <h2 class="insights-city-compare-panel__title">{{ primary().city }} vs {{ other().city }}</h2>
          <p class="insights-city-compare-panel__meta">
            @if (primary().nationalRank && other().nationalRank) {
              #{{ primary().nationalRank }} vs #{{ other().nationalRank }} nacional
            } @else {
              Métricas lado a lado
            }
          </p>
        </div>
        <button
          type="button"
          class="insights-city-compare-panel__close"
          (click)="close.emit()"
          aria-label="Cerrar comparación"
        >
          <ui-icon name="close" [size]="16" />
        </button>
      </header>

      <div class="insights-city-compare-panel__legend">
        <span class="insights-city-compare-panel__chip insights-city-compare-panel__chip--primary">
          {{ primary().city }}
        </span>
        <span class="insights-city-compare-panel__vs">vs</span>
        <span class="insights-city-compare-panel__chip insights-city-compare-panel__chip--other">
          {{ other().city }}
        </span>
      </div>

      <div class="insights-city-compare-panel__body">
      <ul class="insights-city-compare-panel__metrics m-0 p-0 list-none">
        @for (row of metrics(); track row.key) {
          <li class="insights-city-compare-panel__metric">
            <div class="insights-city-compare-panel__metric-head">
              <span class="insights-city-compare-panel__metric-label">{{ row.label }}</span>
              <span
                class="insights-city-compare-panel__delta"
                [class.insights-city-compare-panel__delta--bad]="isWorseDelta(row)"
                [class.insights-city-compare-panel__delta--good]="isBetterDelta(row)"
              >
                {{ row.deltaLabel }}
              </span>
            </div>
            <div class="insights-city-compare-panel__bars">
              <div class="insights-city-compare-panel__bar-row">
                <span class="insights-city-compare-panel__bar-value">{{ row.primaryLabel }}</span>
                <div class="insights-city-compare-panel__bar-track">
                  <div
                    class="insights-city-compare-panel__bar insights-city-compare-panel__bar--primary"
                    [style.width.%]="barWidth(row.primaryValue, row.otherValue)"
                  ></div>
                </div>
              </div>
              <div class="insights-city-compare-panel__bar-row">
                <span class="insights-city-compare-panel__bar-value">{{ row.otherLabel }}</span>
                <div class="insights-city-compare-panel__bar-track">
                  <div
                    class="insights-city-compare-panel__bar insights-city-compare-panel__bar--other"
                    [style.width.%]="barWidth(row.otherValue, row.primaryValue)"
                  ></div>
                </div>
              </div>
            </div>
          </li>
        }
      </ul>

      <section class="insights-city-compare-panel__tiers">
        <h3 class="insights-city-compare-panel__section-title">Semáforo (%)</h3>
        @for (tier of tierRows(); track tier.tier) {
          <div class="insights-city-compare-panel__tier-row">
            <span class="insights-city-compare-panel__tier-label">{{ tier.label }}</span>
            <div class="insights-city-compare-panel__tier-bars">
              <div
                class="insights-city-compare-panel__tier-bar insights-city-compare-panel__tier-bar--primary"
                [class.insights-city-compare-panel__tier-bar--rojo]="tier.tier === 'rojo'"
                [class.insights-city-compare-panel__tier-bar--amarillo]="tier.tier === 'amarillo'"
                [class.insights-city-compare-panel__tier-bar--verde]="tier.tier === 'verde'"
                [style.width.%]="tier.primaryPct"
              ></div>
              <span class="insights-city-compare-panel__tier-pct">{{ tier.primaryPct }}%</span>
            </div>
            <div class="insights-city-compare-panel__tier-bars">
              <div
                class="insights-city-compare-panel__tier-bar insights-city-compare-panel__tier-bar--other"
                [class.insights-city-compare-panel__tier-bar--rojo]="tier.tier === 'rojo'"
                [class.insights-city-compare-panel__tier-bar--amarillo]="tier.tier === 'amarillo'"
                [class.insights-city-compare-panel__tier-bar--verde]="tier.tier === 'verde'"
                [style.width.%]="tier.otherPct"
              ></div>
              <span class="insights-city-compare-panel__tier-pct">{{ tier.otherPct }}%</span>
            </div>
          </div>
        }
      </section>
      </div>

      <button type="button" class="insights-city-compare-panel__swap" (click)="swap.emit()">
        <ui-icon name="swap_horiz" [size]="15" />
        Intercambiar {{ primary().city }} ↔ {{ other().city }}
      </button>
    </aside>
  `,
})
export class CityComparePanel {
  readonly primary = input.required<CityInsightsSnapshot>();
  readonly other = input.required<CityInsightsSnapshot>();
  readonly wide = input(false);
  readonly close = output<void>();
  readonly swap = output<void>();

  protected readonly metrics = computed(() =>
    buildCityCompareMetrics(this.primary(), this.other()),
  );

  protected readonly tierRows = computed(() =>
    compareTierRows(this.primary(), this.other()),
  );

  protected barWidth(value: number, otherValue: number): number {
    const max = Math.max(value, otherValue, 1);
    return Math.max((value / max) * 100, value > 0 ? 8 : 0);
  }

  protected isWorseDelta(row: CityCompareMetric): boolean {
    if (row.primaryValue === row.otherValue) return false;
    const primaryHigher = row.primaryValue > row.otherValue;
    return row.higherIsWorse ? primaryHigher : !primaryHigher;
  }

  protected isBetterDelta(row: CityCompareMetric): boolean {
    if (row.primaryValue === row.otherValue) return false;
    return !this.isWorseDelta(row);
  }
}
