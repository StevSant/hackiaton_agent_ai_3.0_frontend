import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { MarkdownPipe } from '@shared/pipes';

import type { ChartExplainEntry } from '../services/insights-explain.store';

@Component({
  selector: 'insights-chart-explainer',
  standalone: true,
  imports: [Icon, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="insights-chart-explainer">
      <button
        type="button"
        class="insights-chart-explainer__btn"
        [class.insights-chart-explainer__btn--active]="open()"
        [disabled]="loading()"
        (click)="onClick()"
      >
        <ui-icon [name]="loading() ? 'hourglass_empty' : 'auto_awesome'" [size]="14" />
        <span>{{ label() }}</span>
        @if (hasResult() && !loading()) {
          <ui-icon [name]="open() ? 'expand_less' : 'expand_more'" [size]="16" />
        }
      </button>

      @if (open()) {
        <div class="insights-chart-explainer__panel">
          @if (loading()) {
            <div class="insights-chart-explainer__skeleton" aria-label="Analizando gráfico">
              <span></span><span></span><span></span>
            </div>
          } @else if (error(); as err) {
            <p class="insights-chart-explainer__error">
              <ui-icon name="error_outline" [size]="14" />
              {{ err }}
            </p>
          } @else if (text(); as md) {
            <div class="insights-chart-explainer__md" [innerHTML]="md | markdown"></div>
            <p class="insights-chart-explainer__foot">
              Alerta para revisión humana — no es una conclusión automática.
            </p>
          }
        </div>
      }
    </div>
  `,
})
export class ChartExplainer {
  readonly entry = input<ChartExplainEntry | undefined>(undefined);
  readonly explain = output<void>();
  readonly toggle = output<void>();

  protected readonly loading = computed(() => this.entry()?.loading ?? false);
  protected readonly open = computed(() => this.entry()?.open ?? false);
  protected readonly text = computed(() => this.entry()?.text ?? null);
  protected readonly error = computed(() => this.entry()?.error ?? null);
  protected readonly hasResult = computed(() => this.text() !== null || this.error() !== null);

  protected readonly label = computed(() => {
    if (this.loading()) return 'Analizando…';
    if (this.hasResult()) return this.open() ? 'Ocultar análisis IA' : 'Ver análisis IA';
    return 'Explicar con IA';
  });

  protected onClick(): void {
    if (this.loading()) return;
    if (this.hasResult()) {
      this.toggle.emit();
    } else {
      this.explain.emit();
    }
  }
}
