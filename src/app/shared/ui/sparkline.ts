import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ui-sparkline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="block opacity-90" [attr.viewBox]="viewBox()" preserveAspectRatio="none" [style.width.px]="width()" [style.height.px]="height()">
      <polyline [attr.points]="points()" fill="none" [attr.stroke]="color()" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
      <circle [attr.cx]="lastX()" [attr.cy]="lastY()" r="2" [attr.fill]="color()" />
    </svg>
  `,
})
export class Sparkline {
  readonly data = input.required<readonly number[]>();
  readonly width = input<number>(80);
  readonly height = input<number>(28);
  readonly color = input<string>('var(--brand)');

  protected readonly viewBox = computed(() => `0 0 ${this.width()} ${this.height()}`);

  private readonly metrics = computed(() => {
    const d = this.data();
    const max = Math.max(...d);
    const min = Math.min(...d);
    const range = max - min || 1;
    const step = this.width() / Math.max(1, d.length - 1);
    return { min, range, step };
  });

  protected readonly points = computed(() => {
    const d = this.data();
    const { min, range, step } = this.metrics();
    const h = this.height();
    return d.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  });

  protected readonly lastX = computed(() => (this.data().length - 1) * this.metrics().step);
  protected readonly lastY = computed(() => {
    const d = this.data();
    const { min, range } = this.metrics();
    const h = this.height();
    const last = d[d.length - 1];
    return h - ((last - min) / range) * (h - 4) - 2;
  });
}
