import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { Icon } from '@shared/ui/icon';
import { ALERT_CATALOG } from '../models/alert-catalog';
import type { ClaimAlert } from '../models';

@Component({
  selector: 'claim-alerts-list',
  standalone: true,
  imports: [EmptyState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div>
          <h3 class="text-[13px] font-semibold m-0">Señales activadas</h3>
          <div class="text-[12px] text-ink-3 mt-0.5">{{ alerts().length }} reglas · {{ totalPts() }} pts</div>
        </div>
        <span class="text-[11.5px] text-ink-3">Ordenadas por puntaje</span>
      </div>
      @if (sorted().length === 0) {
        <ui-empty-state title="Sin alertas activas" sub="Este siniestro pasa todas las reglas de negocio." />
      } @else {
        @for (a of sorted(); track $index) {
          <div class="grid grid-cols-[24px_1fr_auto] gap-3 px-5 py-3.5 border-t border-line first:border-t-0 items-start">
            <ui-icon name="warning" [size]="18" [style.color]="iconColor(a.severidad)" />
            <div>
              <p class="font-medium text-[13.5px] m-0 mb-0.5">{{ titleFor(a.code) }}</p>
              <span class="font-mono text-[10.5px] text-ink-4">{{ a.code }} · {{ classificationFor(a.code) }}</span>
              <p class="text-[12.5px] text-ink-3 mt-1 mb-0">{{ a.detalle }}</p>
            </div>
            <span class="font-mono text-[12px] font-medium px-2 py-0.5 rounded border" [class]="ptsClass(a.severidad)">+{{ a.puntos }}</span>
          </div>
        }
      }
    </div>
  `,
})
export class AlertsList {
  readonly alerts = input.required<readonly ClaimAlert[]>();

  protected readonly sorted = computed(() => [...this.alerts()].sort((a, b) => b.puntos - a.puntos));

  protected readonly totalPts = computed(() => this.alerts().reduce((s, a) => s + a.puntos, 0));

  protected titleFor(code: string): string {
    return ALERT_CATALOG[code]?.titulo ?? code;
  }

  protected classificationFor(code: string): string {
    return ALERT_CATALOG[code]?.clasificacion?.toUpperCase() ?? '';
  }

  protected iconColor(sev: 'high' | 'med' | 'low'): string {
    return sev === 'high' ? 'var(--tier-red)' : sev === 'med' ? 'var(--tier-yellow)' : 'var(--ink-3)';
  }

  protected ptsClass(sev: 'high' | 'med' | 'low'): string {
    return sev === 'high'
      ? 'bg-tier-red-soft text-tier-red-ink border-transparent'
      : sev === 'med'
        ? 'bg-tier-yellow-soft text-tier-yellow-ink border-transparent'
        : 'bg-soft text-ink-2 border-line';
  }
}
