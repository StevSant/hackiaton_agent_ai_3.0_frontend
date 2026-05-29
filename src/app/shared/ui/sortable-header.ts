import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TableSortController } from '@shared/utils';
import { Icon } from '@shared/ui/icon';

/**
 * Attribute component for a sortable `<th sortKey="…" [sort]="ctrl">`. It keeps
 * whatever classes the host table already puts on its headers and only layers
 * on the click target, the direction arrow, and the a11y plumbing.
 */
@Component({
  selector: 'th[sortKey]',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'cursor-pointer select-none hover:text-ink',
    role: 'columnheader',
    '[attr.tabindex]': '0',
    '[attr.aria-sort]': 'ariaSort()',
    '(click)': 'toggle()',
    '(keydown.enter)': 'toggle()',
    '(keydown.space)': 'onSpace($event)',
  },
  template: `
    <span class="inline-flex items-center gap-1">
      <ng-content />
      <ui-icon
        [name]="arrowIcon()"
        [size]="14"
        class="shrink-0 transition-opacity"
        [class.opacity-40]="!active()"
        [class.text-brand]="active()"
      />
    </span>
  `,
})
export class SortableHeader {
  readonly sortKey = input.required<string>();
  readonly sort = input.required<TableSortController>();

  protected readonly active = computed(() => this.sort().key() === this.sortKey());

  protected readonly arrowIcon = computed(() => {
    if (!this.active()) return 'unfold_more';
    return this.sort().dir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  });

  protected readonly ariaSort = computed<'ascending' | 'descending' | 'none'>(() => {
    if (!this.active()) return 'none';
    return this.sort().dir() === 'asc' ? 'ascending' : 'descending';
  });

  protected toggle(): void {
    this.sort().toggle(this.sortKey());
  }

  protected onSpace(event: Event): void {
    event.preventDefault();
    this.toggle();
  }
}
