import type { DestroyRef } from '@angular/core';

import type { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function hasOpenDialog(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector('[role="dialog"][aria-modal="true"]');
}

export function isModifiedShortcut(event: KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey;
}

export function isHelpKey(event: KeyboardEvent): boolean {
  return event.key === '?' || (event.key === '/' && event.shiftKey);
}

export interface ShortcutHandler {
  keys: string;
  label: string;
  group?: string;
  /** Allow even when focus is in an input (only use for help toggle). */
  allowInInput?: boolean;
  test: (event: KeyboardEvent) => boolean;
  run: () => void;
}

export function bindShortcutHandlers(
  destroyRef: DestroyRef,
  shortcuts: KeyboardShortcutsService,
  handlers: ShortcutHandler[],
  options?: {
    scopeTitle?: string;
    when?: () => boolean;
  },
): void {
  if (typeof window === 'undefined') return;

  if (options?.scopeTitle) {
    shortcuts.registerScope(
      {
        title: options.scopeTitle,
        entries: handlers
          .filter((handler) => !handler.allowInInput)
          .map((handler) => ({
            keys: handler.keys,
            label: handler.label,
            group: handler.group,
          })),
      },
      destroyRef,
    );
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (options?.when && !options.when()) return;

    for (const handler of handlers) {
      if (!handler.test(event)) continue;

      if (handler.allowInInput) {
        if (isModifiedShortcut(event)) continue;
      } else if (shouldBlockShortcut(event)) {
        continue;
      }

      event.preventDefault();
      handler.run();
      return;
    }
  };

  window.addEventListener('keydown', onKeyDown);
  destroyRef.onDestroy(() => window.removeEventListener('keydown', onKeyDown));
}

function shouldBlockShortcut(event: KeyboardEvent): boolean {
  if (isModifiedShortcut(event)) return true;
  if (isTypingTarget(event.target)) return true;
  if (hasOpenDialog()) return true;
  return false;
}

export function focusKeyboardSearch(selector = '[data-keyboard-search]'): void {
  if (typeof document === 'undefined') return;
  const input = document.querySelector<HTMLElement>(selector);
  input?.focus();
}

export function scrollKeyboardRowIntoView(rowId: string): void {
  if (typeof document === 'undefined') return;
  document
    .querySelector(`[data-keyboard-row="${rowId}"]`)
    ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
