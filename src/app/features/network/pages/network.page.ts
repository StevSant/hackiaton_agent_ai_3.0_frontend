import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import {
  RAMOS,
  RAMO_KEYS,
  formatMoneyShort,
  normalizeRamoKey,
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

/** Cap on graph nodes — beyond this the ring becomes unreadable. */
const GRAPH_MAX_NODES = 15;

@Component({
  selector: 'page-network',
  standalone: true,
  imports: [Button, Icon, KpiSmall, NetworkGraph, ProviderRanking, RamoDistributionCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-start justify-between gap-4 py-2 pb-5">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Red de proveedores</h1>
        <p class="text-ink-3 text-[13.5px] m-0 max-w-2xl">
          Ranking de proveedores por concentración de alertas, montos y patrones cruzados.
        </p>
      </div>
      <ui-button variant="secondary" class="shrink-0">
        <ui-icon name="download" [size]="14" />
        Exportar ranking
      </ui-button>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <span class="text-[11.5px] uppercase tracking-wide text-ink-3 mr-1">Ramo</span>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] border transition-colors"
        [class]="chipClasses('todos')"
        (click)="setFilter('todos')"
      >
        Todos
        <span class="text-[11px] text-ink-3 tabular-nums">{{ stats().total }}</span>
      </button>
      @for (key of ramoOptions; track key) {
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] border transition-colors"
          [class]="chipClasses(key)"
          (click)="setFilter(key)"
        >
          <ui-icon [name]="ramoIconFor(key)" [size]="13" />
          {{ ramoLabel(key) }}
          <span class="text-[11px] text-ink-3 tabular-nums">{{ counts()[key] }}</span>
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
              Tamaño por volumen · color por riesgo
              @if (graphHiddenCount() > 0) {
                · top {{ GRAPH_MAX_NODES }} de {{ tierFilteredProviders().length }}
              }
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
        <network-graph class="flex-1" [providers]="graphProviders()" />
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
  `,
})
export class NetworkPage {
  private readonly store = inject(ProvidersStore);

  protected readonly providers = this.store.providers;
  protected readonly stats = this.store.stats;
  protected readonly filter = signal<RamoFilter>('todos');
  protected readonly graphTier = signal<GraphTierFilter>('amarillo_rojo');
  protected readonly ramoOptions: readonly RamoKey[] = RAMO_KEYS;
  protected readonly GRAPH_MAX_NODES = GRAPH_MAX_NODES;
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

  /** Providers filtered by both ramo (top-level) and tier (graph-only). */
  protected readonly tierFilteredProviders = computed<Provider[]>(() => {
    const tier = this.graphTier();
    const list = this.filteredProviders();
    if (tier === 'todos') return list;
    return list.filter((p) => matchesTierFilter(p, tier));
  });

  /** What the graph actually renders — top-N by alert ratio after tier filter. */
  protected readonly graphProviders = computed<Provider[]>(() => {
    const list = [...this.tierFilteredProviders()];
    list.sort((a, b) => alertRatio(b) - alertRatio(a));
    return list.slice(0, GRAPH_MAX_NODES);
  });

  protected readonly graphHiddenCount = computed(() =>
    Math.max(0, this.tierFilteredProviders().length - GRAPH_MAX_NODES),
  );

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

  protected tierChipClasses(value: GraphTierFilter): string {
    return value === this.graphTier()
      ? 'bg-brand-soft border-brand text-brand-ink'
      : 'bg-surface border-line text-ink-2 hover:bg-soft';
  }
}

function alertRatio(p: Provider): number {
  return p.casos > 0 ? p.alertas / p.casos : 0;
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
