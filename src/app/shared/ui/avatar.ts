import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { hashHue, initials } from '../utils';

@Component({
  selector: 'ui-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-full grid place-items-center font-semibold text-white shrink-0"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.fontSize.px]="fontSize()"
      [style.background]="bg()"
    >
      {{ letters() }}
    </div>
  `,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input<number>(28);

  protected readonly letters = computed(() => initials(this.name()));
  protected readonly fontSize = computed(() => Math.max(10, this.size() * 0.38));
  protected readonly bg = computed(() => {
    const hue = hashHue(this.name());
    return `linear-gradient(135deg, oklch(0.6 0.15 ${hue}), oklch(0.5 0.18 ${(hue + 40) % 360}))`;
  });
}
