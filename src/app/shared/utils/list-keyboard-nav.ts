import type { DestroyRef, WritableSignal } from '@angular/core';
import { effect } from '@angular/core';

import type { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';

import {
  bindShortcutHandlers,
  focusKeyboardSearch,
  focusListContext,
  scrollKeyboardRowIntoView,
} from './keyboard';

export function bindListKeyboardNav(
  destroyRef: DestroyRef,
  shortcuts: KeyboardShortcutsService,
  options: {
    rows: () => readonly { id: string }[];
    focusedIndex: WritableSignal<number>;
    onOpen: (id: string) => void;
    searchSelector?: string;
  },
): void {
  effect(() => {
    options.rows().map((row) => row.id).join('\n');
    options.focusedIndex.set(-1);
  });

  const moveFocus = (delta: number): void => {
    const rows = options.rows();
    if (!rows.length) return;

    let index = options.focusedIndex();
    if (index < 0) {
      index = delta > 0 ? 0 : rows.length - 1;
    } else {
      index = Math.max(0, Math.min(rows.length - 1, index + delta));
    }

    options.focusedIndex.set(index);
    scrollKeyboardRowIntoView(rows[index].id);
    focusListContext();
  };

  const openFocused = (): void => {
    const rows = options.rows();
    if (!rows.length) return;

    let index = options.focusedIndex();
    if (index < 0) index = 0;

    options.onOpen(rows[index].id);
  };

  bindShortcutHandlers(
    destroyRef,
    shortcuts,
    [
      {
        keys: '/',
        label: 'Enfocar búsqueda',
        group: 'Lista',
        test: (event) => event.key === '/',
        run: () => focusKeyboardSearch(options.searchSelector),
      },
      {
        keys: 'J  ·  ↑',
        label: 'Subir en la lista',
        group: 'Lista',
        test: (event) =>
          !event.shiftKey &&
          (event.key === 'j' || event.key === 'J' || event.key === 'ArrowUp'),
        run: () => moveFocus(-1),
      },
      {
        keys: 'K  ·  ↓',
        label: 'Bajar en la lista',
        group: 'Lista',
        test: (event) =>
          !event.shiftKey &&
          (event.key === 'k' || event.key === 'K' || event.key === 'ArrowDown'),
        run: () => moveFocus(1),
      },
      {
        keys: 'Enter',
        label: 'Abrir registro seleccionado',
        group: 'Lista',
        test: (event) => !event.shiftKey && event.key === 'Enter',
        run: openFocused,
      },
    ],
  );
}
