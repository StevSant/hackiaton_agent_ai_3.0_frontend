import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type SkeletonVariant = 'rect' | 'circle' | 'text';

@Component({
  selector: 'ui-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="block animate-pulse bg-soft"
      [class.rounded-full]="variant() === 'circle'"
      [class.rounded-md]="variant() === 'rect'"
      [class.rounded]="variant() === 'text'"
      [style.width]="cssWidth()"
      [style.height]="cssHeight()"
      aria-hidden="true"
    ></span>
  `,
})
export class Skeleton {
  readonly variant = input<SkeletonVariant>('rect');
  readonly width = input<string | number>('100%');
  readonly height = input<string | number>(12);

  protected readonly cssWidth = computed(() => {
    const w = this.width();
    return typeof w === 'number' ? `${w}px` : w;
  });
  protected readonly cssHeight = computed(() => {
    const h = this.height();
    return typeof h === 'number' ? `${h}px` : h;
  });
}
