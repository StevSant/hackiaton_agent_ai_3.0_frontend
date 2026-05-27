import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Skeleton } from './skeleton';

@Component({
  selector: 'ui-skeleton-table',
  standalone: true,
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden">
      <div class="px-4 py-3 border-b border-line flex gap-4">
        @for (col of colArray(); track $index) {
          <div class="flex-1">
            <ui-skeleton variant="text" width="60%" [height]="10" />
          </div>
        }
      </div>
      <div class="divide-y divide-line">
        @for (row of rowArray(); track $index) {
          <div class="px-4 py-3.5 flex gap-4 items-center">
            @for (col of colArray(); track $index) {
              <div class="flex-1">
                <ui-skeleton variant="text" [width]="cellWidth($index)" [height]="12" />
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class SkeletonTable {
  readonly rows = input<number>(6);
  readonly cols = input<number>(5);

  protected readonly rowArray = computed(() =>
    Array.from({ length: Math.max(1, this.rows()) }, (_, i) => i),
  );
  protected readonly colArray = computed(() =>
    Array.from({ length: Math.max(1, this.cols()) }, (_, i) => i),
  );

  protected cellWidth(colIdx: number): string {
    const widths = ['85%', '70%', '60%', '75%', '55%', '80%'];
    return widths[colIdx % widths.length];
  }
}
