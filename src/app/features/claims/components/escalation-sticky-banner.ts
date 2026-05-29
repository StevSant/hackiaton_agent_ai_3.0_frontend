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
      <div class="claim-bounce-alert" role="alert" aria-live="polite">
        <div class="claim-bounce-alert__accent" aria-hidden="true"></div>

        <div class="claim-bounce-alert__inner">
          <div class="claim-bounce-alert__header">
            <div class="claim-bounce-alert__lead">
              <span class="claim-bounce-alert__icon" aria-hidden="true">
                <ui-icon name="priority_high" [size]="20" />
              </span>
              <div class="claim-bounce-alert__titles">
                <span class="claim-bounce-alert__badge">Acción requerida</span>
                <h3 class="claim-bounce-alert__title">
                  Unidad Antifraude solicita más información
                </h3>
              </div>
            </div>

            <div class="claim-bounce-alert__meta">
              <ui-icon name="person" [size]="13" />
              <span>{{ author() }}</span>
              @if (when()) {
                <span class="claim-bounce-alert__meta-sep" aria-hidden="true">·</span>
                <ui-icon name="schedule" [size]="13" />
                <span>{{ when() }}</span>
              }
            </div>
          </div>

          <blockquote class="claim-bounce-alert__message">
            <span class="claim-bounce-alert__quote-mark" aria-hidden="true">“</span>
            {{ review().bounce_note }}
          </blockquote>

          <p class="claim-bounce-alert__hint">
            <ui-icon name="upload_file" [size]="15" />
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
