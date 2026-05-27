import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { InsightsStore } from '../services/insights.store';

interface DonutSlice {
  label: string;
  color: string;
  pct: number;
  dasharray: string;
  dashoffset: number;
}

@Component({
  selector: 'insights-claim-type-donut',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-surface border border-line rounded-lg shadow-1 p-4">
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
              stroke="var(--bg-soft)"
              stroke-width="3.5"
            />
            @for (slice of slices(); track slice.label) {
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="transparent"
                [attr.stroke]="slice.color"
                stroke-width="3.5"
                stroke-linecap="round"
                [attr.stroke-dasharray]="slice.dasharray"
                [attr.stroke-dashoffset]="slice.dashoffset"
              />
            }
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-[10px] font-medium text-ink-3 uppercase tracking-wider">Total</span>
            <span class="font-serif text-[22px] leading-none text-ink tabular-nums mt-0.5">
              {{ totalLabel() }}
            </span>
          </div>
        </div>

        <ul class="flex-1 space-y-2 min-w-0 m-0 p-0 list-none">
          @for (slice of slices(); track slice.label) {
            <li class="flex items-center justify-between gap-2">
              <span class="flex items-center gap-2 min-w-0">
                <span class="w-2 h-2 rounded-full shrink-0" [style.background]="slice.color"></span>
                <span class="text-[12px] text-ink-2 truncate">{{ slice.label }}</span>
              </span>
              <span class="font-mono text-[12px] font-semibold text-ink tabular-nums shrink-0">
                {{ slice.pct }}%
              </span>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class ClaimTypeDonut {
  private readonly store = inject(InsightsStore);

  protected readonly totalLabel = this.store.totalClaimsLabel;

  protected readonly slices = computed<DonutSlice[]>(() => {
    const raw = this.store.claimTypeSlices();
    let cumulative = 0;
    return raw.map((s) => {
      const offset = -cumulative;
      cumulative += s.pct;
      return {
        label: s.label,
        color: s.color,
        pct: s.pct,
        dasharray: `${s.pct} 100`,
        dashoffset: offset,
      };
    });
  });
}
