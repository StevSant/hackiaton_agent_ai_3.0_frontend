import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Icon } from './icon';

type KpiTone = 'default' | 'red' | 'yellow' | 'brand';

@Component({
  selector: 'ui-kpi-small',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg p-4 pb-4.5 shadow-1 flex flex-col min-h-[132px]">
      <div class="text-[11.5px] text-ink-3 font-medium tracking-wider flex items-center gap-1.5">
        <span class="w-6 h-6 rounded-md grid place-items-center" [style.background]="bg()" [style.color]="fg()">
          <ui-icon [name]="icon()" [size]="13" />
        </span>
        {{ label() }}
      </div>
      <div class="font-serif text-[38px] leading-none mt-2.5">
        <span class="tabular-nums">{{ value() }}</span>
      </div>
    </div>
  `,
})
export class KpiSmall {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input.required<string>();
  readonly tone = input<KpiTone>('default');

  protected readonly fg = computed(() => {
    const t = this.tone();
    return t === 'red'
      ? 'var(--tier-red)'
      : t === 'yellow'
        ? 'var(--tier-yellow)'
        : t === 'brand'
          ? 'var(--brand)'
          : 'var(--ink-3)';
  });

  protected readonly bg = computed(() => {
    const t = this.tone();
    return t === 'red'
      ? 'var(--tier-red-soft)'
      : t === 'yellow'
        ? 'var(--tier-yellow-soft)'
        : t === 'brand'
          ? 'var(--brand-soft)'
          : 'var(--bg-soft)';
  });
}
