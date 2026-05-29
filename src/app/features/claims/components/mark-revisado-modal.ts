import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Modal } from '@shared/ui/modal';

/**
 * Confirmation modal for closing a claim as reviewed without escalation.
 * Replaces the native window.prompt. The note is optional and is recorded
 * in the case history visible to Antifraude.
 */
@Component({
  selector: 'claim-mark-revisado-modal',
  standalone: true,
  imports: [Modal, Button, Icon, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="open()"
      title="Marcar caso como revisado"
      subtitle="El caso se cierra sin escalar a la Unidad Antifraude. Queda en el historial."
      size="sm"
      (close)="onCancel()"
    >
      <div class="px-5 py-4">
        <div
          class="flex items-start gap-2.5 rounded-sm border border-tier-green-ink/30 bg-tier-green-soft/40 px-3 py-2.5 text-[12.5px] text-tier-green-ink leading-snug"
        >
          <ui-icon name="check_circle" [size]="16" class="mt-px shrink-0" />
          <span>
            Confirmas que revisaste este caso y <strong>no requiere</strong> escalación. El caso
            continúa por el flujo normal.
          </span>
        </div>

        <label class="block text-[11px] uppercase tracking-wider font-medium text-ink-3 mb-2 mt-5">
          Nota
          <span class="text-ink-4 normal-case tracking-normal">— opcional</span>
        </label>
        <textarea
          rows="4"
          class="w-full rounded-sm border border-line bg-canvas px-3 py-2 text-[13px] text-ink resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-2"
          placeholder="Deja un comentario sobre por qué el caso no requiere escalación."
          [(ngModel)]="note"
        ></textarea>
      </div>

      <div footer class="px-5 py-3.5 border-t border-line flex items-center justify-end gap-2 bg-surface">
        <ui-button variant="ghost" (click)="onCancel()">Cancelar</ui-button>
        <ui-button variant="primary" (click)="onConfirm()">
          <ui-icon name="check_circle" [size]="14" />
          Marcar revisado
        </ui-button>
      </div>
    </ui-modal>
  `,
})
export class MarkRevisadoModal {
  readonly open = input.required<boolean>();
  readonly close = output<void>();
  readonly confirm = output<string | undefined>();

  protected readonly note = signal<string>('');

  protected onCancel(): void {
    this.note.set('');
    this.close.emit();
  }

  protected onConfirm(): void {
    this.confirm.emit(this.note().trim() || undefined);
    this.note.set('');
  }
}
