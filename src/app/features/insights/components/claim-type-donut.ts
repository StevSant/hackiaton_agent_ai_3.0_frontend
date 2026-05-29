import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';

import { InsightsStore } from '../services/insights.store';

interface DonutSlice {
  key: string;
  label: string;
  color: string;
  pct: number;
  count: number;
  dasharray: string;
  dashoffset: number;
}

@Component({
  selector: 'insights-claim-type-donut',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="centinela-insight-card">
      <header class="flex items-center justify-between gap-2 mb-3">
        <h3 class="text-[13px] font-semibold text-ink m-0">Riesgo por tipo</h3>
        <span class="text-[11px] text-ink-3">Distribución</span>
      </header>

      <div class="flex items-center gap-4">
        <div class="relative w-[88px] h-[88px] shrink-0">
          <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="transparent"
              stroke="var(--border)"
              stroke-width="3"
            />
            @for (slice of slices(); track slice.key) {
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="transparent"
                class="cursor-pointer transition-opacity"
                [attr.stroke]="slice.color"
                [attr.stroke-width]="hoveredKey() === slice.key ? 4 : 3"
                [attr.opacity]="hoveredKey() !== null && hoveredKey() !== slice.key ? 0.3 : 1"
                stroke-linecap="round"
                [attr.stroke-dasharray]="slice.dasharray"
                [attr.stroke-dashoffset]="slice.dashoffset"
                (mouseenter)="hoveredKey.set(slice.key)"
                (mouseleave)="hoveredKey.set(null)"
                (click)="open.emit(slice.key)"
              />
            }
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
            @if (hovered(); as h) {
              <span
                class="text-[9px] font-medium text-ink-3 uppercase tracking-wider truncate max-w-[60px]"
              >
                {{ h.label }}
              </span>
              <span class="font-mono text-[17px] leading-none text-ink tabular-nums mt-0.5">
                {{ h.count }}
              </span>
              <span class="text-[9px] text-ink-3 mt-0.5">casos · {{ h.pct }}%</span>
            } @else {
              <span class="text-[10px] font-medium text-ink-3 uppercase tracking-wider">
                Total
              </span>
              <span class="font-mono text-[18px] leading-none text-ink tabular-nums mt-0.5">
                {{ totalLabel() }}
              </span>
            }
          </div>
        </div>

        <ul class="flex-1 space-y-1 min-w-0 m-0 p-0 list-none">
          @for (slice of slices(); track slice.key) {
            <li>
              <button
                type="button"
                class="w-full flex items-center justify-between gap-2 px-1.5 py-0.5 -mx-1.5 rounded-sm transition-colors text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                [class.bg-hover]="hoveredKey() === slice.key"
                [attr.aria-label]="
                  'Ver detalle de ' + slice.label + ': ' + slice.count + ' casos (' + slice.pct + '%)'
                "
                (mouseenter)="hoveredKey.set(slice.key)"
                (mouseleave)="hoveredKey.set(null)"
                (focus)="hoveredKey.set(slice.key)"
                (blur)="hoveredKey.set(null)"
                (click)="open.emit(slice.key)"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <span
                    class="w-2 h-2 rounded-full shrink-0"
                    [style.background]="slice.color"
                  ></span>
                  <span class="text-[12px] text-ink-2 truncate">{{ slice.label }}</span>
                </span>
                <span class="font-mono text-[12px] font-semibold text-ink tabular-nums shrink-0">
                  {{ slice.pct }}%
                </span>
              </button>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class ClaimTypeDonut {
  private readonly store = inject(InsightsStore);

  /** Canonical ramo key of the clicked slice — host page navigates. */
  readonly open = output<string>();

  protected readonly totalLabel = this.store.totalClaimsLabel;

  protected readonly hoveredKey = signal<string | null>(null);

  protected readonly hovered = computed<DonutSlice | null>(() => {
    const key = this.hoveredKey();
    return key === null ? null : (this.slices().find((s) => s.key === key) ?? null);
  });

  protected readonly slices = computed<DonutSlice[]>(() => {
    const raw = this.store.claimTypeSlices();
    let cumulative = 0;
    return raw.map((s) => {
      const offset = -cumulative;
      cumulative += s.pct;
      return {
        key: s.key,
        label: s.label,
        color: s.color,
        pct: s.pct,
        count: s.count,
        dasharray: `${s.pct} 100`,
        dashoffset: offset,
      };
    });
  });
}
