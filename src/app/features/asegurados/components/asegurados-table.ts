import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { formatMoney, initials } from '@shared/utils';
import type { Asegurado } from '@shared/models';
import { Icon } from '@shared/ui/icon';

@Component({
  selector: 'asegurados-table',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-[13px] border-collapse">
          <thead>
            <tr class="bg-soft">
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Asegurado</th>
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Segmento</th>
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Ciudad</th>
              <th class="text-right font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Casos</th>
              <th class="text-right font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Alertas</th>
              <th class="text-right font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Monto</th>
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Estado</th>
              <th class="text-right font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-4 border-b border-line">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (a of asegurados(); track a.id) {
              <tr
                class="border-b border-line last:border-b-0 hover:bg-hover cursor-pointer"
                (click)="open.emit(a.id)"
              >
                <td class="py-2.5 px-4">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-8 h-8 rounded-full grid place-items-center font-semibold text-[11.5px] text-white shrink-0"
                      [style.background]="a.color"
                    >
                      {{ initials(a.nombre) }}
                    </div>
                    <div class="min-w-0">
                      <div class="font-medium text-ink truncate">{{ a.nombre }}</div>
                      <div class="text-[11px] text-ink-3 font-mono truncate">{{ a.id }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-2.5 px-4 text-ink-2">{{ a.segmento ?? '—' }}</td>
                <td class="py-2.5 px-4 text-ink-2">{{ a.ciudad }}</td>
                <td class="py-2.5 px-4 text-right tabular-nums font-medium">{{ a.casos }}</td>
                <td
                  class="py-2.5 px-4 text-right tabular-nums font-medium"
                  [class.text-tier-red-ink]="a.alertas >= 6"
                  [class.text-tier-yellow-ink]="a.alertas >= 3 && a.alertas < 6"
                >
                  {{ a.alertas }}
                </td>
                <td class="py-2.5 px-4 text-right tabular-nums">{{ money(a.monto) }}</td>
                <td class="py-2.5 px-4">
                  @if (a.mora_actual) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-tier-red-soft text-tier-red-ink">
                      Mora actual
                    </span>
                  } @else {
                    <span class="text-ink-3 text-[12px]">Al día</span>
                  }
                </td>
                <td class="py-2.5 px-4">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      class="rounded-sm w-8 h-8 grid place-items-center text-ink-3 hover:bg-hover hover:text-ink"
                      title="Editar asegurado"
                      aria-label="Editar asegurado"
                      (click)="edit.emit(a); $event.stopPropagation()"
                    >
                      <ui-icon name="edit" [size]="16" />
                    </button>
                    <button
                      type="button"
                      class="rounded-sm w-8 h-8 grid place-items-center text-ink-3 hover:bg-tier-red-soft hover:text-tier-red-ink"
                      title="Eliminar asegurado"
                      aria-label="Eliminar asegurado"
                      (click)="remove.emit(a); $event.stopPropagation()"
                    >
                      <ui-icon name="delete" [size]="16" />
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AseguradosTable {
  readonly asegurados = input.required<Asegurado[]>();
  readonly open = output<string>();
  readonly edit = output<Asegurado>();
  readonly remove = output<Asegurado>();

  protected readonly initials = initials;
  protected readonly money = formatMoney;
}
