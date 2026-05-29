/**
 * Click handler for `<a href>` entity links inside clickable rows/cards.
 *
 * Modified clicks (ctrl/cmd/shift or non-primary button) fall through to the
 * browser's default anchor behavior — open in new tab/window. A plain left
 * click is intercepted (no full-page reload) and `navigate` runs the SPA
 * navigation instead. Propagation always stops so a parent row (click)
 * doesn't double-navigate.
 */
export function handleEntityLinkClick(event: MouseEvent, navigate: () => void): void {
  event.stopPropagation();
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) {
    return;
  }
  event.preventDefault();
  navigate();
}
