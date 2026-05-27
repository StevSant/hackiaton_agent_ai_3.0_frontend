import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  SimpleChanges,
  input,
  output,
  signal,
} from '@angular/core';

import { Button } from '@shared/ui/button';
import { Modal } from '@shared/ui/modal';

@Component({
  selector: 'agent-conversation-rename-modal',
  standalone: true,
  imports: [Modal, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="open()"
      title="Renombrar conversación"
      size="sm"
      (close)="cancel.emit()"
    >
      <div class="px-5 py-4 flex flex-col gap-4">
        <input
          type="text"
          class="w-full rounded-md border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
          placeholder="Nombre de la conversación"
          [value]="value()"
          (input)="value.set($any($event.target).value)"
          (keydown.enter)="onConfirm()"
        />
      </div>
      <div footer class="flex justify-end gap-2 px-5 py-3 border-t border-line">
        <ui-button (click)="cancel.emit()">Cancelar</ui-button>
        <ui-button variant="primary" [disabled]="!value().trim()" (click)="onConfirm()">
          Guardar
        </ui-button>
      </div>
    </ui-modal>
  `,
})
export class ConversationRenameModal implements OnChanges {
  readonly open = input<boolean>(false);
  readonly currentTitle = input<string>('');

  readonly confirm = output<string>();
  readonly cancel = output<void>();

  protected readonly value = signal<string>('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open()) {
      this.value.set(this.currentTitle());
    }
  }

  protected onConfirm(): void {
    const title = this.value().trim();
    if (!title) return;
    this.confirm.emit(title);
  }
}
