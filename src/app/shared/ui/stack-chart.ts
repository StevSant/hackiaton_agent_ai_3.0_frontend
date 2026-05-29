import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { TrendPoint } from '@shared/models';

interface Stack {
  verde: number;
  amarillo: number;
  rojo: number;
}

@Component({
  selector: 'ui-stack-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-5 pt-1.5 pb-5 relative">
      <div class="flex gap-4 text-[11.5px] text-ink-3 pb-2">
        <span class="inline-flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-sm inline-block" style="background: var(--tier-green)"></i>Bajo riesgo</span>
        <span class="inline-flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-sm inline-block" style="background: var(--tier-yellow)"></i>Medio</span>
        <span class="inline-flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-sm inline-block" style="background: var(--tier-red)"></i>Alto</span>
      </div>
      <svg viewBox="0 0 720 200" preserveAspectRatio="none" class="block w-full h-[200px]">
        @for (g of grid(); track g.t) {
          <line [attr.x1]="pad.left" [attr.x2]="pad.left + innerW" [attr.y1]="g.y" [attr.y2]="g.y" stroke="var(--border)" stroke-width="0.5" [attr.stroke-dasharray]="g.t === 0 ? '0' : '2 4'" />
          <text [attr.x]="pad.left - 6" [attr.y]="g.y + 3" text-anchor="end" font-size="9.5" fill="var(--ink-4)">{{ g.v }}</text>
        }
        <path [attr.d]="areaRojo()" [attr.fill]="fills.rojo" />
        <path [attr.d]="areaAmarillo()" [attr.fill]="fills.amarillo" />
        <path [attr.d]="areaVerde()" [attr.fill]="fills.verde" />
        <path [attr.d]="lineRojo()" fill="none" stroke="var(--tier-red)" stroke-width="1.5" />
        <path [attr.d]="lineAmarillo()" fill="none" stroke="var(--tier-yellow)" stroke-width="1.5" />
        <path [attr.d]="lineVerde()" fill="none" stroke="var(--tier-green)" stroke-width="1.5" />
        @for (l of xLabels(); track l.i) {
          <text [attr.x]="l.x" y="194" text-anchor="middle" font-size="9.5" fill="var(--ink-4)">{{ l.w }}</text>
        }
      </svg>
    </div>
  `,
})
export class StackChart {
  readonly data = input.required<readonly TrendPoint[]>();

  protected readonly pad = { top: 12, right: 12, bottom: 24, left: 28 };
  protected readonly innerW = 720 - this.pad.left - this.pad.right;
  protected readonly innerH = 200 - this.pad.top - this.pad.bottom;

  protected readonly fills = {
    verde: 'color-mix(in oklch, var(--tier-green) 50%, transparent)',
    amarillo: 'color-mix(in oklch, var(--tier-yellow) 55%, transparent)',
    rojo: 'color-mix(in oklch, var(--tier-red) 55%, transparent)',
  };

  private readonly stacks = computed<Stack[]>(() =>
    this.data().map((d) => ({
      verde: d.verde,
      amarillo: d.verde + d.amarillo,
      rojo: d.verde + d.amarillo + d.rojo,
    })),
  );

  private readonly max = computed(() => {
    const totals = this.stacks().map((s) => s.rojo);
    return Math.ceil(Math.max(...totals) / 20) * 20 + 10;
  });

  private readonly stepX = computed(() => this.innerW / Math.max(1, this.data().length - 1));

  private yOf(v: number): number {
    return this.pad.top + this.innerH - (v / this.max()) * this.innerH;
  }

  protected readonly grid = computed(() =>
    [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      t,
      y: this.pad.top + this.innerH - t * this.innerH,
      v: Math.round(t * this.max()),
    })),
  );

  protected readonly xLabels = computed(() =>
    this.data()
      .map((d, i) => ({ i, w: d.w, x: this.pad.left + i * this.stepX() }))
      .filter((p) => p.i % 2 === 0),
  );

  private line(key: keyof Stack): string {
    return (
      'M ' +
      this.stacks()
        .map((s, i) => `${this.pad.left + i * this.stepX()},${this.yOf(s[key])}`)
        .join(' L ')
    );
  }

  private area(upper: keyof Stack, lower: keyof Stack | null): string {
    const stacks = this.stacks();
    const top = stacks.map((s, i) => `${this.pad.left + i * this.stepX()},${this.yOf(s[upper])}`).join(' L ');
    const bottom = lower
      ? stacks
          .map((s, i) => `${this.pad.left + i * this.stepX()},${this.yOf(s[lower])}`)
          .reverse()
          .join(' L ')
      : `${this.pad.left + this.innerW},${this.yOf(0)} L ${this.pad.left},${this.yOf(0)}`;
    return `M ${top} L ${bottom} Z`;
  }

  protected readonly lineVerde = computed(() => this.line('verde'));
  protected readonly lineAmarillo = computed(() => this.line('amarillo'));
  protected readonly lineRojo = computed(() => this.line('rojo'));
  protected readonly areaVerde = computed(() => this.area('verde', null));
  protected readonly areaAmarillo = computed(() => this.area('amarillo', 'verde'));
  protected readonly areaRojo = computed(() => this.area('rojo', 'amarillo'));
}
