import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import type { NetworkEdgeDto, NetworkNodeDto } from '@core/api/clients/network.api';
import { Button } from '@shared/ui/button';
import { ExportModal, type ExportRequest } from '@shared/ui/export-modal';
import { Icon } from '@shared/ui/icon';
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

@Component({
  selector: 'page-network',
  standalone: true,
  imports: [
    Button,
    ExportModal,
    Icon,
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

    <ul class="bg-surface border border-line rounded-lg shadow-1 divide-y divide-line mb-5">
      @for (kpi of kpiRows(); track kpi.label) {
        <li class="flex items-center gap-3 px-4 py-3">
          <span class="w-8 h-8 rounded-md grid place-items-center shrink-0" [class]="kpi.iconCls">
            <ui-icon [name]="kpi.icon" [size]="16" />
          </span>
          <span class="text-[13px] text-ink-2 flex-1">{{ kpi.label }}</span>
          <span class="text-[15px] font-semibold tabular-nums" [class]="kpi.valueCls">{{ kpi.value }}</span>
        </li>
      }
    </ul>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5 items-stretch">
      <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden flex flex-col min-h-[420px]">
        <div class="px-5 py-3.5 border-b border-line shrink-0 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 class="text-[13px] font-semibold m-0">Mapa de relaciones</h3>
            <div class="text-[12px] text-ink-3 mt-0.5">
              Proveedor ↔ asegurado por siniestros compartidos · {{ graphSubtitle() }}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
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
          [nodes]="graphNodes()"
          [edges]="graphEdges()"
          (openNode)="onOpenNode($event)"
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

  private readonly router = inject(Router);

  protected readonly providers = this.store.providers;
  protected readonly stats = this.store.stats;
  protected readonly relations = this.store.relations;
  protected readonly filter = signal<RamoFilter>('todos');
  protected readonly graphTier = signal<GraphTierFilter>('amarillo_rojo');
  protected readonly exportOpen = signal<boolean>(false);
  protected readonly providerColumns = PROVIDER_EXPORT_COLUMNS;
  protected readonly ramoOptions: readonly RamoKey[] = RAMO_KEYS;
  protected readonly graphTierOptions: ReadonlyArray<{ value: GraphTierFilter; label: string }> = [
    { value: 'todos', label: 'Todos' },
    { value: 'rojo', label: 'Solo rojos' },
    { value: 'amarillo_rojo', label: 'Amarillos + rojos' },
    { value: 'estandar', label: 'Estándar' },
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

  protected readonly kpiRows = computed(() => {
    const s = this.filteredStats();
    return [
      { label: 'Proveedores activos', value: String(s.total), icon: 'work', iconCls: 'bg-brand-soft text-brand-ink', valueCls: 'text-ink' },
      { label: 'En lista restrictiva', value: String(s.restrictiva), icon: 'warning', iconCls: 'bg-tier-red-soft text-tier-red-ink', valueCls: 'text-tier-red-ink' },
      { label: 'Alertas concentradas', value: String(s.alertas), icon: 'flag', iconCls: 'bg-tier-yellow-soft text-tier-yellow-ink', valueCls: 'text-tier-yellow-ink' },
      { label: 'Monto observado', value: formatMoneyShort(s.monto), icon: 'trending_up', iconCls: 'bg-brand-soft text-brand-ink', valueCls: 'text-ink' },
    ];
  });

  /** Provider nodes that pass the graph tier filter (by alert ratio). */
  private readonly visibleProviderIds = computed<Set<string>>(() => {
    const tier = this.graphTier();
    const ids = new Set<string>();
    for (const n of this.relations().nodes) {
      if (n.kind !== 'proveedor') continue;
      if (tier === 'todos' || matchesNodeTier(n, tier)) ids.add(n.id);
    }
    return ids;
  });

  /** Edges kept after the provider tier filter. */
  protected readonly graphEdges = computed<NetworkEdgeDto[]>(() => {
    const provIds = this.visibleProviderIds();
    return this.relations().edges.filter((e) => provIds.has(e.proveedor_id));
  });

  /** Nodes referenced by at least one surviving edge. */
  protected readonly graphNodes = computed<NetworkNodeDto[]>(() => {
    const edges = this.graphEdges();
    const provIds = new Set(edges.map((e) => e.proveedor_id));
    const asegIds = new Set(edges.map((e) => e.asegurado_id));
    return this.relations().nodes.filter((n) =>
      n.kind === 'proveedor' ? provIds.has(n.id) : asegIds.has(n.id),
    );
  });

  protected readonly graphSubtitle = computed(() => {
    const provs = this.graphNodes().filter((n) => n.kind === 'proveedor').length;
    const links = this.graphEdges().length;
    if (links === 0) return 'sin vínculos';
    return `${provs} proveedor${provs === 1 ? '' : 'es'} · ${links} vínculo${links === 1 ? '' : 's'}`;
  });

  protected onOpenNode(node: { id: string; kind: 'proveedor' | 'asegurado' }): void {
    const path = node.kind === 'proveedor' ? '/providers' : '/asegurados';
    void this.router.navigate([path, node.id]);
  }

  protected setFilter(value: RamoFilter): void {
    this.filter.set(value);
  }

  protected setGraphTier(value: GraphTierFilter): void {
    this.graphTier.set(value);
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

  protected onExport(req: ExportRequest): void {
    exportProviders(this.filteredProviders(), req);
  }
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type TierBand = 'rojo' | 'amarillo' | 'estandar';

/** Same thresholds the network-graph component uses for node coloring. */
function nodeTier(alertas: number, casos: number): TierBand {
  const ratio = casos > 0 ? alertas / casos : 0;
  if (ratio > 0.4) return 'rojo';
  if (ratio > 0.2) return 'amarillo';
  return 'estandar';
}

function matchesNodeTier(node: NetworkNodeDto, filter: GraphTierFilter): boolean {
  const band = nodeTier(node.alertas, node.casos);
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
