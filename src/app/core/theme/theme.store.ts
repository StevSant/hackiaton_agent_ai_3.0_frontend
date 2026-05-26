import { Injectable, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly _dark = signal<boolean>(false);
  readonly dark = this._dark.asReadonly();

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('centinela:dark');
      if (stored === '1') this._dark.set(true);
    }
    effect(() => {
      if (typeof document === 'undefined') return;
      const isDark = this._dark();
      document.documentElement.classList.toggle('dark', isDark);
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
}
