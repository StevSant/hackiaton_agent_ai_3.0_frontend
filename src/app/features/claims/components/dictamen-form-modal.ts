import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Modal } from '@shared/ui/modal';
import type { DictamenOutcome } from '@shared/models';

interface OutcomeOption {
  value: DictamenOutcome;
  label: string;
  hint: string;
  icon: string;
  paletteSelected: string;
}

const OPTIONS: OutcomeOption[] = [
  {
    value: 'confirmado_sospecha',
    label: 'Sospecha confirmada',
    hint: 'El análisis sostiene la posibilidad de fraude. Recomienda inspección pericial o comité.',
    icon: 'priority_high',
    paletteSelected: 'border-tier-red-ink bg-tier-red-soft/50 text-tier-red-ink',
  },
  {
    value: 'descartado',
    label: 'Sospecha descartada',
    hint: 'La evidencia no soporta la alerta. El caso continúa por flujo normal.',
    icon: 'check_circle',
    paletteSelected: 'border-tier-green-ink bg-tier-green-soft/50 text-tier-green-ink',
  },
  {
    value: 'requiere_mas_info',
    label: 'Requiere más información',
    hint: 'Devuelve el caso al analista con la documentación específica que necesitas.',
    icon: 'info',
    paletteSelected: 'border-tier-yellow-ink bg-tier-yellow-soft/50 text-tier-yellow-ink',
  },
];

interface DictamenSubmit {
  outcome: DictamenOutcome;
  justificacion: string;
}

@Component({
  selector: 'claim-dictamen-form-modal',
  standalone: true,
  imports: [Modal, Button, Icon, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="open()"
      [title]="title()"
      subtitle="Tu decisión queda en el historial del caso y es visible al analista que escaló."
      size="lg"
      (close)="close.emit()"
    >
      <div class="px-5 py-4">
        <label class="block text-[11px] uppercase tracking-wider font-medium text-ink-3 mb-2">Resultado</label>
        <div class="grid gap-2 sm:grid-cols-3">
          @for (o of options; track o.value) {
            <button
              type="button"
              class="text-left px-3 py-2.5 rounded-sm border transition-colors"
              [class]="optionClass(o)"
              (click)="outcome.set(o.value)"
            >
              <div class="flex items-center gap-1.5 font-medium text-[13px]">
                <ui-icon [name]="o.icon" [size]="14" />
                {{ o.label }}
              </div>
              <div class="text-[11.5px] text-ink-3 mt-1 leading-snug">{{ o.hint }}</div>
            </button>
          }
        </div>

        <label class="block text-[11px] uppercase tracking-wider font-medium text-ink-3 mb-2 mt-5">
          Justificación
          <span class="text-ink-4 normal-case tracking-normal">— mínimo 20 caracteres</span>
        </label>
        <textarea
          rows="5"
          class="w-full rounded-sm border border-line bg-canvas px-3 py-2 text-[13px] text-ink resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-2"
          placeholder="Explica las piezas de evidencia que sostienen la decisión."
          [(ngModel)]="justificacion"
        ></textarea>
        <div class="flex items-center justify-between text-[11px] text-ink-4 mt-1">
          <span>{{ justificacion().length }} / 20+</span>
          @if (!canSubmit() && outcome() && justificacion().length > 0) {
            <span class="text-tier-yellow-ink">Agrega más detalle para emitir el dictamen.</span>
          }
        </div>
      </div>

      <div footer class="px-5 py-3.5 border-t border-line flex items-center justify-end gap-2 bg-surface">
        <ui-button variant="ghost" (click)="close.emit()">Cancelar</ui-button>
        <ui-button variant="primary" [disabled]="!canSubmit()" (click)="onSubmit()">
          <ui-icon name="gavel" [size]="14" />
          Emitir dictamen
        </ui-button>
      </div>
    </ui-modal>
  `,
})
export class DictamenFormModal {
  readonly open = input.required<boolean>();
  readonly close = output<void>();
  readonly submit = output<DictamenSubmit>();

  protected readonly options = OPTIONS;
  protected readonly outcome = signal<DictamenOutcome | null>(null);
  protected readonly justificacion = signal<string>('');

  protected readonly title = computed(() => 'Emitir dictamen');

  protected readonly canSubmit = computed(() => {
    const o = this.outcome();
    const j = this.justificacion().trim();
    return o !== null && j.length >= 20;
  });

  protected optionClass(o: OutcomeOption): string {
    const selected = this.outcome() === o.value;
    return selected
      ? o.paletteSelected
      : 'border-line bg-surface hover:bg-hover text-ink';
  }

  protected onSubmit(): void {
    const o = this.outcome();
    const j = this.justificacion().trim();
    if (!o || j.length < 20) return;
    this.submit.emit({ outcome: o, justificacion: j });
    // Reset for next open
    this.outcome.set(null);
    this.justificacion.set('');
  }
}
