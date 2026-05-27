import { Injectable, effect, signal } from '@angular/core';

const STORAGE_KEY = 'centinela:chat-ui-prefs.show-charts';

@Injectable({ providedIn: 'root' })
export class ChatUiPrefsStore {
  private readonly _showCharts = signal<boolean>(true);
  readonly showCharts = this._showCharts.asReadonly();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === '0') this._showCharts.set(false);
      } catch {
        // ignore storage errors (private mode, etc.)
      }
    }
    effect(() => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(STORAGE_KEY, this._showCharts() ? '1' : '0');
      } catch {
        // ignore storage errors (private mode, etc.)
      }
    });
  }

  toggleCharts(): void {
    this._showCharts.update((v) => !v);
  }
}
