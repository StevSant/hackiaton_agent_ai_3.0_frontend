import { ChangeDetectionStrategy, Component } from '@angular/core';

import { STITCH_CLAIM_SLICES } from '../constants/stitch-insights.constants';

@Component({
  selector: 'insights-claim-type-donut',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg p-3">
      <h3 class="text-[12px] font-bold text-ink mb-2 m-0">Riesgo por tipo de siniestro</h3>

      <div class="flex items-center gap-3">
        <div class="relative w-16 h-16 shrink-0">
          <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="transparent"
              stroke="var(--border)"
              stroke-width="4"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="transparent"
              stroke="#3b82f6"
              stroke-width="4"
              stroke-dasharray="60 100"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="transparent"
              stroke="#00aeef"
              stroke-width="4"
              stroke-dasharray="25 100"
              stroke-dashoffset="-60"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="transparent"
              stroke="#8b5cf6"
              stroke-width="4"
              stroke-dasharray="15 100"
              stroke-dashoffset="-85"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-[8px] font-mono text-ink-3">Total</span>
            <span class="text-[11px] font-bold text-ink tabular-nums">12.4k</span>
          </div>
        </div>

        <div class="flex-1 space-y-1 min-w-0">
          @for (slice of slices; track slice.label) {
            <div class="flex items-center justify-between gap-1">
              <div class="flex items-center gap-1 min-w-0">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" [style.background]="slice.color"></span>
                <span class="text-[9px] font-mono text-ink-3 truncate">{{ slice.label }}</span>
              </div>
              <span class="text-[9px] font-mono font-bold text-ink tabular-nums shrink-0">{{ slice.pct }}%</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ClaimTypeDonut {
  protected readonly slices = STITCH_CLAIM_SLICES;
}
