import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { RiskBar } from '../../../shared/ui/risk-bar';
import { formatMoney, initials } from '../../../shared/utils';
import type { Provider } from '../models';

@Component({
  selector: 'network-provider-ranking',
  standalone: true,
  imports: [RiskBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line bg-soft/40">
        <h3 class="text-[13px] font-semibold m-0">Ranking por concentración de alertas</h3>
        <span class="text-[11.5px] text-ink-3 whitespace-nowrap">Ordenado por % observado</span>
      </div>

      <div class="divide-y divide-line">
        @for (provider of sorted(); track provider.id; let rank = $index) {
          <div class="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 hover:bg-soft/50 transition-colors">
            <div class="flex flex-col items-center gap-1">
              <span class="text-[10px] font-mono text-ink-4 tabular-nums">{{ rank + 1 }}</span>
              <div
                class="w-9 h-9 rounded-md grid place-items-center font-semibold text-[11px] text-white shrink-0"
                [style.background]="provider.color"
              >
                {{ initials(provider.nombre) }}
              </div>
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <div class="font-medium text-[13.5px]">{{ provider.nombre }}</div>
                @if (provider.listaRestrictiva) {
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-tier-red-soft text-tier-red-ink whitespace-nowrap">
                    Lista restrictiva
                  </span>
                }
              </div>
              <div class="text-[11.5px] text-ink-3 mt-0.5 whitespace-nowrap truncate">
                <span class="font-mono text-ink-4 mr-2">{{ provider.id }}</span>
                {{ provider.tipo }} · {{ provider.ciudad }} · {{ provider.casos }} casos
              </div>
              <div class="mt-2.5 max-w-md">
                <ui-risk-bar [score]="alertRatio(provider)" />
              </div>
            </div>

            <div class="text-right shrink-0">
              <div class="font-serif text-[18px] leading-none tabular-nums">{{ money(provider.monto) }}</div>
              <div class="text-[11px] mt-1 whitespace-nowrap">
                <span [class]="alertasClass(provider)">{{ provider.alertas }} alertas</span>
                <span class="text-ink-4 mx-1">·</span>
                <span class="text-ink-3">{{ alertRatio(provider) }}%</span>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ProviderRanking {
  readonly providers = input.required<readonly Provider[]>();

  protected readonly initials = initials;
  protected readonly money = formatMoney;

  protected readonly sorted = computed(() =>
    [...this.providers()].sort((left, right) => right.alertas / right.casos - left.alertas / left.casos),
  );

  protected alertRatio(provider: Provider): number {
    return Math.round((provider.alertas / provider.casos) * 100);
  }

  protected alertasClass(provider: Provider): string {
    const ratio = provider.alertas / provider.casos;
    return ratio > 0.4
      ? 'text-tier-red-ink font-medium'
      : ratio > 0.2
        ? 'text-tier-yellow-ink font-medium'
        : 'text-tier-green-ink font-medium';
  }
}
