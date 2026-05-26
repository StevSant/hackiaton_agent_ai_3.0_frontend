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
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <h3 class="text-[13px] font-semibold m-0">Ranking por concentración de alertas</h3>
        <span class="text-[11.5px] text-ink-3">Ordenado por % de casos observados</span>
      </div>
      @for (p of sorted(); track p.id) {
        <div class="grid grid-cols-[36px_1fr_auto] items-center gap-3.5 px-5 py-3.5 border-t border-line first:border-t-0">
          <div class="w-9 h-9 rounded-md grid place-items-center font-semibold text-[12px] text-white" [style.background]="p.color">
            {{ initials(p.nombre) }}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <div class="font-medium text-[13.5px]">{{ p.nombre }}</div>
              @if (p.listaRestrictiva) {
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-tier-red-soft text-tier-red-ink">Lista restrictiva</span>
              }
            </div>
            <div class="text-[11.5px] text-ink-3 mt-0.5">
              <span class="font-mono text-ink-4 mr-2">{{ p.id }}</span>
              {{ p.tipo }} · {{ p.ciudad }} · {{ p.casos }} casos
            </div>
            <div class="mt-2 max-w-[380px]">
              <ui-risk-bar [score]="ratio(p)" />
            </div>
          </div>
          <div class="text-right">
            <div class="font-serif text-[18px] leading-none tabular-nums">{{ money(p.monto) }}</div>
            <div class="text-[11px] text-ink-3 mt-1">
              <span [class]="alertasClass(p)">{{ p.alertas }} alertas</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ProviderRanking {
  readonly providers = input.required<readonly Provider[]>();

  protected readonly initials = initials;
  protected readonly money = formatMoney;

  protected readonly sorted = computed(() =>
    [...this.providers()].sort((a, b) => b.alertas / b.casos - a.alertas / a.casos),
  );

  protected ratio(p: Provider): number {
    return Math.round((p.alertas / p.casos) * 100);
  }

  protected alertasClass(p: Provider): string {
    const r = p.alertas / p.casos;
    return r > 0.4 ? 'text-tier-red-ink' : r > 0.2 ? 'text-tier-yellow-ink' : 'text-tier-green-ink';
  }
}
