import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { ClaimsStore } from '../../claims/services/claims.store';
import { AiAnomaliesPanel } from '../components/ai-anomalies-panel';
import { ClaimTypeDonut } from '../components/claim-type-donut';
import { EcuadorHotspotsMap } from '../components/ecuador-hotspots-map';
import { FraudTendencyChart } from '../components/fraud-tendency-chart';
import { QuarterlyOutlookCard } from '../components/quarterly-outlook-card';
import { exportInsightsCsv } from '../utils/export-insights';

@Component({
  selector: 'page-insights',
  standalone: true,
  imports: [
    Button,
    Icon,
    EcuadorHotspotsMap,
    AiAnomaliesPanel,
    FraudTendencyChart,
    ClaimTypeDonut,
    QuarterlyOutlookCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between gap-2 pb-2 shrink-0">
      <div class="min-w-0">
        <h1 class="text-[18px] font-semibold tracking-tight m-0">Tendencias estratégicas de IA</h1>
        <p class="text-ink-3 text-[11px] m-0 truncate">
          Dinámica de fraude y exposición al riesgo regional en Ecuador.
        </p>
      </div>
      <ui-button class="shrink-0 text-[11px] px-2.5 py-1 h-auto" (click)="onExport()">
        <ui-icon name="download" [size]="12" />
        Exportar
      </ui-button>
    </div>

    <div class="insights-layout flex flex-col lg:flex-row gap-3 min-h-0">
      <div class="flex-1 min-w-0 min-h-[420px] lg:min-h-0">
        <insights-ecuador-map />
      </div>

      <aside
        class="insights-sidebar w-full lg:w-[292px] shrink-0 flex flex-col gap-2"
      >
        <insights-fraud-tendency class="shrink-0" />
        <insights-ai-anomalies class="flex-1 min-h-0" />
        <insights-claim-type-donut class="shrink-0" />
        <insights-quarterly-outlook class="shrink-0" />
      </aside>
    </div>
  `,
})
export class InsightsPage {
  private readonly claims = inject(ClaimsStore);

  protected onExport(): void {
    exportInsightsCsv(this.claims.claims());
  }
}
