import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Skeleton } from './skeleton';

@Component({
  selector: 'ui-skeleton-text',
  standalone: true,
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2">
      @for (line of lineArray(); track $index) {
        <ui-skeleton variant="text" [width]="line" [height]="lineHeight()" />
      }
    </div>
  `,
})
export class SkeletonText {
  readonly lines = input<number>(3);
  readonly lineHeight = input<number>(10);

  // Last line is shorter for a natural paragraph feel.
  protected readonly lineArray = computed<string[]>(() => {
    const count = Math.max(1, this.lines());
    return Array.from({ length: count }, (_, i) =>
      i === count - 1 && count > 1 ? '70%' : '100%',
    );
  });
}
