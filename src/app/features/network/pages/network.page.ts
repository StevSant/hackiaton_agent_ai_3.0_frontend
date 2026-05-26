import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';
import { KpiSmall } from '../../../shared/ui/kpi-small';
import { NetworkGraph } from '../components/network-graph';
import { ProviderRanking } from '../components/provider-ranking';
import { RamoDistributionCard } from '../components/ramo-distribution-card';
import { ProvidersStore } from '../services/providers.store';
import { formatMoneyShort } from '../../../shared/utils';

@Component({
  selector: 'page-network',
  standalone: true,
  imports: [Button, Icon, KpiSmall, NetworkGraph, ProviderRanking, RamoDistributionCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Red de proveedores</h1>
        <p class="text-ink-3 text-[13.5px] m-0">
          Ranking de proveedores por concentración de alertas, montos y patrones cruzados.
        </p>
      </div>
      <ui-button>
        <ui-icon name="download" [size]="14" />
        Exportar ranking
      </ui-button>
    </div>

    <div class="grid grid-cols-4 gap-3 mb-5">
      <ui-kpi-small label="Proveedores activos" [value]="stats().total" icon="work" />
      <ui-kpi-small label="En lista restrictiva" [value]="stats().restrictiva" icon="warning" tone="red" />
      <ui-kpi-small label="Alertas concentradas" [value]="stats().alertas" icon="flag" tone="yellow" />
      <ui-kpi-small label="Monto observado" [value]="totalMonto()" icon="trending_up" tone="brand" />
    </div>

    <div class="grid grid-cols-2 gap-5 mb-5">
      <div class="bg-surface border border-line rounded-lg shadow-1">
        <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
          <div>
            <h3 class="text-[13px] font-semibold m-0">Mapa de relaciones</h3>
            <div class="text-[12px] text-ink-3 mt-0.5">Tamaño por volumen · color por riesgo</div>
          </div>
        </div>
        <network-graph [providers]="providers()" />
      </div>
      <network-ramo-distribution-card />
    </div>

    <network-provider-ranking [providers]="providers()" />
  `,
})
export class NetworkPage {
  private readonly store = inject(ProvidersStore);

  protected readonly providers = this.store.providers;
  protected readonly stats = this.store.stats;

  protected readonly totalMonto = computed(() => formatMoneyShort(this.stats().monto));
}
