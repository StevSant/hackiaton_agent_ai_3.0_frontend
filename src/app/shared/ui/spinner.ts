import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      role="status"
      aria-label="Loading"
      class="inline-block animate-spin rounded-full border-2 border-current border-r-transparent"
      [style.width.px]="size()"
      [style.height.px]="size()">
    </span>
  `,
})
export class Spinner {
  readonly size = input<number>(20);
}
