import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { Icon } from '@shared/ui/icon';
import { ALERT_CATALOG, type ClaimAlert } from '@shared/models';

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
        <span class="text-[11.5px] text-ink-3 hidden sm:inline">Ordenadas por puntaje</span>
      </div>
      @if (sorted().length === 0) {
        <ui-empty-state title="Sin alertas activas" sub="Este siniestro pasa todas las reglas de negocio." />
      } @else {
        @for (a of sorted(); track a.code + $index) {
          <div class="border-t border-line first:border-t-0">
            <button
              type="button"
              class="claim-alert-row w-full grid grid-cols-[24px_1fr_auto_20px] gap-3 px-5 py-3 items-center text-left border-0 bg-transparent cursor-pointer text-ink hover:bg-hover transition-colors"
              (click)="toggle($index)"
              [attr.aria-expanded]="isExpanded($index)"
            >
              <ui-icon name="warning" [size]="18" [style.color]="iconColor(a.severidad)" class="shrink-0" />
              <span class="font-medium text-[13.5px] min-w-0 truncate">{{ titleFor(a.code) }}</span>
              <span
                class="font-mono text-[12px] font-medium px-2 py-0.5 rounded border shrink-0"
                [class]="ptsClass(a.severidad)"
                >+{{ a.puntos }}</span
              >
              <ui-icon
                [name]="isExpanded($index) ? 'expand_less' : 'expand_more'"
                [size]="18"
                class="text-ink-3 shrink-0"
              />
            </button>
            @if (isExpanded($index)) {
              <div class="px-5 pb-3.5 -mt-1">
                <div class="ml-9 border-l-2 border-line pl-3">
                  <span class="font-mono text-[10.5px] text-ink-4">{{ a.code }} · {{ classificationFor(a.code) }}</span>
                  <p class="text-[12.5px] text-ink-3 mt-1.5 mb-0 leading-relaxed">{{ a.detalle }}</p>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: `
    .claim-alert-row:focus-visible {
      outline: 2px solid color-mix(in oklch, var(--brand) 45%, transparent);
      outline-offset: -2px;
    }
  `,
})
export class AlertsList {
  readonly alerts = input.required<readonly ClaimAlert[]>();

  private readonly expandedRows = signal<ReadonlySet<number>>(new Set());

  protected readonly sorted = computed(() => [...this.alerts()].sort((a, b) => b.puntos - a.puntos));

  protected readonly totalPts = computed(() => this.alerts().reduce((s, a) => s + a.puntos, 0));

  protected isExpanded(index: number): boolean {
    return this.expandedRows().has(index);
  }

  protected toggle(index: number): void {
    this.expandedRows.update((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

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
