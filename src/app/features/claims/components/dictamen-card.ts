import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Icon } from '../../../shared/ui/icon';
import { formatDateTime } from '../../../shared/utils';
import type { ClaimReview, DictamenOutcome } from '../models/claim-review.model';

interface OutcomeMeta {
  label: string;
  icon: string;
  paletteCard: string;
  paletteBadge: string;
}

const OUTCOMES: Record<DictamenOutcome, OutcomeMeta> = {
  confirmado_sospecha: {
    label: 'Sospecha confirmada',
    icon: 'priority_high',
    paletteCard: 'border-tier-red-ink/20 bg-tier-red-soft/40',
    paletteBadge: 'bg-tier-red-soft text-tier-red-ink',
  },
  descartado: {
    label: 'Sospecha descartada',
    icon: 'check_circle',
    paletteCard: 'border-tier-green-ink/20 bg-tier-green-soft/30',
    paletteBadge: 'bg-tier-green-soft text-tier-green-ink',
  },
  requiere_mas_info: {
    label: 'Requiere más información',
    icon: 'info',
    paletteCard: 'border-tier-yellow-ink/20 bg-tier-yellow-soft/30',
    paletteBadge: 'bg-tier-yellow-soft text-tier-yellow-ink',
  },
};

@Component({
  selector: 'claim-dictamen-card',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (meta(); as m) {
      <div class="border rounded-lg shadow-1 overflow-hidden" [class]="m.paletteCard">
        <div class="px-5 py-3.5 border-b border-line bg-surface flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <ui-icon name="gavel" [size]="16" />
            <h3 class="text-[13px] font-semibold m-0">Dictamen de Unidad Antifraude</h3>
          </div>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium" [class]="m.paletteBadge">
            <ui-icon [name]="m.icon" [size]="12" />
            {{ m.label }}
          </span>
        </div>
        <div class="px-5 py-4 bg-surface">
          <p class="text-[13px] leading-relaxed text-ink m-0 mb-3">{{ review().dictamen_justificacion }}</p>
          <div class="flex items-center gap-3 text-[11.5px] text-ink-3">
            <span class="inline-flex items-center gap-1">
              <ui-icon name="person" [size]="12" />
              {{ review().dictaminado_by_name }}
            </span>
            <span class="text-ink-4">·</span>
            <span class="inline-flex items-center gap-1 tabular-nums">
              <ui-icon name="schedule" [size]="12" />
              {{ when() }}
            </span>
            @if (review().bounce_count > 0) {
              <span class="text-ink-4">·</span>
              <span class="inline-flex items-center gap-1">
                <ui-icon name="restart_alt" [size]="12" />
                Tras {{ review().bounce_count }} ronda{{ review().bounce_count > 1 ? 's' : '' }} de aclaración
              </span>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class DictamenCard {
  readonly review = input.required<ClaimReview>();

  protected readonly meta = computed(() => {
    const o = this.review().dictamen_outcome;
    return o ? OUTCOMES[o] : null;
  });

  protected readonly when = computed(() => formatDateTime(this.review().dictaminado_at) ?? '');
}
