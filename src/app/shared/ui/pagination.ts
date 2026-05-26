import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon } from './icon';

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

@Component({
  selector: 'ui-pagination',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() > 0) {
      <div class="flex items-center justify-between gap-3 px-5 py-3 border-t border-line text-[12px] text-ink-3">
        <div class="flex items-center gap-1.5">
          <span>Mostrando</span>
          <span class="tabular-nums text-ink font-medium">{{ rangeStart() }}–{{ rangeEnd() }}</span>
          <span>de</span>
          <span class="tabular-nums text-ink font-medium">{{ total() }}</span>
        </div>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-1.5">
            <span>Por página</span>
            <select
              class="bg-surface border border-line rounded-sm px-1.5 py-0.5 text-[12px] text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-2"
              [value]="pageSize()"
              (change)="onPageSize($any($event.target).value)"
            >
              @for (n of pageSizeOptions; track n) {
                <option [value]="n">{{ n }}</option>
              }
            </select>
          </label>
          <div class="flex items-center gap-1 ml-1">
            <button
              type="button"
              class="rounded-sm w-7 h-7 grid place-items-center border border-line bg-surface text-ink-2 enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
              [disabled]="page() === 0"
              (click)="prev()"
              aria-label="Página anterior"
            >
              <ui-icon name="chevron_left" [size]="14" />
            </button>
            <span class="text-[12px] tabular-nums text-ink-2 px-2 min-w-[64px] text-center">
              {{ page() + 1 }} / {{ totalPages() }}
            </span>
            <button
              type="button"
              class="rounded-sm w-7 h-7 grid place-items-center border border-line bg-surface text-ink-2 enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
              [disabled]="page() >= totalPages() - 1"
              (click)="next()"
              aria-label="Página siguiente"
            >
              <ui-icon name="chevron_right" [size]="14" />
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  protected readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : this.page() * this.pageSize() + 1,
  );

  protected readonly rangeEnd = computed(() =>
    Math.min(this.total(), (this.page() + 1) * this.pageSize()),
  );

  protected prev(): void {
    if (this.page() > 0) this.pageChange.emit(this.page() - 1);
  }

  protected next(): void {
    if (this.page() < this.totalPages() - 1) this.pageChange.emit(this.page() + 1);
  }

  protected onPageSize(raw: string): void {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    this.pageSizeChange.emit(n);
  }
}
