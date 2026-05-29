// src/app/shared/ui/viz/viz-table.ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { SortableHeader } from '@shared/ui/sortable-header';
import {
  TableSortController,
  claimHref,
  handleEntityLinkClick,
  isClaimRef,
  sortRows,
  type SortAccessors,
} from '@shared/utils';

import { TIER_COLOR } from './viz-theme';
import type { TableVisual } from './visual.model';

/** Build SortAccessors dynamically from the union of keys across all rows. Values are compared as-is. */
function buildAccessors(
  rows: Record<string, string | number | null>[],
): SortAccessors<Record<string, string | number | null>> {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) keys.add(k);
  }
  return Object.fromEntries(
    [...keys].map((k) => [k, (row: Record<string, string | number | null>) => row[k]]),
  );
}

@Component({
  selector: 'viz-table',
  standalone: true,
  imports: [SortableHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-line bg-surface p-3 w-full overflow-x-auto">
      <div class="text-[12.5px] font-semibold text-ink mb-2">{{ payload().title }}</div>
      <table class="w-full text-[12px]">
        <thead>
          <tr>
            @for (col of payload().columns; track col.key) {
              <th [sortKey]="col.key" [sort]="sort"
                  class="text-ink-3 font-semibold px-2 py-1 text-left"
                  [class.text-right]="col.align === 'right'">{{ col.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of sortedRows(); track $index) {
            <tr class="border-t border-line/40">
              @for (col of payload().columns; track col.key) {
                <td class="px-2 py-1"
                    [class.text-right]="col.align === 'right'"
                    [class.font-mono]="col.col_kind === 'mono' || col.col_kind === 'citation'">
                  @switch (col.col_kind) {
                    @case ('tier') {
                      <span class="inline-block w-2.5 h-2.5 rounded-full"
                            [style.background]="tierColor(row[col.key])"></span>
                    }
                    @case ('citation') {
                      <a [href]="hrefFor(stringify(row[col.key]))"
                         class="text-brand-ink no-underline hover:underline"
                         (click)="onCitationClick($event, stringify(row[col.key]))">{{ row[col.key] }}</a>
                    }
                    @default { {{ row[col.key] }} }
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class VizTable {
  readonly payload = input.required<TableVisual>();
  readonly openCase = output<string>();

  protected readonly sort = new TableSortController();

  protected readonly sortedRows = computed(() => {
    const rows = this.payload().rows;
    const accessors = buildAccessors(rows);
    return sortRows(rows, this.sort.key(), this.sort.dir(), accessors);
  });

  protected tierColor(v: unknown): string {
    const tier = String(v) as 'verde' | 'amarillo' | 'rojo';
    return TIER_COLOR[tier] ?? '#94a3b8';
  }

  protected stringify(v: unknown): string {
    return String(v ?? '');
  }

  protected hrefFor(citation: string): string {
    return isClaimRef(citation) ? claimHref(citation) : '#';
  }

  protected onCitationClick(event: MouseEvent, citation: string): void {
    handleEntityLinkClick(event, () => this.openCase.emit(citation));
  }
}
