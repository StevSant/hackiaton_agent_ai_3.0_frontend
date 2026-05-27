import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { formatDateTime } from '@shared/utils';
import type { ClaimReview } from '../models/claim-review.model';

/**
 * Terminal card shown when an analista has closed a case via "Marcar como
 * revisado (sin escalar)". The case never reached Unidad Antifraude; the
 * analista's note is the audit trail.
 */
@Component({
  selector: 'claim-revisado-card',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border border-tier-green-ink/20 bg-tier-green-soft/30 rounded-lg shadow-1 overflow-hidden">
      <div class="px-5 py-3.5 border-b border-line bg-surface flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <ui-icon name="check_circle" [size]="16" />
          <h3 class="text-[13px] font-semibold m-0">Caso revisado sin escalación</h3>
        </div>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-tier-green-soft text-tier-green-ink">
          <ui-icon name="badge" [size]="12" />
          Decisión del analista
        </span>
      </div>
      <div class="px-5 py-4 bg-surface">
        @if (review().closed_note) {
          <p class="text-[13px] leading-relaxed text-ink m-0 mb-3">{{ review().closed_note }}</p>
        } @else {
          <p class="text-[13px] text-ink-3 italic m-0 mb-3">Sin nota — la analista cerró el caso por considerarlo de bajo riesgo.</p>
        }
        <div class="flex items-center gap-3 text-[11.5px] text-ink-3">
          <span class="inline-flex items-center gap-1">
            <ui-icon name="person" [size]="12" />
            {{ review().closed_by_name }}
          </span>
          <span class="text-ink-4">·</span>
          <span class="inline-flex items-center gap-1 tabular-nums">
            <ui-icon name="schedule" [size]="12" />
            {{ when() }}
          </span>
        </div>
      </div>
    </div>
  `,
})
export class RevisadoCard {
  readonly review = input.required<ClaimReview>();
  protected readonly when = computed(() => formatDateTime(this.review().closed_at) ?? '');
}
