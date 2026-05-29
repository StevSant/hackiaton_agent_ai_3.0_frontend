import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';

import { ExportButton } from '@shared/ui/export-button';
import { KpiCard } from '@shared/ui/kpi-card';
import { PageHeader } from '@shared/ui/page-header';
import { ClaimsStore } from '@core/state/claims.store';
import { formatMoney } from '@shared/utils/format-money';
import { AiAnomaliesPanel } from '../components/ai-anomalies-panel';
import { CityNavButton } from '../components/city-nav-button';
import { ClaimTypeDonut } from '../components/claim-type-donut';
import { EcuadorHotspotsMap } from '../components/ecuador-hotspots-map';
import { FraudTendencyChart } from '../components/fraud-tendency-chart';
import { QuarterlyOutlookCard } from '../components/quarterly-outlook-card';
import { InsightsStore } from '../services/insights.store';
import { exportInsightsCsv } from '../utils/export-insights';

@Component({
  selector: 'page-insights',
  standalone: true,
  imports: [
    ExportButton,
    KpiCard,
    PageHeader,
    CityNavButton,
    EcuadorHotspotsMap,
    AiAnomaliesPanel,
    FraudTendencyChart,
    ClaimTypeDonut,
    QuarterlyOutlookCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="centinela-viewport-page">
      <ui-page-header eyebrow="Insights" title="Tendencias estratégicas de IA" [compact]="true">
        <p class="centinela-page-header__desc" ngProjectAs="[description]">
          Dinámica de posible fraude y exposición al riesgo regional en Ecuador.
        </p>
        <div class="flex items-center gap-2" ngProjectAs="[actions]">
          <insights-city-nav-button />
          <ui-export-button label="Exportar" (trigger)="onExport()" />
        </div>
      </ui-page-header>

      <!-- Savings KPI section -->
      @if (!savingsLoading() && !savingsError()) {
        @if (savings(); as s) {
          <section class="mb-3">
            <div class="grid grid-cols-2 gap-3 mb-2">
              <ui-kpi-card
                label="Ahorro potencial total estimado"
                [value]="totalAhorro()"
                [suffix]="'· ' + s.casos + ' casos'"
              />
              <ui-kpi-card label="Valor en riesgo total" [value]="totalRiesgo()" />
            </div>
            @for (bucket of s.por_nivel; track bucket.nivel) {
              <div class="flex items-center gap-2 text-[11.5px] text-ink-3">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  [class]="bucket.nivel === 'rojo' ? 'bg-tier-red-ink' : 'bg-tier-yellow-ink'"
                ></span>
                <span class="capitalize">{{ bucket.nivel }}</span>
                <span class="tabular-nums">{{ bucket.casos }} casos</span>
                <span class="text-ink-2 tabular-nums"
                  >— ahorro: {{ formatMoney(bucket.ahorro_potencial) }}</span
                >
              </div>
            }
            <p class="text-[11px] text-ink-2 mt-2 mb-0">
              Metodología: por cada caso en alerta (🟡/🔴), exposición × probabilidad de posible
              fraude × tasa de recuperación {{ tasaRecuperacion() }}%.
            </p>
            <p class="text-[11px] text-ink-3 mt-1 mb-0">
              Estimación basada en señales de riesgo, sujeta a revisión humana. No representa
              posible fraude confirmado.
            </p>
          </section>
        }
      }

      <div class="insights-layout flex flex-col lg:flex-row gap-3 min-h-0 flex-1">
        <div class="flex-1 min-w-0 min-h-0">
          <insights-ecuador-map />
        </div>

        <aside
          class="insights-sidebar w-full lg:w-[280px] shrink-0 flex flex-col gap-2 min-h-0 scroll-pretty"
        >
          <insights-fraud-tendency class="shrink-0" />
          <insights-ai-anomalies class="shrink-0" />
          <insights-claim-type-donut class="shrink-0" />
          <insights-quarterly-outlook class="shrink-0" />
        </aside>
      </div>
    </div>
  `,
})
export class InsightsPage implements OnInit {
  private readonly claims = inject(ClaimsStore);
  private readonly insights = inject(InsightsStore);

  protected readonly savings = this.insights.savings;
  protected readonly savingsLoading = this.insights.savingsLoading;
  protected readonly savingsError = this.insights.savingsError;

  protected readonly totalAhorro = computed(() => {
    const s = this.insights.savings();
    return s ? formatMoney(s.total_ahorro_potencial) : '—';
  });

  protected readonly totalRiesgo = computed(() => {
    const s = this.insights.savings();
    return s ? formatMoney(s.total_valor_en_riesgo) : '—';
  });

  protected readonly tasaRecuperacion = computed(() => {
    const s = this.insights.savings();
    if (!s) return '—';
    return (s.tasa_recuperacion * 100).toLocaleString('es-EC', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  });

  protected readonly formatMoney = formatMoney;

  ngOnInit(): void {
    void this.insights.load();
    void this.insights.loadSavings();
  }

  protected onExport(): void {
    exportInsightsCsv(this.claims.claims());
  }
}
