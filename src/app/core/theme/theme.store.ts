import { Injectable, computed, effect, signal } from '@angular/core';

import { isMarketingPath } from './theme-path';

const APP_DARK_STORAGE_KEY = 'centinela:app-dark';
const LEGACY_DARK_STORAGE_KEY = 'centinela:dark';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly _marketingRoute = signal(false);
  private readonly _appDark = signal(false);

  /** Tema efectivo en pantalla (marketing → siempre oscuro). */
  readonly dark = computed(() => (this._marketingRoute() ? true : this._appDark()));

  /** Preferencia del usuario dentro de la app autenticada. */
  readonly appDark = this._appDark.asReadonly();

  readonly isMarketingRoute = this._marketingRoute.asReadonly();

  constructor() {
    if (typeof window !== 'undefined') {
      this._appDark.set(readAppDarkPreference());
      this._marketingRoute.set(isMarketingPath(window.location.pathname));
    }

    effect(() => {
      if (typeof document === 'undefined') return;
      const isDark = this.dark();
      document.documentElement.classList.toggle('dark', isDark);
      const themeColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--mkt-theme-color')
        .trim();
      if (themeColor) {
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
      }
      if (!this._marketingRoute()) {
        try {
          window.localStorage.setItem(APP_DARK_STORAGE_KEY, this._appDark() ? '1' : '0');
        } catch {
          // ignore storage errors (private mode, etc.)
        }
      }
    });
  }

  toggle(): void {
    if (this._marketingRoute()) return;
    this._appDark.update((value) => !value);
  }

  setDark(value: boolean): void {
    if (this._marketingRoute()) return;
    this._appDark.set(value);
  }

  setMarketingRoute(value: boolean): void {
    this._marketingRoute.set(value);
  }
}

function readAppDarkPreference(): boolean {
  try {
    const stored = window.localStorage.getItem(APP_DARK_STORAGE_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;

    const legacy = window.localStorage.getItem(LEGACY_DARK_STORAGE_KEY);
    if (legacy === '1') return true;
    if (legacy === '0') return false;
  } catch {
    // ignore storage errors
  }
  return false;
}
