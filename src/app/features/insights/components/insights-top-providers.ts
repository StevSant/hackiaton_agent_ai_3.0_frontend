import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icon } from '@shared/ui/icon';

export interface TopProviderRow {
  id: string;
  nombre: string;
  alertas: number;
  casos: number;
}

@Component({
  selector: 'insights-top-providers',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 p-3 h-full flex flex-col">
      <div class="flex items-center gap-1.5 mb-2.5">
        <ui-icon name="storefront" [size]="15" class="text-ink-3" />
        <h3 class="text-[12.5px] font-semibold tracking-tight m-0">Proveedores con más alertas</h3>
      </div>
      @if (items().length === 0) {
        <p class="text-ink-3 text-[12px] m-0">Sin proveedores con alertas en la ventana actual.</p>
      } @else {
        <ul class="flex flex-col gap-1 m-0 p-0 list-none">
          @for (p of items(); track p.id) {
            <li>
              <button
                type="button"
                class="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm hover:bg-hover text-left"
                (click)="open.emit(p.id)"
              >
                <span class="min-w-0 truncate text-[12.5px] text-ink">{{ p.nombre }}</span>
                <span class="shrink-0 inline-flex items-center gap-1 text-[11.5px] tabular-nums">
                  <span
                    class="px-1.5 py-0.5 rounded-full font-medium"
                    [class.bg-tier-red-soft]="p.alertas >= 6"
                    [class.text-tier-red-ink]="p.alertas >= 6"
                    [class.bg-tier-yellow-soft]="p.alertas >= 3 && p.alertas < 6"
                    [class.text-tier-yellow-ink]="p.alertas >= 3 && p.alertas < 6"
                    [class.text-ink-3]="p.alertas < 3"
                  >
                    {{ p.alertas }} alertas
                  </span>
                  <span class="text-ink-3">· {{ p.casos }} casos</span>
                </span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class InsightsTopProviders {
  readonly items = input.required<readonly TopProviderRow[]>();
  readonly open = output<string>();
}
