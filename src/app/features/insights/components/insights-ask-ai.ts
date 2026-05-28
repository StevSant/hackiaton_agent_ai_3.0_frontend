import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

import { Icon } from '@shared/ui/icon';

/**
 * The mandatory natural-language questions (challenge §2.6) surfaced as one-tap
 * prompts. Selecting one (or typing a custom question) deep-links to the agent
 * chat, which answers with claim citations + the rules that fired.
 */
export const INSIGHTS_NL_QUESTIONS: readonly string[] = [
  '¿Cuáles son los 10 siniestros con mayor riesgo de posible fraude?',
  '¿Qué proveedores concentran más alertas?',
  '¿Qué ramos tienen mayor porcentaje de casos sospechosos?',
  '¿Qué ciudades presentan mayor concentración de alertas?',
  '¿Qué asegurados tienen mayor frecuencia de reclamos?',
  '¿Qué documentos faltan en los casos críticos?',
  '¿Qué casos tienen montos atípicos?',
  '¿Qué siniestros ocurrieron cerca del inicio de la póliza?',
  '¿Qué patrones se repiten en los reclamos sospechosos?',
  'Recomienda qué casos debería revisar primero el analista.',
];

@Component({
  selector: 'insights-ask-ai',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 p-4">
      <div class="flex items-center gap-2 mb-1">
        <span
          class="w-7 h-7 rounded-md grid place-items-center text-white shrink-0"
          style="background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);"
        >
          <ui-icon name="auto_awesome" [size]="16" />
        </span>
        <div class="min-w-0">
          <h2 class="text-[14px] font-semibold tracking-tight m-0">Pregúntale a la IA</h2>
          <p class="text-ink-3 text-[11.5px] m-0">
            Respuestas con citas a siniestros y reglas activadas.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 mt-3 mb-3">
        <input
          type="text"
          class="flex-1 bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
          placeholder="Escribe una pregunta sobre tus siniestros…"
          [value]="text()"
          (input)="text.set($any($event.target).value)"
          (keydown.enter)="submit()"
        />
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm text-[13px] font-medium bg-brand text-white border border-transparent hover:bg-brand-2 disabled:opacity-50 disabled:cursor-not-allowed"
          [disabled]="text().trim().length === 0"
          (click)="submit()"
        >
          <ui-icon name="send" [size]="14" />
          Preguntar
        </button>
      </div>

      <div class="flex flex-wrap gap-1.5">
        @for (q of questions; track q) {
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-left text-[12px] px-2.5 py-1.5 rounded-full border border-line bg-soft text-ink-2 hover:bg-hover hover:text-ink"
            (click)="ask.emit(q)"
          >
            <ui-icon name="auto_awesome" [size]="12" class="text-brand-ink" />
            {{ q }}
          </button>
        }
      </div>

      <button
        type="button"
        class="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-ink hover:underline underline-offset-2"
        (click)="ask.emit(executiveSummaryPrompt)"
      >
        <ui-icon name="summarize" [size]="15" />
        Generar resumen ejecutivo de casos críticos
      </button>
    </div>
  `,
})
export class InsightsAskAi {
  readonly ask = output<string>();

  protected readonly questions = INSIGHTS_NL_QUESTIONS;
  protected readonly executiveSummaryPrompt = 'Genera un resumen ejecutivo de los casos críticos.';
  protected readonly text = signal<string>('');

  protected submit(): void {
    const value = this.text().trim();
    if (!value) return;
    this.ask.emit(value);
    this.text.set('');
  }
}
