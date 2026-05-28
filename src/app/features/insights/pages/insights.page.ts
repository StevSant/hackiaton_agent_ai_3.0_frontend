import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { ExportModal, type ExportRequest } from '@shared/ui/export-modal';
import { ClaimsStore } from '@core/state/claims.store';
import { ProvidersStore } from '@core/state/providers.store';
import { AseguradosStore } from '@core/state/asegurados.store';
import { ramoLabel } from '@shared/utils';
import { AiAnomaliesPanel } from '../components/ai-anomalies-panel';
import { ClaimTypeDonut } from '../components/claim-type-donut';
import { EcuadorHotspotsMap } from '../components/ecuador-hotspots-map';
import { FraudTendencyChart } from '../components/fraud-tendency-chart';
import { QuarterlyOutlookCard } from '../components/quarterly-outlook-card';
import { InsightsAskAi } from '../components/insights-ask-ai';
import { InsightsTopProviders, type TopProviderRow } from '../components/insights-top-providers';
import { InsightsRamoRisk, type RamoRiskRow } from '../components/insights-ramo-risk';
import {
  InsightsFrequentInsured,
  type FrequentInsuredRow,
} from '../components/insights-frequent-insured';
import {
  InsightsAtypicalAmounts,
  type AtypicalClaimRow,
} from '../components/insights-atypical-amounts';
import { InsightsStore } from '../services/insights.store';
import {
  INSIGHTS_EXPORT_COLUMNS,
  exportInsightsClaims,
  projectInsightClaim,
} from '../utils/export-insights';

const ATYPICAL_PERCENTILE = 0.95;
const MAX_LIST_ROWS = 5;
const MAX_RAMO_ROWS = 6;

@Component({
  selector: 'page-insights',
  standalone: true,
  imports: [
    Button,
    Icon,
    ExportModal,
    EcuadorHotspotsMap,
    AiAnomaliesPanel,
    FraudTendencyChart,
    ClaimTypeDonut,
    QuarterlyOutlookCard,
    InsightsAskAi,
    InsightsTopProviders,
    InsightsRamoRisk,
    InsightsFrequentInsured,
    InsightsAtypicalAmounts,
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
      <ui-button
        variant="primary"
        class="shrink-0"
        [disabled]="claims.claims().length === 0"
        (click)="exportOpen.set(true)"
      >
        <ui-icon name="download" [size]="14" />
        Exportar reporte
      </ui-button>
    </div>

    <div class="insights-layout flex flex-col lg:flex-row gap-3 min-h-0">
      <div class="flex-1 min-w-0 min-h-[420px] lg:min-h-0">
        <insights-ecuador-map />
      </div>

      <aside
        class="insights-sidebar w-full lg:w-[292px] shrink-0 flex flex-col gap-2 min-h-0"
      >
        <insights-fraud-tendency class="shrink-0" />
        <insights-ai-anomalies class="shrink-0" />
        <insights-claim-type-donut class="shrink-0" />
        <insights-quarterly-outlook class="shrink-0" />
      </aside>
    </div>

    <section class="pt-3">
      <insights-ask-ai (ask)="onAsk($event)" />
    </section>

    <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 pt-3">
      <insights-top-providers [items]="topProviders()" (open)="openProvider($event)" />
      <insights-ramo-risk [items]="ramoRisk()" />
      <insights-frequent-insured [items]="frequentInsured()" (open)="openAsegurado($event)" />
      <insights-atypical-amounts [items]="atypicalAmounts()" (open)="openClaim($event)" />
    </section>

    <ui-export-modal
      [open]="exportOpen()"
      title="Exportar siniestros analizados"
      subtitle="Genera un archivo con los siniestros que alimentan estos indicadores."
      [columns]="insightsColumns"
      [defaultFilename]="exportFilename()"
      [totalRows]="claims.claims().length"
      [previewRows]="previewRows()"
      (close)="exportOpen.set(false)"
      (download)="onExport($event)"
    />
  `,
})
export class InsightsPage implements OnInit {
  protected readonly claims = inject(ClaimsStore);
  private readonly providers = inject(ProvidersStore);
  private readonly asegurados = inject(AseguradosStore);
  private readonly insights = inject(InsightsStore);
  private readonly router = inject(Router);

  protected readonly exportOpen = signal<boolean>(false);
  protected readonly insightsColumns = INSIGHTS_EXPORT_COLUMNS;

  protected readonly previewRows = computed(() =>
    this.claims.claims().slice(0, 3).map(projectInsightClaim),
  );

  protected readonly exportFilename = computed(() => `centinela-insights-${todayStamp()}`);

  protected readonly topProviders = computed<TopProviderRow[]>(() =>
    [...this.providers.providers()]
      .filter((p) => p.alertas > 0)
      .sort((a, b) => b.alertas - a.alertas || b.casos - a.casos)
      .slice(0, MAX_LIST_ROWS)
      .map((p) => ({ id: p.id, nombre: p.nombre, alertas: p.alertas, casos: p.casos })),
  );

  protected readonly ramoRisk = computed<RamoRiskRow[]>(() => {
    const buckets = new Map<string, { total: number; sospechosos: number }>();
    for (const c of this.claims.claims()) {
      const key = c.ramo || 'desconocido';
      const bucket = buckets.get(key) ?? { total: 0, sospechosos: 0 };
      bucket.total += 1;
      if (c.nivel !== 'verde') bucket.sospechosos += 1;
      buckets.set(key, bucket);
    }
    return [...buckets.entries()]
      .map(([ramo, b]) => ({
        ramo,
        label: ramoLabel(ramo),
        total: b.total,
        sospechosos: b.sospechosos,
        pct: b.total ? Math.round((b.sospechosos / b.total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct || b.total - a.total)
      .slice(0, MAX_RAMO_ROWS);
  });

  protected readonly frequentInsured = computed<FrequentInsuredRow[]>(() =>
    [...this.asegurados.asegurados()]
      .sort(
        (a, b) =>
          b.reclamos_ultimos_12_meses - a.reclamos_ultimos_12_meses || b.alertas - a.alertas,
      )
      .slice(0, MAX_LIST_ROWS)
      .map((a) => ({
        id: a.id,
        nombre: a.nombre,
        reclamos: a.reclamos_ultimos_12_meses,
        alertas: a.alertas,
      })),
  );

  protected readonly atypicalAmounts = computed<AtypicalClaimRow[]>(() => {
    const claims = this.claims.claims();
    const amounts = claims
      .map((c) => c.monto_reclamado)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    if (amounts.length === 0) return [];
    const threshold =
      amounts[Math.floor(amounts.length * ATYPICAL_PERCENTILE)] ?? amounts[amounts.length - 1];
    return claims
      .filter((c) => c.monto_reclamado >= threshold)
      .sort((a, b) => b.monto_reclamado - a.monto_reclamado)
      .slice(0, MAX_LIST_ROWS)
      .map((c) => ({
        id: c.id,
        ramo: ramoLabel(c.ramo),
        monto: c.monto_reclamado,
        score: c.score,
        nivel: c.nivel,
      }));
  });

  ngOnInit(): void {
    void this.insights.load();
    if (this.providers.providers().length === 0) void this.providers.loadList();
    if (this.asegurados.asegurados().length === 0) void this.asegurados.loadList();
    if (this.claims.claims().length === 0) void this.claims.loadList();
  }

  protected onExport(req: ExportRequest): void {
    exportInsightsClaims(this.claims.claims(), req);
  }

  protected onAsk(question: string): void {
    void this.router.navigate(['/agent'], {
      queryParams: { conversation: generateConversationId(), q: question },
    });
  }

  protected openProvider(id: string): void {
    void this.router.navigate(['/providers', id]);
  }

  protected openAsegurado(id: string): void {
    void this.router.navigate(['/asegurados', id]);
  }

  protected openClaim(id: string): void {
    void this.router.navigate(['/claims', id]);
  }
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
