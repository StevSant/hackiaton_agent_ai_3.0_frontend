import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { riskTier } from '../utils';

@Component({
  selector: 'ui-risk-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="risk-ring relative inline-grid place-items-center" [style.width.px]="size()" [style.height.px]="size()">
      <svg [attr.width]="size()" [attr.height]="size()">
        <circle
          class="ring-track"
          [attr.cx]="size() / 2"
          [attr.cy]="size() / 2"
          [attr.r]="radius()"
          fill="none"
          [attr.stroke-width]="stroke()"
        />
        <circle
          class="ring-fill"
          [attr.cx]="size() / 2"
          [attr.cy]="size() / 2"
          [attr.r]="radius()"
          fill="none"
          [attr.stroke]="color()"
          [attr.stroke-width]="stroke()"
          [attr.stroke-dasharray]="circumference()"
          [attr.stroke-dashoffset]="offset()"
          stroke-linecap="round"
        />
      </svg>
      <div class="absolute inset-0 grid place-items-center font-serif leading-none" [style.fontSize.px]="fontSize()" [style.color]="color()">
        {{ score() }}
      </div>
    </div>
  `,
})
export class RiskRing {
  readonly score = input.required<number>();
  readonly size = input<number>(96);
  readonly stroke = input<number>(8);

  protected readonly radius = computed(() => (this.size() - this.stroke()) / 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly offset = computed(() => this.circumference() * (1 - this.score() / 100));
  protected readonly fontSize = computed(() => Math.round(this.size() * 0.42));
  protected readonly color = computed(() => {
    const tier = riskTier(this.score());
    return tier === 'rojo'
      ? 'var(--tier-red)'
      : tier === 'amarillo'
        ? 'var(--tier-yellow)'
        : 'var(--tier-green)';
  });
}
