import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';

import { ExportButton } from '@shared/ui/export-button';
import { PageHeader } from '@shared/ui/page-header';
import { ClaimsStore } from '@core/state/claims.store';
import { CityNavButton } from '../components/city-nav-button';
import { ClaimTypeDonut } from '../components/claim-type-donut';
import { EcuadorHotspotsMap } from '../components/ecuador-hotspots-map';
import { FraudTendencyChart } from '../components/fraud-tendency-chart';
import { PotentialSavingsChart } from '../components/potential-savings-chart';
import { QuarterlyOutlookCard } from '../components/quarterly-outlook-card';
import { InsightsStore } from '../services/insights.store';
import { exportInsightsCsv } from '../utils/export-insights';

@Component({
  selector: 'page-insights',
  standalone: true,
  imports: [
    ExportButton,
    PageHeader,
    CityNavButton,
    EcuadorHotspotsMap,
    FraudTendencyChart,
    ClaimTypeDonut,
    QuarterlyOutlookCard,
    PotentialSavingsChart,
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

      <div class="insights-layout flex flex-col lg:flex-row gap-3 min-h-0 flex-1">
        <div class="insights-main flex-1 min-w-0 min-h-0">
          <insights-ecuador-map class="w-full h-full" />
        </div>

        <aside
          class="insights-sidebar w-full lg:w-[280px] shrink-0 flex flex-col gap-2 min-h-0 scroll-pretty"
        >
          <insights-fraud-tendency class="shrink-0" />
          <insights-potential-savings class="shrink-0" [compact]="true" />
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

  ngOnInit(): void {
    void this.insights.load();
    void this.insights.loadSavings();
  }

  protected onExport(): void {
    exportInsightsCsv(this.claims.claims());
  }
}
