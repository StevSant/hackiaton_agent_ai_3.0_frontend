import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import type {
  NetworkClaimDto,
  NetworkEdgeDto,
  NetworkNodeDto,
  NetworkNodeKind,
} from '@core/api/clients/network.api';
import { Button } from '@shared/ui/button';
import { ExportModal, type ExportRequest } from '@shared/ui/export-modal';
import { Icon } from '@shared/ui/icon';
import { Pagination } from '@shared/ui/pagination';
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
import { NetworkMatrix } from '../components/network-matrix';
import { ProviderRanking } from '../components/provider-ranking';
import { RamoDistributionCard } from '../components/ramo-distribution-card';
import type { Provider } from '@shared/models';
import type { ColumnSpec, GraphEdge, RelationMode } from '../models';
import { ProvidersStore } from '@core/state/providers.store';

type RamoFilter = 'todos' | RamoKey;
type GraphTierFilter = 'todos' | 'rojo' | 'amarillo_rojo' | 'estandar';
type GraphLayout = 'columnas' | 'estrella' | 'fuerza' | 'matriz';

interface GraphView {
  nodes: NetworkNodeDto[];
  edges: GraphEdge[];
  columns: ColumnSpec[];
}

const COL_X = { left: 17, mid: 50, right: 83 } as const;

function casoToNode(c: NetworkClaimDto): NetworkNodeDto {
  return {
    id: c.id,
    label: c.label,
    kind: 'caso',
    ciudad: c.ciudad,
    casos: 1,
    alertas: c.alerta ? 1 : 0,
    monto: c.monto,
    lista_restrictiva: false,
    ramos: [c.ramo],
    tier: c.tier,
  };
}

function casoEdge(source: string, target: string, c: NetworkClaimDto): GraphEdge {
  return { source, target, casos: 1, alertas: c.alerta ? 1 : 0, monto: c.monto };
}

@Component({
  selector: 'page-network',
  standalone: true,
  imports: [
    Button,
    ExportModal,
    Icon,
    NetworkGraph,
    NetworkMatrix,
    Pagination,
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

    <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
      @for (kpi of kpiRows(); track kpi.label) {
        <div class="bg-surface border border-line rounded-lg shadow-1 px-4 py-3 flex items-center gap-3">
          <span class="w-9 h-9 rounded-md grid place-items-center shrink-0" [class]="kpi.iconCls">
            <ui-icon [name]="kpi.icon" [size]="17" />
          </span>
          <div class="min-w-0">
            <div class="text-[20px] leading-tight font-semibold tabular-nums" [class]="kpi.valueCls">{{ kpi.value }}</div>
            <div class="text-[11.5px] text-ink-3 truncate">{{ kpi.label }}</div>
          </div>
        </div>
      }
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5 items-stretch">
      <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden flex flex-col min-h-[420px]">
        <div class="px-5 py-3.5 border-b border-line shrink-0 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 class="text-[13px] font-semibold m-0">Mapa de relaciones</h3>
            <div class="text-[12px] text-ink-3 mt-0.5">{{ graphHint() }}</div>
            <div class="text-[11.5px] text-ink-2 mt-1 font-medium">{{ graphSubtitle() }}</div>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <div class="flex flex-wrap items-center justify-end gap-1.5">
              <span class="text-[11px] uppercase tracking-wide text-ink-3 mr-0.5">Relación</span>
              @for (opt of relationOptions; track opt.value) {
                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] border transition-colors"
                  [class]="relationChipClasses(opt.value)"
                  (click)="setRelationMode(opt.value)"
                >
                  <ui-icon [name]="opt.icon" [size]="13" />
                  {{ opt.label }}
                </button>
              }
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[11px] uppercase tracking-wide text-ink-3 mr-0.5">Vista</span>
              @for (opt of layoutOptions(); track opt.value) {
                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] border transition-colors"
                  [class]="layoutChipClasses(opt.value)"
                  (click)="setGraphLayout(opt.value)"
                >
                  <ui-icon [name]="opt.icon" [size]="13" />
                  {{ opt.label }}
                </button>
              }
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[11px] uppercase tracking-wide text-ink-3 mr-0.5">Riesgo</span>
              @for (opt of graphTierOptions; track opt.value) {
                <button
                  type="button"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] border transition-colors"
                  [class]="tierChipClasses(opt.value)"
                  (click)="setGraphTier(opt.value)"
                >
                  {{ opt.label }}
                </button>
              }
            </div>
          </div>
        </div>
        @if (graphLayout() === 'matriz') {
          <network-matrix
            class="flex-1"
            [nodes]="graphNodes()"
            [edges]="graphEdges()"
            (openNode)="onOpenNode($event)"
          />
        } @else {
          <network-graph
            class="flex-1"
            [nodes]="graphView().nodes"
            [edges]="graphView().edges"
            [columns]="graphView().columns"
            [layout]="nodeLayout()"
            (openNode)="onOpenNode($event)"
          />
        }
      </div>

      <network-ramo-distribution-card />
    </div>

    @if (allLinks().length > 0) {
      <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden mb-5">
        <div class="px-5 py-3.5 border-b border-line">
          <h3 class="text-[13px] font-semibold m-0">Vínculos más sospechosos</h3>
          <div class="text-[12px] text-ink-3 mt-0.5">
            Pares proveedor–asegurado ordenados por alertas y siniestros compartidos.
          </div>
        </div>
        <ul class="divide-y divide-line">
          @for (link of pagedLinks(); track link.provId + link.asegLabel; let i = $index) {
            <li
              class="flex items-center gap-3 px-5 py-3 hover:bg-soft cursor-pointer"
              (click)="onOpenNode({ id: link.provId, kind: 'proveedor' })"
            >
              <span class="w-6 text-[12px] font-semibold text-ink-3 tabular-nums shrink-0">{{ linksRankOffset() + i + 1 }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap text-[13px]">
                  <span class="font-medium text-ink truncate">{{ link.provLabel }}</span>
                  <ui-icon name="sync_alt" [size]="13" class="text-ink-4" />
                  <span class="text-ink-2 truncate">{{ link.asegLabel }}</span>
                  @if (link.listaRestrictiva) {
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-tier-red-soft text-tier-red-ink border border-[var(--tier-red)]">Lista restrictiva</span>
                  }
                </div>
              </div>
              <div class="flex items-center gap-4 shrink-0 text-[12px] tabular-nums">
                <span class="text-tier-red-ink font-semibold">{{ link.alertas }} alertas</span>
                <span class="text-ink-3">{{ link.casos }} siniestros</span>
                <span class="text-ink-2 font-medium w-16 text-right">{{ link.monto }}</span>
              </div>
            </li>
          }
        </ul>
        <div class="px-5 py-3 border-t border-line">
          <ui-pagination
            variant="numbered"
            noun="vínculos"
            [page]="linksPage()"
            [pageSize]="linksPageSize()"
            [total]="allLinks().length"
            (pageChange)="linksPage.set($event)"
          />
        </div>
      </div>
    }

    @if (filteredProviders().length === 0) {
      <div class="bg-surface border border-line rounded-lg shadow-1 px-5 py-10 text-center text-ink-3 text-[13px]">
        Sin proveedores en este ramo.
      </div>
    } @else {
      <network-provider-ranking
        [providers]="pagedProviders()"
        [rankOffset]="providersRankOffset()"
      />
      <div class="bg-surface border border-line rounded-lg shadow-1 px-5 py-3 mt-3">
        <ui-pagination
          variant="numbered"
          noun="proveedores"
          [page]="providersPage()"
          [pageSize]="providersPageSize()"
          [total]="filteredProviders().length"
          (pageChange)="providersPage.set($event)"
        />
      </div>
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
  protected readonly graphLayout = signal<GraphLayout>('columnas');
  protected readonly relationMode = signal<RelationMode>('prov_aseg');
  protected readonly linksPage = signal<number>(0);
  protected readonly linksPageSize = signal<number>(10);
  protected readonly providersPage = signal<number>(0);
  protected readonly providersPageSize = signal<number>(10);
  protected readonly exportOpen = signal<boolean>(false);
  protected readonly providerColumns = PROVIDER_EXPORT_COLUMNS;
  protected readonly ramoOptions: readonly RamoKey[] = RAMO_KEYS;
  protected readonly graphTierOptions: ReadonlyArray<{ value: GraphTierFilter; label: string }> = [
    { value: 'todos', label: 'Todos' },
    { value: 'rojo', label: 'Solo rojos' },
    { value: 'amarillo_rojo', label: 'Amarillos + rojos' },
    { value: 'estandar', label: 'Estándar' },
  ];
  protected readonly graphLayoutOptions: ReadonlyArray<{ value: GraphLayout; label: string; icon: string }> = [
    { value: 'columnas', label: 'Columnas', icon: 'view_column' },
    { value: 'estrella', label: 'Estrella', icon: 'hub' },
    { value: 'fuerza', label: 'Fuerza', icon: 'scatter_plot' },
    { value: 'matriz', label: 'Matriz', icon: 'grid_on' },
  ];
  protected readonly relationOptions: ReadonlyArray<{ value: RelationMode; label: string; icon: string }> = [
    { value: 'prov_aseg', label: 'Proveedor · Asegurado', icon: 'sync_alt' },
    { value: 'prov_caso', label: 'Proveedor · Caso', icon: 'description' },
    { value: 'aseg_caso', label: 'Asegurado · Caso', icon: 'description' },
    { value: 'tripartito', label: 'Tripartito', icon: 'account_tree' },
  ];

  /** Matriz only makes sense for the bipartite provider↔insured view. */
  protected readonly layoutOptions = computed(() =>
    this.relationMode() === 'prov_aseg'
      ? this.graphLayoutOptions
      : this.graphLayoutOptions.filter((o) => o.value !== 'matriz'),
  );

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

  /** Sorted like ProviderRanking (by alert ratio) so paginated ranks stay global. */
  protected readonly sortedProviders = computed<Provider[]>(() =>
    [...this.filteredProviders()].sort((l, r) => r.alertas / r.casos - l.alertas / l.casos),
  );

  protected readonly providersRankOffset = computed(
    () => this.providersPage() * this.providersPageSize(),
  );

  protected readonly pagedProviders = computed<Provider[]>(() => {
    const start = this.providersRankOffset();
    return this.sortedProviders().slice(start, start + this.providersPageSize());
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

  /** Provider nodes that pass both the ramo (top filter) and tier (graph) filters. */
  private readonly visibleProviderIds = computed<Set<string>>(() => {
    const tier = this.graphTier();
    const ramo = this.filter();
    const ids = new Set<string>();
    for (const n of this.relations().nodes) {
      if (n.kind !== 'proveedor') continue;
      if (tier !== 'todos' && !matchesNodeTier(n, tier)) continue;
      if (ramo !== 'todos' && !(n.ramos ?? []).map(normalizeRamoKey).includes(ramo)) continue;
      ids.add(n.id);
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

  /** Claims behind the visible providers — the bridge nodes for case views. */
  private readonly visibleCasos = computed<NetworkClaimDto[]>(() => {
    const provIds = this.visibleProviderIds();
    return (this.relations().casos ?? []).filter(
      (c) => c.proveedor_id != null && provIds.has(c.proveedor_id),
    );
  });

  /** Provider/insured nodes from the relations payload, indexed for reuse. */
  private readonly nodesById = computed(
    () => new Map(this.relations().nodes.map((n) => [n.id, n])),
  );

  /** Node + edge + column set for the active relationship mode. */
  protected readonly graphView = computed<GraphView>(() => {
    switch (this.relationMode()) {
      case 'prov_caso':
        return this.buildCasoView('proveedor');
      case 'aseg_caso':
        return this.buildCasoView('asegurado');
      case 'tripartito':
        return this.buildTripartiteView();
      default:
        return this.buildProviderInsuredView();
    }
  });

  private buildProviderInsuredView(): GraphView {
    const edges: GraphEdge[] = this.graphEdges().map((e) => ({
      source: e.proveedor_id,
      target: e.asegurado_id,
      casos: e.casos_compartidos,
      alertas: e.alertas,
      monto: e.monto,
    }));
    return {
      nodes: this.graphNodes(),
      edges,
      columns: [
        { kind: 'proveedor', label: 'Proveedores', x: COL_X.left },
        { kind: 'asegurado', label: 'Asegurados', x: COL_X.right },
      ],
    };
  }

  /** Bipartite view linking one anchor side (provider or insured) to its claims. */
  private buildCasoView(anchor: 'proveedor' | 'asegurado'): GraphView {
    const casos = this.visibleCasos();
    const byId = this.nodesById();
    const anchorIds = new Set<string>();
    const edges: GraphEdge[] = [];
    for (const c of casos) {
      const anchorId = anchor === 'proveedor' ? c.proveedor_id : c.asegurado_id;
      if (!anchorId) continue;
      anchorIds.add(anchorId);
      edges.push(casoEdge(anchorId, c.id, c));
    }
    const anchorNodes = [...anchorIds]
      .map((id) => byId.get(id))
      .filter((n): n is NetworkNodeDto => n != null);
    const label = anchor === 'proveedor' ? 'Proveedores' : 'Asegurados';
    return {
      nodes: [...anchorNodes, ...casos.map(casoToNode)],
      edges,
      columns: [
        { kind: anchor, label, x: COL_X.left },
        { kind: 'caso', label: 'Casos', x: COL_X.right },
      ],
    };
  }

  private buildTripartiteView(): GraphView {
    const casos = this.visibleCasos();
    const byId = this.nodesById();
    const provIds = new Set<string>();
    const asegIds = new Set<string>();
    const edges: GraphEdge[] = [];
    for (const c of casos) {
      if (c.proveedor_id) {
        provIds.add(c.proveedor_id);
        edges.push(casoEdge(c.proveedor_id, c.id, c));
      }
      asegIds.add(c.asegurado_id);
      edges.push(casoEdge(c.id, c.asegurado_id, c));
    }
    const pick = (ids: Set<string>): NetworkNodeDto[] =>
      [...ids].map((id) => byId.get(id)).filter((n): n is NetworkNodeDto => n != null);
    return {
      nodes: [...pick(provIds), ...casos.map(casoToNode), ...pick(asegIds)],
      edges,
      columns: [
        { kind: 'proveedor', label: 'Proveedores', x: COL_X.left },
        { kind: 'caso', label: 'Casos', x: COL_X.mid },
        { kind: 'asegurado', label: 'Asegurados', x: COL_X.right },
      ],
    };
  }

  protected readonly graphHint = computed(() => {
    if (this.graphLayout() === 'matriz') {
      return 'Cada celda cuenta los siniestros que comparten un proveedor y un asegurado. Más oscuro = más casos en común.';
    }
    switch (this.relationMode()) {
      case 'prov_caso':
        return 'Cada proveedor enlazado con los siniestros en los que figura como beneficiario.';
      case 'aseg_caso':
        return 'Cada asegurado enlazado con sus siniestros. Clic en un nodo para aislar sus vínculos.';
      case 'tripartito':
        return 'Cadena proveedor → caso → asegurado. Útil para rastrear redes de colusión completas.';
      default:
        return 'Cada línea une un proveedor con un asegurado que comparten siniestros. Clic en un nodo para aislar sus vínculos.';
    }
  });

  /** All provider↔insured links in view, ranked by alerts + shared claims. */
  protected readonly allLinks = computed(() => {
    const labels = new Map(this.graphNodes().map((n) => [n.id, n.label]));
    const restrictiva = new Map(
      this.graphNodes().filter((n) => n.kind === 'proveedor').map((n) => [n.id, n.lista_restrictiva]),
    );
    return [...this.graphEdges()]
      .sort((a, b) => b.alertas - a.alertas || b.casos_compartidos - a.casos_compartidos)
      .map((e) => ({
        provId: e.proveedor_id,
        provLabel: labels.get(e.proveedor_id) ?? e.proveedor_id,
        asegLabel: labels.get(e.asegurado_id) ?? e.asegurado_id,
        casos: e.casos_compartidos,
        alertas: e.alertas,
        monto: formatMoneyShort(e.monto),
        listaRestrictiva: restrictiva.get(e.proveedor_id) ?? false,
      }));
  });

  /** Zero-based rank of the first row on the current page (for the "#" column). */
  protected readonly linksRankOffset = computed(() => this.linksPage() * this.linksPageSize());

  /** Links for the current page only. */
  protected readonly pagedLinks = computed(() => {
    const start = this.linksRankOffset();
    return this.allLinks().slice(start, start + this.linksPageSize());
  });

  /** Narrowed layout for the node-link graph (matriz uses a separate component). */
  protected readonly nodeLayout = computed<'columnas' | 'estrella' | 'fuerza'>(() => {
    const l = this.graphLayout();
    return l === 'estrella' || l === 'fuerza' ? l : 'columnas';
  });

  protected readonly graphSubtitle = computed(() => {
    const view = this.graphView();
    const links = view.edges.length;
    if (links === 0) return 'sin vínculos';
    const nodes = view.nodes.length;
    return `${nodes} nodo${nodes === 1 ? '' : 's'} · ${links} vínculo${links === 1 ? '' : 's'}`;
  });

  protected onOpenNode(node: { id: string; kind: NetworkNodeKind }): void {
    const path =
      node.kind === 'proveedor'
        ? '/providers'
        : node.kind === 'asegurado'
          ? '/asegurados'
          : '/claims';
    void this.router.navigate([path, node.id]);
  }

  protected setRelationMode(value: RelationMode): void {
    this.relationMode.set(value);
    // Matriz is provider↔insured only — fall back when leaving that mode.
    if (value !== 'prov_aseg' && this.graphLayout() === 'matriz') {
      this.graphLayout.set('columnas');
    }
  }

  protected relationChipClasses(value: RelationMode): string {
    return value === this.relationMode()
      ? 'bg-brand-soft border-brand text-brand-ink'
      : 'bg-surface border-line text-ink-2 hover:bg-soft';
  }

  protected setFilter(value: RamoFilter): void {
    this.filter.set(value);
    this.linksPage.set(0);
    this.providersPage.set(0);
  }

  protected setGraphTier(value: GraphTierFilter): void {
    this.graphTier.set(value);
    this.linksPage.set(0);
  }

  protected setGraphLayout(value: GraphLayout): void {
    this.graphLayout.set(value);
  }

  protected layoutChipClasses(value: GraphLayout): string {
    return value === this.graphLayout()
      ? 'bg-brand-soft border-brand text-brand-ink'
      : 'bg-surface border-line text-ink-2 hover:bg-soft';
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
