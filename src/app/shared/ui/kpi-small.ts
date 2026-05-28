import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Icon } from './icon';

type KpiTone = 'default' | 'red' | 'yellow' | 'brand';

@Component({
  selector: 'ui-kpi-small',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="centinela-kpi-card"
    >
      <div class="centinela-kpi-card__label flex items-center gap-2 shrink-0">
        <span
          class="centinela-kpi-card__icon w-8 h-8 rounded-[10px] grid place-items-center shrink-0"
          [style.background]="bg()"
          [style.color]="fg()"
        >
          <ui-icon [name]="icon()" [size]="16" />
        </span>
        {{ label() }}
      </div>
      <div class="flex-1 flex items-end pt-3">
        <span class="centinela-kpi-card__value">{{ value() }}</span>
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
