import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { Icon } from '@shared/ui/icon';
import { ALERT_CATALOG, type ClaimAlert } from '@shared/models';
import { formatEvidence, type EvidenceRow } from '../utils/evidence-format';

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
                <div class="ml-9 border-l-2 border-line pl-3 space-y-2.5">
                  <div>
                    <span class="font-mono text-[10.5px] text-ink-4">{{ a.code }} · {{ classificationFor(a.code) }}</span>
                    <p class="text-[12.5px] text-ink-3 mt-1.5 mb-0 leading-relaxed">{{ a.detalle }}</p>
                  </div>

                  @if (evidenceFor(a).length > 0) {
                    <div class="rounded-lg border border-brand/35 bg-brand-soft/50 px-3 py-2.5">
                      <div class="flex items-center gap-1.5 mb-2">
                        <ui-icon name="fact_check" [size]="14" class="text-brand-ink" />
                        <span class="text-[11px] uppercase tracking-[0.06em] text-brand-ink font-bold">
                          Por qué se activó en este caso
                        </span>
                      </div>
                      <div class="flex flex-wrap gap-x-5 gap-y-2">
                        @for (row of evidenceFor(a); track row.label) {
                          <span class="inline-flex flex-col leading-tight">
                            <span class="text-[10.5px] text-ink-3">{{ row.label }}</span>
                            <span class="text-[13.5px] text-ink font-semibold font-mono">{{ row.value }}</span>
                          </span>
                        }
                      </div>
                    </div>
                  } @else {
                    <div class="flex items-start gap-1.5 text-[11.5px] text-ink-3 italic">
                      <ui-icon name="info" [size]="13" class="mt-0.5 shrink-0" />
                      <span>
                        Se activó por el criterio general de la regla (ver descripción). El detalle
                        cuantitativo de este caso requiere re-analizar el siniestro con contexto completo.
                      </span>
                    </div>
                  }

                  <div class="flex items-start gap-1.5 text-[12px] text-ink-2 pt-0.5">
                    <ui-icon name="calculate" [size]="13" class="text-ink-4 mt-0.5 shrink-0" />
                    <span>{{ scoreNote(a) }}</span>
                  </div>
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

  protected evidenceFor(a: ClaimAlert): EvidenceRow[] {
    return formatEvidence(a.evidence);
  }

  /** Explains how the rule contributes to the score (additive FS vs critical RF). */
  protected scoreNote(a: ClaimAlert): string {
    if (a.puntos > 0) {
      return `Aporta +${a.puntos} pts al puntaje acumulado (escala 0–100).`;
    }
    const tier = ALERT_CATALOG[a.code]?.clasificacion;
    const tierLabel = tier === 'rojo' ? 'rojo' : tier === 'amarillo' ? 'al menos amarillo' : 'su nivel';
    return `Regla crítica: no suma puntos, pero por sí sola clasifica el caso como ${tierLabel} y obliga su revisión.`;
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
