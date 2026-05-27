import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { formatMoney, initials } from '@shared/utils';
import type { Provider } from '@shared/models';

@Component({
  selector: 'providers-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-[13px] border-collapse">
          <thead>
            <tr class="bg-soft">
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Proveedor</th>
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Tipo</th>
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Ciudad</th>
              <th class="text-right font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Casos</th>
              <th class="text-right font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Alertas</th>
              <th class="text-right font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Monto</th>
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (p of providers(); track p.id) {
              <tr
                class="border-b border-line last:border-b-0 hover:bg-hover cursor-pointer"
                (click)="open.emit(p.id)"
              >
                <td class="py-2.5 px-4">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-8 h-8 rounded-md grid place-items-center font-semibold text-[11.5px] text-white shrink-0"
                      [style.background]="p.color"
                    >
                      {{ initials(p.nombre) }}
                    </div>
                    <div class="min-w-0">
                      <div class="font-medium text-ink truncate">{{ p.nombre }}</div>
                      <div class="text-[11px] text-ink-3 font-mono truncate">{{ p.id }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-2.5 px-4 text-ink-2">{{ p.tipo }}</td>
                <td class="py-2.5 px-4 text-ink-2">{{ p.ciudad }}</td>
                <td class="py-2.5 px-4 text-right tabular-nums font-medium">{{ p.casos }}</td>
                <td
                  class="py-2.5 px-4 text-right tabular-nums font-medium"
                  [class.text-tier-red-ink]="p.alertas >= 6"
                  [class.text-tier-yellow-ink]="p.alertas >= 3 && p.alertas < 6"
                >
                  {{ p.alertas }}
                </td>
                <td class="py-2.5 px-4 text-right tabular-nums">{{ money(p.monto) }}</td>
                <td class="py-2.5 px-4">
                  @if (p.listaRestrictiva) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-tier-red-soft text-tier-red-ink">
                      Lista restrictiva
                    </span>
                  } @else {
                    <span class="text-ink-3 text-[12px]">—</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ProvidersTable {
  readonly providers = input.required<Provider[]>();
  readonly open = output<string>();

  protected readonly initials = initials;
  protected readonly money = formatMoney;
}
