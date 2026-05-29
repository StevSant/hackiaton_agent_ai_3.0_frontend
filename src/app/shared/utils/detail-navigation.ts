import { effect, type DestroyRef, type WritableSignal } from '@angular/core';

import type { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';

import { bindShortcutHandlers, hasOpenDialog } from './keyboard';

export function scrollAppMainToTop(): void {
  if (typeof document === 'undefined') return;
  const main = document.querySelector<HTMLElement>('.centinela-main');
  if (main) {
    main.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }
  window.scrollTo({ top: 0, behavior: 'auto' });
}

export function bindDetailKeyboardNav(
  destroyRef: DestroyRef,
  shortcuts: KeyboardShortcutsService,
  handlers: {
    onPrev: () => void;
    onNext: () => void;
    onBack?: () => void;
    onAskAi?: () => void;
  },
): void {
  bindShortcutHandlers(
    destroyRef,
    shortcuts,
    [
      {
        keys: '←  ·  [',
        label: 'Registro anterior',
        group: 'Navegación',
        test: (event) => event.key === 'ArrowLeft' || event.key === '[',
        run: handlers.onPrev,
      },
      {
        keys: '→  ·  ]',
        label: 'Registro siguiente',
        group: 'Navegación',
        test: (event) => event.key === 'ArrowRight' || event.key === ']',
        run: handlers.onNext,
      },
      ...(handlers.onBack
        ? [
            {
              keys: 'B  ·  Esc',
              label: 'Volver atrás',
              group: 'Navegación',
              test: (event: KeyboardEvent) =>
                event.key === 'b' ||
                event.key === 'B' ||
                (event.key === 'Escape' && !hasOpenDialog()),
              run: handlers.onBack,
            },
          ]
        : []),
      ...(handlers.onAskAi
        ? [
            {
              keys: 'A',
              label: 'Preguntar a la IA',
              group: 'Acciones',
              test: (event: KeyboardEvent) => event.key === 'a' || event.key === 'A',
              run: handlers.onAskAi,
            },
          ]
        : []),
    ],
  );
}

/** Increments `swapTick` whenever the record id changes (skips first render). */
export function bindRecordSwapPulse(
  idSource: () => string | undefined,
  swapTick: WritableSignal<number>,
): void {
  let skipInitial = true;
  effect(() => {
    const id = idSource();
    if (!id) return;
    if (skipInitial) {
      skipInitial = false;
      return;
    }
    swapTick.update((value) => value + 1);
  });
}
