import { Injectable, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly _dark = signal<boolean>(true);
  readonly dark = this._dark.asReadonly();

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('centinela:dark');
      if (stored === '1') this._dark.set(true);
      else if (stored === '0') this._dark.set(false);
    }
    effect(() => {
      if (typeof document === 'undefined') return;
      const isDark = this._dark();
      document.documentElement.classList.toggle('dark', isDark);
      const themeColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--mkt-theme-color')
        .trim();
      if (themeColor) {
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
      }
      try {
        window.localStorage.setItem('centinela:dark', isDark ? '1' : '0');
      } catch {
        // ignore storage errors (private mode, etc.)
      }
    });
  }

  toggle(): void {
    this._dark.update((v) => !v);
  }

  setDark(value: boolean): void {
    this._dark.set(value);
  }
}
