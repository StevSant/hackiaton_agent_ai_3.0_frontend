import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Skeleton } from './skeleton';
import { SkeletonText } from './skeleton-text';

@Component({
  selector: 'ui-skeleton-card',
  standalone: true,
  imports: [Skeleton, SkeletonText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="px-5 py-3.5 border-b border-line">
        <ui-skeleton variant="text" width="40%" [height]="12" />
      </div>
      <div class="px-5 py-4.5">
        <ui-skeleton-text [lines]="bodyLines()" [lineHeight]="11" />
      </div>
    </div>
  `,
})
export class SkeletonCard {
  readonly bodyLines = input<number>(3);
}
