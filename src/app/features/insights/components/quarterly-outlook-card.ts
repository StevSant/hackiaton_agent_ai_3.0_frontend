import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { InsightsStore } from '../services/insights.store';

@Component({
  selector: 'insights-quarterly-outlook',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (outlook(); as o) {
      <section class="centinela-insight-card relative overflow-hidden">
        <span
          class="absolute top-0 left-0 right-0 h-[3px]"
          style="background: linear-gradient(90deg, var(--brand) 0%, var(--tier-yellow) 100%);"
        ></span>

        <header class="flex items-center justify-between gap-2 mb-2">
          <h3 class="text-[13px] font-semibold text-ink m-0">Perspectiva trimestral</h3>
          <span class="text-[11px] text-ink-3 font-medium">Q2 2026</span>
        </header>

        <p class="text-[12.5px] leading-snug text-ink-2 m-0 mb-3">{{ o.body }}</p>

        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-tier-green-soft text-tier-green-ink"
            [class.bg-tier-red-soft]="isPositiveDelta()"
            [class.text-tier-red-ink]="isPositiveDelta()"
          >
            <ui-icon [name]="isPositiveDelta() ? 'trending_up' : 'trending_down'" [size]="12" />
            {{ o.systematicFraudDelta }}
          </span>
          <span class="text-[11.5px] text-ink-3">Fraude sistémico</span>
        </div>
      </section>
    }
  `,
})
export class QuarterlyOutlookCard {
  private readonly store = inject(InsightsStore);
  protected readonly outlook = this.store.quarterlyOutlook;

  protected readonly isPositiveDelta = computed(() => {
    // "+" or no leading sign = fraud is increasing (bad). "-" = fraud is decreasing (good).
    const o = this.outlook();
    if (!o) return false;
    const d = o.systematicFraudDelta.trim();
    return d.startsWith('+') || (!d.startsWith('-') && d.length > 0);
  });
}
