import type { DestroyRef } from '@angular/core';
import type { Router } from '@angular/router';

import type { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';

import { bindShortcutHandlers, focusListContext } from './keyboard';

function collectNavLinks(): HTMLAnchorElement[] {
  if (typeof document === 'undefined') return [];
  return Array.from(
    document.querySelectorAll<HTMLAnchorElement>('aside.centinela-sidebar a.centinela-nav-link'),
  );
}

function resolveCurrentNavIndex(links: readonly HTMLAnchorElement[], url: string): number {
  const path = url.split(/[?#]/)[0];
  let bestIndex = -1;
  let bestLength = -1;

  for (let index = 0; index < links.length; index += 1) {
    const href = links[index].getAttribute('href') ?? '';
    if (!href) continue;
    if (path === href || path.startsWith(`${href}/`)) {
      if (href.length > bestLength) {
        bestIndex = index;
        bestLength = href.length;
      }
    }
  }

  return bestIndex >= 0 ? bestIndex : 0;
}

/** Navigate to the sidebar link `delta` positions away from the current route. */
export function moveSidebarSection(router: Router, delta: number): void {
  const links = collectNavLinks();
  if (!links.length) return;

  const currentIndex = resolveCurrentNavIndex(links, router.url);
  const nextIndex = Math.max(0, Math.min(links.length - 1, currentIndex + delta));
  if (nextIndex === currentIndex) return;

  const href = links[nextIndex].getAttribute('href');
  if (!href) return;

  void router.navigateByUrl(href).then(() => focusListContext());
}

export function bindSectionKeyboardNav(
  destroyRef: DestroyRef,
  shortcuts: KeyboardShortcutsService,
  router: Router,
): void {
  const moveSection = (delta: number): void => moveSidebarSection(router, delta);

  bindShortcutHandlers(
    destroyRef,
    shortcuts,
    [
      {
        keys: '1',
        label: 'Subir en el menú lateral',
        group: 'Menú',
        test: (event) =>
          !event.shiftKey &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          event.key === '1',
        run: () => moveSection(-1),
      },
      {
        keys: '2',
        label: 'Bajar en el menú lateral',
        group: 'Menú',
        test: (event) =>
          !event.shiftKey &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          event.key === '2',
        run: () => moveSection(1),
      },
    ],
  );
}

/**
 * Binds ←/→ to move between adjacent sidebar sections. Scoped to list pages
 * (the caller's lifetime) so it never collides with detail-page ←/→ (prev/next
 * record), which is bound only while a detail page is mounted.
 */
export function bindSectionArrowNav(
  destroyRef: DestroyRef,
  shortcuts: KeyboardShortcutsService,
  router: Router,
): void {
  bindShortcutHandlers(
    destroyRef,
    shortcuts,
    [
      {
        keys: '←',
        label: 'Sección anterior',
        group: 'Menú',
        test: (event) =>
          !event.shiftKey &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          event.key === 'ArrowLeft',
        run: () => moveSidebarSection(router, -1),
      },
      {
        keys: '→',
        label: 'Sección siguiente',
        group: 'Menú',
        test: (event) =>
          !event.shiftKey &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          event.key === 'ArrowRight',
        run: () => moveSidebarSection(router, 1),
      },
    ],
  );
}
