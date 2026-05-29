import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { formatMoney, initials, TableSortController } from '@shared/utils';
import type { Asegurado } from '@shared/models';
import { Icon } from '@shared/ui/icon';
import { SortableHeader } from '@shared/ui/sortable-header';

@Component({
  selector: 'asegurados-table',
  standalone: true,
  imports: [Icon, SortableHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden">
      <div class="centinela-table-wrap">
        <table class="centinela-table">
          <thead>
            <tr>
              <th sortKey="nombre" [sort]="sort()">Asegurado</th>
              <th sortKey="segmento" [sort]="sort()" class="hidden md:table-cell">Segmento</th>
              <th sortKey="ciudad" [sort]="sort()" class="hidden md:table-cell">Ciudad</th>
              <th sortKey="casos" [sort]="sort()" class="hidden md:table-cell text-right">Casos</th>
              <th sortKey="alertas" [sort]="sort()" class="text-right">Alertas</th>
              <th sortKey="monto" [sort]="sort()" class="hidden lg:table-cell text-right">Monto</th>
              <th sortKey="mora" [sort]="sort()">Estado</th>
              <th class="text-right w-20">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (a of asegurados(); track a.id) {
              <tr
                [attr.data-keyboard-row]="a.id"
                [class.centinela-table-row--focused]="focusedId() === a.id"
                (click)="open.emit(a.id)"
              >
                <td>
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div
                      class="w-8 h-8 rounded-full grid place-items-center font-semibold text-[11.5px] text-white shrink-0"
                      [style.background]="a.color"
                    >
                      {{ initials(a.nombre) }}
                    </div>
                    <div class="min-w-0">
                      <div class="font-medium text-ink truncate">{{ a.nombre }}</div>
                      <div class="text-[11px] text-ink-3 font-mono truncate">{{ a.id }}</div>
                      <div class="md:hidden text-[11px] text-ink-3 mt-0.5 truncate">
                        {{ a.segmento ?? '—' }} · {{ a.ciudad }}
                      </div>
                      <div class="md:hidden flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-ink-3">
                        <span class="tabular-nums">{{ a.casos }} casos</span>
                        <span class="tabular-nums lg:hidden">{{ money(a.monto) }}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="hidden md:table-cell text-ink-2">{{ a.segmento ?? '—' }}</td>
                <td class="hidden md:table-cell text-ink-2">{{ a.ciudad }}</td>
                <td class="hidden md:table-cell text-right tabular-nums font-medium">{{ a.casos }}</td>
                <td
                  class="text-right tabular-nums font-medium"
                  [class.text-tier-red-ink]="a.alertas >= 6"
                  [class.text-tier-yellow-ink]="a.alertas >= 3 && a.alertas < 6"
                >
                  {{ a.alertas }}
                </td>
                <td class="hidden lg:table-cell text-right tabular-nums">{{ money(a.monto) }}</td>
                <td>
                  @if (a.mora_actual) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-tier-red-soft text-tier-red-ink whitespace-nowrap">
                      Mora actual
                    </span>
                  } @else {
                    <span class="text-ink-3 text-[12px] whitespace-nowrap">Al día</span>
                  }
                </td>
                <td>
                  <div class="flex items-center justify-end gap-0.5 sm:gap-1">
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
  readonly sort = input.required<TableSortController>();
  readonly focusedId = input<string | null>(null);
  readonly open = output<string>();
  readonly edit = output<Asegurado>();
  readonly remove = output<Asegurado>();

  protected readonly initials = initials;
  protected readonly money = formatMoney;
}
