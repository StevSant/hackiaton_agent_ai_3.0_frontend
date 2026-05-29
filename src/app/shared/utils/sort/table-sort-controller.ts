import { signal } from '@angular/core';

import type { SortDirection } from './sort-direction';

/**
 * Signal-backed sort state shared between a smart page (which reads `key`/`dir`
 * to order its rows) and a presentational table header (which calls `toggle`).
 * A `key` of null means "use the page's default order" — clicking a column
 * cycles asc → desc → cleared, so the user can always return to that default.
 */
export class TableSortController {
  readonly key = signal<string | null>(null);
  readonly dir = signal<SortDirection>('asc');

  toggle(key: string): void {
    if (this.key() !== key) {
      this.key.set(key);
      this.dir.set('asc');
      return;
    }
    if (this.dir() === 'asc') {
      this.dir.set('desc');
      return;
    }
    this.reset();
  }

  reset(): void {
    this.key.set(null);
    this.dir.set('asc');
  }
}
