import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Button } from '@shared/ui/button';
import { ExportModal, type ExportRequest } from '@shared/ui/export-modal';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import {
  PROVIDER_EXPORT_COLUMNS,
  RAMOS,
  RAMO_KEYS,
  exportProviders,
  formatMoneyShort,
  normalizeRamoKey,
  projectProvider,
  ramoLabel,
  type RamoKey,
} from '@shared/utils';
import { NetworkGraph } from '../components/network-graph';
import { ProviderRanking } from '../components/provider-ranking';
import { RamoDistributionCard } from '../components/ramo-distribution-card';
import type { Provider } from '@shared/models';
import { ProvidersStore } from '@core/state/providers.store';

type RamoFilter = 'todos' | RamoKey;
type GraphTierFilter = 'todos' | 'rojo' | 'amarillo_rojo' | 'estandar';
type GraphViewMode = 'ring' | 'grid';

/** Cap on graph nodes in ring mode — beyond this the ring becomes unreadable. */
const GRAPH_MAX_NODES = 15;

@Component({
  selector: 'page-network',
  standalone: true,
  imports: [
    Button,
    ExportModal,
    Icon,
    KpiSmall,
    NetworkGraph,
    ProviderRanking,
    RamoDistributionCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-start justify-between gap-4 py-2 pb-5">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Red de proveedores</h1>
        <p class="text-ink-3 text-[13.5px] m-0 max-w-2xl">
          Ranking de proveedores por concentración de alertas, montos y patrones cruzados.
        </p>
      </div>
      <ui-button
        variant="secondary"
        class="shrink-0"
        [disabled]="filteredProviders().length === 0"
        (click)="exportOpen.set(true)"
      >
        <ui-icon name="download" [size]="14" />
        Exportar ranking
      </ui-button>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <span class="text-[11.5px] uppercase tracking-wide text-ink-3 mr-1">Ramo</span>
      <button
        type="button"
        class="inline-flex h-7 items-center gap-1.5 px-2.5 rounded-full text-[12px] leading-none border transition-colors"
        [class]="chipClasses('todos')"
        (click)="setFilter('todos')"
      >
        <span>Todos</span>
        <span
          class="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-[5px] text-[10px] font-semibold tabular-nums leading-none"
          [class]="countBadgeClasses('todos')"
        >{{ stats().total }}</span>
      </button>
      @for (key of ramoOptions; track key) {
        <button
          type="button"
          class="inline-flex h-7 items-center gap-1.5 px-2.5 rounded-full text-[12px] leading-none border transition-colors [&_ui-icon_span]:block [&_ui-icon_span]:leading-none"
          [class]="chipClasses(key)"
          (click)="setFilter(key)"
        >
          <ui-icon [name]="ramoIconFor(key)" [size]="13" />
          <span>{{ ramoLabel(key) }}</span>
          <span
            class="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-[5px] text-[10px] font-semibold tabular-nums leading-none"
            [class]="countBadgeClasses(key)"
          >{{ counts()[key] }}</span>
        </button>
      }
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <ui-kpi-small label="Proveedores activos" [value]="filteredStats().total" icon="work" />
      <ui-kpi-small label="En lista restrictiva" [value]="filteredStats().restrictiva" icon="warning" tone="red" />
      <ui-kpi-small label="Alertas concentradas" [value]="filteredStats().alertas" icon="flag" tone="yellow" />
      <ui-kpi-small label="Monto observado" [value]="totalMonto()" icon="trending_up" tone="brand" />
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5 items-stretch">
      <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden flex flex-col min-h-[420px]">
        <div class="px-5 py-3.5 border-b border-line shrink-0 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 class="text-[13px] font-semibold m-0">Mapa de relaciones</h3>
            <div class="text-[12px] text-ink-3 mt-0.5">
              Tamaño por volumen · color por riesgo · {{ graphSubtitle() }}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            @for (m of viewModeOptions; track m.value) {
              <button
                type="button"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] border transition-colors"
                [class]="viewModeChipClasses(m.value)"
                (click)="setViewMode(m.value)"
              >
                {{ m.label }}
              </button>
            }
            <span class="w-px h-4 bg-line mx-1" aria-hidden="true"></span>
            @for (opt of graphTierOptions; track opt.value) {
              <button
                type="button"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] border transition-colors"
                [class]="tierChipClasses(opt.value)"
                (click)="setGraphTier(opt.value)"
              >
                {{ opt.label }}
              </button>
            }
          </div>
        </div>
        <network-graph
          class="flex-1"
          [providers]="graphDisplayProviders()"
          [viewMode]="viewMode()"
        />
      </div>

      <network-ramo-distribution-card />
    </div>

    @if (filteredProviders().length === 0) {
      <div class="bg-surface border border-line rounded-lg shadow-1 px-5 py-10 text-center text-ink-3 text-[13px]">
        Sin proveedores en este ramo.
      </div>
    } @else {
      <network-provider-ranking [providers]="filteredProviders()" />
    }

    <ui-export-modal
      [open]="exportOpen()"
      title="Exportar ranking de proveedores"
      subtitle="Genera un archivo con los proveedores que coinciden con el ramo seleccionado."
      [columns]="providerColumns"
      [defaultFilename]="exportFilename()"
      [totalRows]="filteredProviders().length"
      [previewRows]="previewRows()"
      (close)="exportOpen.set(false)"
      (download)="onExport($event)"
    />
  `,
})
export class NetworkPage {
  private readonly store = inject(ProvidersStore);

  protected readonly providers = this.store.providers;
  protected readonly stats = this.store.stats;
  protected readonly filter = signal<RamoFilter>('todos');
  protected readonly graphTier = signal<GraphTierFilter>('amarillo_rojo');
  protected readonly viewMode = signal<GraphViewMode>('ring');
  protected readonly exportOpen = signal<boolean>(false);
  protected readonly providerColumns = PROVIDER_EXPORT_COLUMNS;
  protected readonly ramoOptions: readonly RamoKey[] = RAMO_KEYS;
  protected readonly GRAPH_MAX_NODES = GRAPH_MAX_NODES;
  protected readonly graphTierOptions: ReadonlyArray<{ value: GraphTierFilter; label: string }> = [
    { value: 'todos', label: 'Todos' },
    { value: 'rojo', label: 'Solo rojos' },
    { value: 'amarillo_rojo', label: 'Amarillos + rojos' },
    { value: 'estandar', label: 'Estándar' },
  ];
  protected readonly viewModeOptions: ReadonlyArray<{ value: GraphViewMode; label: string }> = [
    { value: 'ring', label: 'Anillo' },
    { value: 'grid', label: 'Cuadrícula' },
  ];

  protected readonly counts = computed<Record<RamoKey, number>>(() => {
    const acc: Record<RamoKey, number> = {
      vehiculos: 0,
      salud: 0,
      vida: 0,
      generales: 0,
      hogar: 0,
      otros: 0,
    };
    for (const p of this.providers()) {
      const keys = providerRamoKeys(p);
      for (const k of keys) acc[k] += 1;
    }
    return acc;
  });

  protected readonly filteredProviders = computed<Provider[]>(() => {
    const f = this.filter();
    const list = this.providers();
    if (f === 'todos') return list;
    return list.filter((p) => providerRamoKeys(p).includes(f));
  });

  protected readonly filteredStats = computed(() => {
    const list = this.filteredProviders();
    return {
      total: list.length,
      restrictiva: list.filter((p) => p.listaRestrictiva).length,
      alertas: list.reduce((s, p) => s + p.alertas, 0),
      monto: list.reduce((s, p) => s + p.monto, 0),
    };
  });

  protected readonly totalMonto = computed(() => formatMoneyShort(this.filteredStats().monto));

  protected readonly previewRows = computed(() =>
    this.filteredProviders().slice(0, 3).map(projectProvider),
  );

  protected readonly exportFilename = computed(() => {
    const scope = this.filter() === 'todos' ? 'todos' : this.filter();
    return `centinela-proveedores-${scope}-${todayStamp()}`;
  });

  /** Providers filtered by both ramo (top-level) and tier (graph-only). */
  protected readonly tierFilteredProviders = computed<Provider[]>(() => {
    const tier = this.graphTier();
    const list = this.filteredProviders();
    if (tier === 'todos') return list;
    return list.filter((p) => matchesTierFilter(p, tier));
  });

  /** What the graph actually renders — top-N after tier filter.
   *
   * Selection per filter:
   *   • todos: reserve 3 slots for yellows + 3 for standards so all three
   *     tiers appear in the ring; the rest go to the highest-alerted reds.
   *     A pure top-N-by-alertas pick would always be all-red because reds
   *     dominate the dataset.
   *   • rojo: top-N reds by alertas desc, tie-break by ratio. Sorting by
   *     ratio alone collapses every LISTA-restrictiva provider to 1.0.
   *   • amarillo_rojo: split the budget so yellows actually appear next to
   *     reds — that's the whole point of the mixed filter. Fall back to extra
   *     reds when fewer yellows exist.
   *   • estandar: rank by casos desc — standards usually have 0 alertas, so
   *     sorting by alertas would produce a 15-way tie.
   */
  protected readonly graphProviders = computed<Provider[]>(() => {
    const tier = this.graphTier();
    const list = this.tierFilteredProviders();

    if (tier === 'estandar') {
      return [...list].sort(byCasosThenAlertas).slice(0, GRAPH_MAX_NODES);
    }

    if (tier === 'amarillo_rojo') {
      const reds = list.filter((p) => providerTier(p) === 'rojo').sort(byAlertasThenRatio);
      const yellows = list.filter((p) => providerTier(p) === 'amarillo').sort(byAlertasThenRatio);
      const yellowsTaken = yellows.slice(0, Math.ceil(GRAPH_MAX_NODES / 2));
      const redsTaken = reds.slice(0, GRAPH_MAX_NODES - yellowsTaken.length);
      return [...redsTaken, ...yellowsTaken];
    }

    if (tier === 'todos') {
      const reds = list.filter((p) => providerTier(p) === 'rojo').sort(byAlertasThenRatio);
      const yellows = list.filter((p) => providerTier(p) === 'amarillo').sort(byAlertasThenRatio);
      const standards = list.filter((p) => providerTier(p) === 'estandar').sort(byCasosThenAlertas);
      const yellowsTaken = yellows.slice(0, Math.min(yellows.length, 3));
      const standardsTaken = standards.slice(0, Math.min(standards.length, 3));
      const redsTaken = reds.slice(
        0,
        GRAPH_MAX_NODES - yellowsTaken.length - standardsTaken.length,
      );
      return [...redsTaken, ...yellowsTaken, ...standardsTaken];
    }

    return [...list].sort(byAlertasThenRatio).slice(0, GRAPH_MAX_NODES);
  });

  protected readonly graphHiddenCount = computed(() =>
    Math.max(0, this.tierFilteredProviders().length - GRAPH_MAX_NODES),
  );

  /** Providers actually rendered: ring mode → top-15, grid mode → all in the tier filter. */
  protected readonly graphDisplayProviders = computed<Provider[]>(() =>
    this.viewMode() === 'grid' ? this.tierFilteredProviders() : this.graphProviders(),
  );

  protected readonly graphSubtitle = computed(() => {
    const total = this.tierFilteredProviders().length;
    if (this.viewMode() === 'grid') {
      return `mostrando ${total}`;
    }
    if (total > GRAPH_MAX_NODES) {
      return `top ${GRAPH_MAX_NODES} de ${total}`;
    }
    return `${total} proveedor${total === 1 ? '' : 'es'}`;
  });

  protected setFilter(value: RamoFilter): void {
    this.filter.set(value);
  }

  protected setGraphTier(value: GraphTierFilter): void {
    this.graphTier.set(value);
  }

  protected setViewMode(value: GraphViewMode): void {
    this.viewMode.set(value);
  }

  protected ramoLabel(key: RamoKey): string {
    return RAMOS[key].label;
  }

  protected ramoIconFor(key: RamoKey): string {
    return RAMOS[key].icon;
  }

  protected chipClasses(value: RamoFilter): string {
    return value === this.filter()
      ? 'bg-brand-soft border-brand text-brand-ink'
      : 'bg-surface border-line text-ink-2 hover:bg-soft';
  }

  protected countBadgeClasses(value: RamoFilter): string {
    return value === this.filter()
      ? 'bg-canvas text-brand-ink ring-1 ring-inset ring-brand/15'
      : 'bg-soft text-ink-3';
  }

  protected tierChipClasses(value: GraphTierFilter): string {
    return value === this.graphTier()
      ? 'bg-brand-soft border-brand text-brand-ink'
      : 'bg-surface border-line text-ink-2 hover:bg-soft';
  }

  protected viewModeChipClasses(value: GraphViewMode): string {
    return value === this.viewMode()
      ? 'bg-brand-soft border-brand text-brand-ink'
      : 'bg-surface border-line text-ink-2 hover:bg-soft';
  }

  protected onExport(req: ExportRequest): void {
    exportProviders(this.filteredProviders(), req);
  }
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function alertRatio(p: Provider): number {
  return p.casos > 0 ? p.alertas / p.casos : 0;
}

function byAlertasThenRatio(a: Provider, b: Provider): number {
  return b.alertas - a.alertas || alertRatio(b) - alertRatio(a);
}

function byCasosThenAlertas(a: Provider, b: Provider): number {
  return b.casos - a.casos || b.alertas - a.alertas;
}

type TierBand = 'rojo' | 'amarillo' | 'estandar';

/** Same thresholds the network-graph component uses for node coloring. */
function providerTier(p: Provider): TierBand {
  const ratio = alertRatio(p);
  if (ratio > 0.4) return 'rojo';
  if (ratio > 0.2) return 'amarillo';
  return 'estandar';
}

function matchesTierFilter(p: Provider, filter: GraphTierFilter): boolean {
  const band = providerTier(p);
  switch (filter) {
    case 'todos':
      return true;
    case 'rojo':
      return band === 'rojo';
    case 'amarillo_rojo':
      return band === 'rojo' || band === 'amarillo';
    case 'estandar':
      return band === 'estandar';
  }
}

function providerRamoKeys(provider: Provider): RamoKey[] {
  const raw = provider.ramos ?? [];
  if (raw.length === 0) return ['otros'];
  return Array.from(new Set(raw.map(normalizeRamoKey)));
}
