import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icon } from '@shared/ui/icon';

export interface FrequentInsuredRow {
  id: string;
  nombre: string;
  reclamos: number;
  alertas: number;
}

@Component({
  selector: 'insights-frequent-insured',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 p-3 h-full flex flex-col">
      <div class="flex items-center gap-1.5 mb-2.5">
        <ui-icon name="group" [size]="15" class="text-ink-3" />
        <h3 class="text-[12.5px] font-semibold tracking-tight m-0">Asegurados más frecuentes</h3>
      </div>
      @if (items().length === 0) {
        <p class="text-ink-3 text-[12px] m-0">Sin asegurados para mostrar.</p>
      } @else {
        <ul class="flex flex-col gap-1 m-0 p-0 list-none">
          @for (a of items(); track a.id) {
            <li>
              <button
                type="button"
                class="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm hover:bg-hover text-left"
                (click)="open.emit(a.id)"
              >
                <span class="min-w-0 truncate text-[12.5px] text-ink">{{ a.nombre }}</span>
                <span class="shrink-0 inline-flex items-center gap-2 text-[11.5px] tabular-nums text-ink-3">
                  <span>{{ a.reclamos }} reclamos</span>
                  @if (a.alertas > 0) {
                    <span class="px-1.5 py-0.5 rounded-full bg-tier-yellow-soft text-tier-yellow-ink font-medium">
                      {{ a.alertas }} alertas
                    </span>
                  }
                </span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class InsightsFrequentInsured {
  readonly items = input.required<readonly FrequentInsuredRow[]>();
  readonly open = output<string>();
}
