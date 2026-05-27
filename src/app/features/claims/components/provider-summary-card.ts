import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icon } from '@shared/ui/icon';
import { initials } from '@shared/utils';
import type { Provider } from '@shared/models';

@Component({
  selector: 'claim-provider-summary-card',
  standalone: true,
  imports: [Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <h3 class="text-[13px] font-semibold m-0">Proveedor / Beneficiario</h3>
        @if (provider().listaRestrictiva) {
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-tier-red-soft text-tier-red-ink">Lista restrictiva</span>
        }
      </div>
      <div class="px-5 py-4.5">
        <a
          [routerLink]="['/providers', provider().id]"
          class="flex items-center gap-3 mb-3.5 -mx-1 px-1 py-1 rounded-md hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft cursor-pointer group"
          [title]="'Ver ficha de ' + provider().nombre"
        >
          <div class="w-9 h-9 rounded-md grid place-items-center font-semibold text-[12px] text-white shrink-0" [style.background]="provider().color">
            {{ initials(provider().nombre) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-[13.5px] group-hover:text-brand-ink">{{ provider().nombre }}</div>
            <div class="text-[11.5px] text-ink-3">{{ provider().tipo }} · {{ provider().ciudad }}</div>
          </div>
          <ui-icon name="chevron_right" [size]="16" class="text-ink-4 group-hover:text-brand-ink shrink-0" />
        </a>
        <div class="grid grid-cols-3 gap-2.5 text-[12.5px]">
          <div>
            <div class="text-[11.5px] text-ink-3">Casos</div>
            <div class="font-medium tabular-nums">{{ provider().casos }}</div>
          </div>
          <div>
            <div class="text-[11.5px] text-ink-3">Alertas</div>
            <div class="font-medium tabular-nums text-tier-red-ink">{{ provider().alertas }}</div>
          </div>
          <div>
            <div class="text-[11.5px] text-ink-3">% riesgo</div>
            <div class="font-medium tabular-nums">{{ riskPct() }}%</div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ProviderSummaryCard {
  readonly provider = input.required<Provider>();

  protected readonly initials = initials;
  protected readonly riskPct = computed(() =>
    Math.round((this.provider().alertas / this.provider().casos) * 100),
  );
}
