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
      <div
        class="centinela-pagination"
      >
        <div class="flex items-center gap-1.5">
          @if (variant() === 'numbered') {
            <span>Mostrando</span>
            <span class="tabular-nums text-ink font-medium">{{ rangeStart() }}</span>
            <span>a</span>
            <span class="tabular-nums text-ink font-medium">{{ rangeEnd() }}</span>
            <span>de</span>
            <span class="tabular-nums text-ink font-medium">{{ total() }}</span>
            <span>{{ noun() }}</span>
          } @else {
            <span>Mostrando</span>
            <span class="tabular-nums text-ink font-medium">{{ rangeStart() }}–{{ rangeEnd() }}</span>
            <span>de</span>
            <span class="tabular-nums text-ink font-medium">{{ total() }}</span>
          }
        </div>

        <div class="flex items-center gap-2 flex-wrap justify-end">
          @if (variant() === 'compact') {
            <label class="flex items-center gap-1.5">
              <span>Por página</span>
              <select
                class="bg-surface border border-line rounded-sm px-1.5 py-0.5 text-[12px] text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-2"
                [value]="pageSize()"
                (change)="onPageSize($any($event.target).value)"
              >
                @for (pageSizeOption of pageSizeOptions; track pageSizeOption) {
                  <option [value]="pageSizeOption">{{ pageSizeOption }}</option>
                }
              </select>
            </label>
          }

          <div class="flex items-center gap-1">
            <button
              type="button"
              class="rounded-sm w-7 h-7 grid place-items-center border border-line bg-surface text-ink-2 enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
              [disabled]="page() === 0"
              (click)="prev()"
              aria-label="Página anterior"
            >
              <ui-icon name="chevron_left" [size]="14" />
            </button>

            @if (variant() === 'numbered') {
              @for (pageNumber of visiblePages(); track pageNumber) {
                @if (pageNumber === 'ellipsis') {
                  <span class="px-1 text-ink-4">…</span>
                } @else {
                  <button
                    type="button"
                    class="min-w-[28px] h-7 px-1.5 rounded-sm border text-[12px] tabular-nums transition-colors"
                    [class]="pageNumber === page()
                      ? 'bg-brand text-white border-brand'
                      : 'bg-surface text-ink-2 border-line hover:bg-hover hover:text-ink'"
                    (click)="goTo(pageNumber)"
                  >
                    {{ pageNumber + 1 }}
                  </button>
                }
              }
            } @else {
              <span class="text-[12px] tabular-nums text-ink-2 px-2 min-w-[64px] text-center">
                {{ page() + 1 }} / {{ totalPages() }}
              </span>
            }

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
  readonly variant = input<'compact' | 'numbered'>('compact');
  readonly noun = input<string>('registros');

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

  protected readonly visiblePages = computed((): Array<number | 'ellipsis'> => {
    const totalPages = this.totalPages();
    const currentPage = this.page();

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index);
    }

    const pages: Array<number | 'ellipsis'> = [0];

    if (currentPage > 2) pages.push('ellipsis');

    const windowStart = Math.max(1, currentPage - 1);
    const windowEnd = Math.min(totalPages - 2, currentPage + 1);

    for (let pageIndex = windowStart; pageIndex <= windowEnd; pageIndex++) {
      pages.push(pageIndex);
    }

    if (currentPage < totalPages - 3) pages.push('ellipsis');

    pages.push(totalPages - 1);
    return pages;
  });

  protected prev(): void {
    if (this.page() > 0) this.pageChange.emit(this.page() - 1);
  }

  protected next(): void {
    if (this.page() < this.totalPages() - 1) this.pageChange.emit(this.page() + 1);
  }

  protected goTo(pageIndex: number): void {
    if (pageIndex >= 0 && pageIndex < this.totalPages()) {
      this.pageChange.emit(pageIndex);
    }
  }

  protected onPageSize(raw: string): void {
    const pageSize = Number(raw);
    if (!Number.isFinite(pageSize) || pageSize <= 0) return;
    this.pageSizeChange.emit(pageSize);
  }
}
