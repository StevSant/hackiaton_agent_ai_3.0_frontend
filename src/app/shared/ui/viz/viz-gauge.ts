// src/app/shared/ui/viz/viz-gauge.ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TIER_COLOR } from './viz-theme';
import type { GaugeVisual } from './visual.model';

// Arc total length ≈ π·r = π·50 ≈ 157; we use 157 as the visual semicircle length.
const TRACK = 157;

@Component({
  selector: 'viz-gauge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-line bg-surface p-3 w-full max-w-[280px]">
      <div class="text-[12.5px] font-semibold text-ink mb-2">{{ payload().title }}</div>
      <div class="flex items-center gap-4">
        <svg viewBox="0 0 120 74" class="w-[140px] h-[86px]">
          <path d="M10 70 A50 50 0 0 1 110 70" fill="none" [attr.stroke]="tierColor('verde')"
            stroke-width="11" [attr.stroke-dasharray]="arc(0, 40)" />
          <path d="M10 70 A50 50 0 0 1 110 70" fill="none" [attr.stroke]="tierColor('amarillo')"
            stroke-width="11" [attr.stroke-dasharray]="arc(40, 75)" [attr.stroke-dashoffset]="offset(40)" />
          <path d="M10 70 A50 50 0 0 1 110 70" fill="none" [attr.stroke]="tierColor('rojo')"
            stroke-width="11" [attr.stroke-dasharray]="arc(75, 100)" [attr.stroke-dashoffset]="offset(75)" />
          <line x1="60" y1="70" [attr.x2]="needle().x" [attr.y2]="needle().y"
            stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round" />
          <circle cx="60" cy="70" r="4" fill="#f8fafc" />
        </svg>
        <div>
          <div class="text-[26px] font-bold" [style.color]="tierColor(payload().tier)">
            {{ payload().value }}
          </div>
          @if (payload().label) {
            <div class="text-[10px] text-ink-3">{{ payload().label }}</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class VizGauge {
  readonly payload = input.required<GaugeVisual>();

  protected tierColor(t: 'verde' | 'amarillo' | 'rojo'): string {
    return TIER_COLOR[t];
  }

  protected arc(from: number, to: number): string {
    const len = ((to - from) / 100) * TRACK;
    return `${len} ${TRACK}`;
  }

  protected offset(from: number): number {
    return -((from / 100) * TRACK);
  }

  protected readonly needle = computed(() => {
    const v = Math.max(0, Math.min(100, this.payload().value));
    const angle = Math.PI - (v / 100) * Math.PI; // 180°→0°
    return { x: 60 + 36 * Math.cos(angle), y: 70 - 36 * Math.sin(angle) };
  });
}
