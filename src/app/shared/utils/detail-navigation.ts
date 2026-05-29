import { effect, type DestroyRef, type WritableSignal } from '@angular/core';

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
  handlers: { onPrev: () => void; onNext: () => void },
): void {
  if (typeof window === 'undefined') return;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (isTypingTarget(event.target)) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handlers.onPrev();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      handlers.onNext();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  destroyRef.onDestroy(() => window.removeEventListener('keydown', onKeyDown));
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
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
