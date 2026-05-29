import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Icon } from '@shared/ui/icon';

import { InsightsStore } from '../services/insights.store';

interface TierMixRow {
  tier: 'verde' | 'amarillo' | 'rojo';
  label: string;
  count: number;
  pct: number;
}

@Component({
  selector: 'insights-ai-anomalies',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="centinela-insight-card insights-tier-mix-card">
      <header class="insights-tier-mix-card__head">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="insights-tier-mix-card__icon">
              <ui-icon name="traffic" [size]="14" />
            </span>
            <h3 class="text-[13px] font-semibold text-ink m-0">Estado de alertas</h3>
          </div>
          <p class="text-[11px] text-ink-3 m-0 mt-0.5">Cuántos siniestros hay en cada nivel · 12 meses</p>
        </div>
        @if (totalCases() > 0) {
          <span class="insights-tier-mix-card__total" [title]="totalCases() + ' siniestros'">
            {{ totalCases() }} casos
          </span>
        }
      </header>

      @if (totalCases() === 0) {
        <p class="text-[11px] text-ink-3 m-0 py-6 text-center">Sin casos para mostrar.</p>
      } @else {
        <div class="insights-tier-mix-card__strip" role="img" [attr.aria-label]="stripLabel()">
          @for (row of rows(); track row.tier) {
            @if (row.pct > 0) {
              <span
                class="insights-tier-mix-card__seg"
                [class.insights-tier-mix-card__seg--verde]="row.tier === 'verde'"
                [class.insights-tier-mix-card__seg--amarillo]="row.tier === 'amarillo'"
                [class.insights-tier-mix-card__seg--rojo]="row.tier === 'rojo'"
                [style.flex-grow]="row.count"
                [title]="row.label + ': ' + row.count + ' (' + row.pct + '%)'"
              ></span>
            }
          }
        </div>

        <ul class="insights-tier-mix-card__list m-0 p-0 list-none">
          @for (row of rows(); track row.tier) {
            <li class="insights-tier-mix-card__row">
              <span class="insights-tier-mix-card__dot" [class]="dotClass(row.tier)"></span>
              <span class="insights-tier-mix-card__label">{{ row.label }}</span>
              <span class="insights-tier-mix-card__bar-track">
                <span
                  class="insights-tier-mix-card__bar"
                  [class]="barClass(row.tier)"
                  [style.width.%]="row.pct"
                ></span>
              </span>
              <span class="insights-tier-mix-card__value">{{ row.count }}</span>
              <span class="insights-tier-mix-card__pct">{{ row.pct }}%</span>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class AiAnomaliesPanel {
  private readonly store = inject(InsightsStore);

  protected readonly totalCases = computed(() => this.store.incidents().length);

  protected readonly rows = computed<TierMixRow[]>(() => {
    const incidents = this.store.incidents();
    const counts = { verde: 0, amarillo: 0, rojo: 0 };
    for (const row of incidents) counts[row.tier] += 1;

    const total = incidents.length || 1;
    const toPct = (count: number) => Math.round((count / total) * 100);

    return [
      { tier: 'verde', label: 'Normal', count: counts.verde, pct: toPct(counts.verde) },
      { tier: 'amarillo', label: 'Atención', count: counts.amarillo, pct: toPct(counts.amarillo) },
      { tier: 'rojo', label: 'Urgente', count: counts.rojo, pct: toPct(counts.rojo) },
    ];
  });

  protected stripLabel(): string {
    return this.rows()
      .filter((row) => row.count > 0)
      .map((row) => `${row.label} ${row.pct}%`)
      .join(', ');
  }

  protected dotClass(tier: TierMixRow['tier']): string {
    return `insights-tier-mix-card__dot--${tier}`;
  }

  protected barClass(tier: TierMixRow['tier']): string {
    return `insights-tier-mix-card__bar--${tier}`;
  }
}
