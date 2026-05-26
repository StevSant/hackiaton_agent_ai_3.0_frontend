import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Icon } from './icon';
import { Sparkline } from './sparkline';

export interface KpiDelta {
  up: boolean;
  text: string;
  isBad?: boolean;
}

@Component({
  selector: 'ui-kpi-card',
  standalone: true,
  imports: [Icon, Sparkline],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg p-4 pb-3.5 shadow-1 relative overflow-hidden flex flex-col min-h-[132px]">
      <div class="text-[11.5px] text-ink-3 font-medium tracking-wider">{{ label() }}</div>
      <div class="font-serif text-[38px] leading-none mt-2.5 flex items-baseline gap-1.5">
        <span class="tabular-nums">{{ value() }}</span>
        @if (suffix()) {
          <span class="font-sans text-sm text-ink-3 font-medium">{{ suffix() }}</span>
        }
      </div>
      <div class="mt-auto pt-3 flex items-center gap-1.5 text-xs text-ink-3 min-h-[18px]">
        @if (delta(); as d) {
          <ui-icon [name]="d.up ? 'arrow_upward' : 'arrow_downward'" [size]="12" />
          <b class="font-semibold" [class.text-tier-green-ink]="d.up && !d.isBad" [class.text-tier-red-ink]="d.up && d.isBad">{{ d.text }}</b>
        }
        @if (spark().length) {
          <span class="ml-auto"><ui-sparkline [data]="spark()" [color]="color()" /></span>
        }
      </div>
    </div>
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly suffix = input<string>('');
  readonly delta = input<KpiDelta | null>(null);
  readonly spark = input<readonly number[]>([]);
  readonly color = input<string>('var(--brand)');
}
