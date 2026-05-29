import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';
import { Modal } from './modal';

@Component({
  selector: 'ui-keyboard-shortcuts-help',
  standalone: true,
  imports: [Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="shortcuts.helpOpen()"
      [title]="'Atajos de teclado'"
      subtitle="Disponibles en toda la aplicación"
      size="md"
      (close)="shortcuts.closeHelp()"
    >
      <div class="px-5 py-4">
        @for (group of shortcuts.helpGroups(); track group[0]) {
          <section class="centinela-kbd-group">
            <h3 class="centinela-kbd-group__title">{{ group[0] }}</h3>
            <ul class="centinela-kbd-list">
              @for (entry of group[1]; track entry.keys + entry.label) {
                <li class="centinela-kbd-list__item">
                  <span class="centinela-kbd-list__label">{{ entry.label }}</span>
                  <span class="centinela-kbd-list__keys">
                    @for (key of splitKeys(entry.keys); track key) {
                      <kbd class="centinela-kbd-key">{{ key }}</kbd>
                    }
                  </span>
                </li>
              }
            </ul>
          </section>
        }
      </div>
      <p class="px-5 pb-4 text-[12px] text-ink-3 m-0">
        Los atajos no aplican mientras escribes en un campo de texto, salvo
        <kbd class="centinela-kbd-key centinela-kbd-key--inline">?</kbd> para abrir esta ayuda.
      </p>
    </ui-modal>
  `,
})
export class KeyboardShortcutsHelp {
  protected readonly shortcuts = inject(KeyboardShortcutsService);

  protected splitKeys(keys: string): string[] {
    return keys
      .split('·')
      .map((part) => part.trim())
      .filter(Boolean);
  }
}
