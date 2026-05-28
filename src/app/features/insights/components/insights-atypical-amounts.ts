import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { formatMoney } from '@shared/utils';
import { Icon } from '@shared/ui/icon';

export interface AtypicalClaimRow {
  id: string;
  ramo: string;
  monto: number;
  score: number;
  nivel: 'verde' | 'amarillo' | 'rojo';
}

@Component({
  selector: 'insights-atypical-amounts',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 p-3 h-full flex flex-col">
      <div class="flex items-center gap-1.5 mb-2.5">
        <ui-icon name="payments" [size]="15" class="text-ink-3" />
        <h3 class="text-[12.5px] font-semibold tracking-tight m-0">Montos atípicos (P95)</h3>
      </div>
      @if (items().length === 0) {
        <p class="text-ink-3 text-[12px] m-0">Sin montos atípicos detectados.</p>
      } @else {
        <ul class="flex flex-col gap-1 m-0 p-0 list-none">
          @for (c of items(); track c.id) {
            <li>
              <button
                type="button"
                class="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm hover:bg-hover text-left"
                (click)="open.emit(c.id)"
              >
                <span class="min-w-0 flex flex-col">
                  <span class="truncate text-[12.5px] text-ink font-mono">{{ c.id }}</span>
                  <span class="text-[11px] text-ink-3 truncate">{{ c.ramo }}</span>
                </span>
                <span class="shrink-0 inline-flex items-center gap-2 text-[11.5px] tabular-nums">
                  <span class="font-medium text-ink">{{ money(c.monto) }}</span>
                  <span
                    class="px-1.5 py-0.5 rounded-full font-medium"
                    [class.bg-tier-red-soft]="c.nivel === 'rojo'"
                    [class.text-tier-red-ink]="c.nivel === 'rojo'"
                    [class.bg-tier-yellow-soft]="c.nivel === 'amarillo'"
                    [class.text-tier-yellow-ink]="c.nivel === 'amarillo'"
                    [class.bg-tier-green-soft]="c.nivel === 'verde'"
                    [class.text-tier-green-ink]="c.nivel === 'verde'"
                  >
                    {{ c.score }}
                  </span>
                </span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class InsightsAtypicalAmounts {
  readonly items = input.required<readonly AtypicalClaimRow[]>();
  readonly open = output<string>();

  protected readonly money = formatMoney;
}
