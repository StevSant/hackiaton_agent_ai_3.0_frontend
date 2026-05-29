import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { SavingsEstimate } from '@shared/models';
import { formatMoney } from '@shared/utils/format-money';

@Component({
  selector: 'claim-savings-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ahorro(); as est) {
      <div class="bg-surface border border-line rounded-lg px-5 py-4 shadow-1 flex flex-col gap-3">
        <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium">
          Estimación de ahorro potencial
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">Valor en riesgo</span>
            <span class="font-serif text-[22px] leading-none tabular-nums text-tier-red-ink">
              {{ formatMoney(est.valor_en_riesgo) }}
            </span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">Ahorro potencial estimado</span>
            <span class="font-serif text-[22px] leading-none tabular-nums text-tier-green-ink">
              {{ formatMoney(est.ahorro_potencial_estimado) }}
            </span>
          </div>
        </div>

        <p
          class="text-[11px] text-ink-3 m-0 leading-relaxed"
          title="Estimación basada en señales de riesgo, sujeta a revisión humana. No representa posible fraude confirmado."
        >
          Estimación basada en señales de riesgo, sujeta a revisión humana. No representa posible
          fraude confirmado.
        </p>
      </div>
    } @else {
      <div class="bg-surface border border-line rounded-lg px-5 py-4 shadow-1">
        <p class="text-[12.5px] text-ink-3 m-0">Sin estimación de ahorro disponible.</p>
      </div>
    }
  `,
})
export class SavingsCard {
  readonly ahorro = input.required<SavingsEstimate | null | undefined>();

  protected readonly formatMoney = formatMoney;
}
