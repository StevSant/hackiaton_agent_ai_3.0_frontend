import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ui-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="ui-icon material-symbols-outlined" [style.fontSize.px]="size()" [style.width.px]="size()" [style.height.px]="size()" [attr.aria-hidden]="ariaHidden() ? 'true' : null" [style.fontVariationSettings]="settings()">{{ name() }}</span>`,
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input<number>(18);
  readonly weight = input<number>(400);
  readonly fill = input<boolean>(false);
  readonly ariaHidden = input<boolean>(true);

  protected readonly settings = computed(
    () => `'FILL' ${this.fill() ? 1 : 0}, 'wght' ${this.weight()}, 'GRAD' 0, 'opsz' ${this.size()}`,
  );
}
