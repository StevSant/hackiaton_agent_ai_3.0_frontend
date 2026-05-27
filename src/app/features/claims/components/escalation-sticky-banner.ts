import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { formatDateTime } from '@shared/utils';
import type { ClaimReview } from '@shared/models';

/**
 * Shown to the analista when a claim has been bounced back from Unidad
 * Antifraude with `requiere_mas_info`. Surfaces the antifraude's note so the
 * analista knows exactly what to add before re-escalating.
 */
@Component({
  selector: 'claim-escalation-sticky-banner',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (review().bounce_count > 0 && review().bounce_note) {
      <div class="rounded-lg border border-tier-yellow-ink/30 bg-tier-yellow-soft/30 overflow-hidden">
        <div class="px-5 py-3 flex items-center gap-2 border-b border-tier-yellow-ink/20 bg-tier-yellow-soft/60">
          <ui-icon name="info" [size]="16" />
          <h3 class="text-[13px] font-semibold m-0 text-tier-yellow-ink">
            Unidad Antifraude solicita más información
          </h3>
          <span class="ml-auto text-[11px] text-tier-yellow-ink/80">
            {{ author() }}{{ when() ? ' · ' + when() : '' }}
          </span>
        </div>
        <div class="px-5 py-4">
          <p class="text-[13px] leading-relaxed m-0 text-ink">{{ review().bounce_note }}</p>
          <p class="text-[11.5px] text-ink-3 mt-3 mb-0">
            Cuando hayas adjuntado los documentos solicitados, vuelve a escalar el caso.
          </p>
        </div>
      </div>
    }
  `,
})
export class EscalationStickyBanner {
  readonly review = input.required<ClaimReview>();

  protected readonly author = computed(() => this.review().dictaminado_by_name ?? 'Antifraude');
  protected readonly when = computed(() => formatDateTime(this.review().dictaminado_at) ?? '');
}
