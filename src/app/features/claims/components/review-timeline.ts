import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { formatDateTime } from '@shared/utils';
import type { ClaimReview } from '../models/claim-review.model';

interface TimelineNode {
  key: 'pendiente' | 'escalado' | 'en_revision' | 'dictaminado';
  label: string;
  icon: string;
  actor: string | null;
  time: string | null;
  done: boolean;
  current: boolean;
}

@Component({
  selector: 'claim-review-timeline',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="px-5 py-3.5 border-b border-line">
        <h3 class="text-[13px] font-semibold m-0">Línea de revisión</h3>
        <p class="text-[11.5px] text-ink-3 m-0 mt-0.5">Trazabilidad humana del caso. Cada etapa registra quién actuó y cuándo.</p>
      </div>
      <ol class="px-5 py-4 space-y-3">
        @for (n of nodes(); track n.key) {
          <li class="grid grid-cols-[28px_1fr_auto] gap-3 items-start">
            <span
              class="w-6 h-6 rounded-full grid place-items-center text-[11px] border"
              [class]="dotClass(n)"
            >
              <ui-icon [name]="n.icon" [size]="12" />
            </span>
            <div class="leading-snug">
              <div class="text-[12.5px] font-medium" [class]="labelClass(n)">{{ n.label }}</div>
              @if (n.actor) {
                <div class="text-[11.5px] text-ink-3">{{ n.actor }}</div>
              } @else if (!n.done && n.current) {
                <div class="text-[11.5px] text-ink-3">En curso</div>
              } @else if (!n.done) {
                <div class="text-[11.5px] text-ink-4">Pendiente</div>
              }
            </div>
            @if (n.time) {
              <span class="text-[11px] text-ink-4 tabular-nums whitespace-nowrap">{{ n.time }}</span>
            }
          </li>
        }
      </ol>
      @if (review().bounce_count > 0) {
        <div class="mx-5 mb-4 px-3 py-2 rounded-sm bg-tier-yellow-soft text-tier-yellow-ink text-[11.5px] flex items-center gap-1.5">
          <ui-icon name="restart_alt" [size]="13" />
          Re-trabajado {{ review().bounce_count }} vez{{ review().bounce_count > 1 ? 'es' : '' }} por solicitud de Antifraude.
        </div>
      }
    </div>
  `,
})
export class ReviewTimeline {
  readonly review = input.required<ClaimReview>();

  protected readonly nodes = computed<TimelineNode[]>(() => {
    const r = this.review();
    const status = r.status;
    const isPending = status === 'pendiente';
    const isEscalated = status === 'escalado';
    const isInReview = status === 'en_revision';
    const isDictaminated = status === 'dictaminado';

    return [
      {
        key: 'pendiente',
        label: 'Pendiente',
        icon: 'inbox',
        actor: null,
        time: null,
        done: !isPending,
        current: isPending,
      },
      {
        key: 'escalado',
        label: 'Escalado',
        icon: 'flag',
        actor: r.escalated_by_name ?? null,
        time: formatDateTime(r.escalated_at),
        done: isInReview || isDictaminated,
        current: isEscalated,
      },
      {
        key: 'en_revision',
        label: 'En revisión',
        icon: 'visibility',
        actor: r.assigned_to_name ?? null,
        time: formatDateTime(r.taken_at),
        done: isDictaminated,
        current: isInReview,
      },
      {
        key: 'dictaminado',
        label: 'Dictaminado',
        icon: 'gavel',
        actor: r.dictaminado_by_name ?? null,
        time: formatDateTime(r.dictaminado_at),
        done: isDictaminated,
        current: isDictaminated,
      },
    ];
  });

  protected dotClass(n: TimelineNode): string {
    if (n.done) return 'bg-brand text-white border-transparent';
    if (n.current) return 'bg-tier-yellow-soft text-tier-yellow-ink border-tier-yellow-ink/20';
    return 'bg-soft text-ink-4 border-line';
  }

  protected labelClass(n: TimelineNode): string {
    if (n.done || n.current) return 'text-ink';
    return 'text-ink-4';
  }
}

