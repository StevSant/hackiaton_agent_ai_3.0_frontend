import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConversationsApi } from '@core/api/clients/conversations.api';
import { AppError } from '@core/errors/app-error';
import type { ConversationSummary } from '../models';

/** Lowercase + strip accents so "grafico" matches "gráfico". */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

@Injectable({ providedIn: 'root' })
export class ConversationsStore {
  private readonly api = inject(ConversationsApi);

  private readonly _list = signal<ConversationSummary[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<AppError | null>(null);
  private readonly _query = signal<string>('');
  /** Set once the first fetch lands — so later refreshes can revalidate silently. */
  private _loaded = false;

  readonly list = this._list.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly query = this._query.asReadonly();

  readonly isEmpty = computed(() => !this._loading() && this._list().length === 0);

  /** Client-side filtered view (title + last-message snippet), accent-insensitive.
   * Searching is instant against the cached list — no per-keystroke backend call. */
  readonly filtered = computed(() => {
    const q = norm(this._query().trim());
    if (!q) return this._list();
    return this._list().filter(
      (c) => norm(c.title ?? '').includes(q) || norm(c.snippet ?? '').includes(q),
    );
  });

  /**
   * Fetch the conversation list. Shows the loading skeleton ONLY on the first
   * load (empty cache); subsequent calls revalidate silently so reopening the
   * panel never flashes skeletons over already-cached data (stale-while-revalidate).
   */
  async refresh(): Promise<void> {
    const silent = this._loaded && this._list().length > 0;
    if (!silent) this._loading.set(true);
    this._error.set(null);
    try {
      // Always fetch the full list — filtering happens client-side now.
      const result = await firstValueFrom(this.api.list());
      this._list.set(result);
      this._loaded = true;
    } catch (err) {
      this._error.set(
        err instanceof AppError
          ? err
          : new AppError('fetch_error', err instanceof Error ? err.message : 'Error desconocido'),
      );
    } finally {
      this._loading.set(false);
    }
  }

  /** Local, instant filtering — just updates the query; `filtered` recomputes. */
  setQuery(q: string): void {
    this._query.set(q);
  }

  async rename(id: string, title: string): Promise<void> {
    try {
      const updated = await firstValueFrom(this.api.rename(id, { title }));
      this._list.update((list) =>
        list.map((item) =>
          item.id === id ? { ...item, title: updated.title, updated_at: updated.updated_at } : item,
        ),
      );
    } catch (err) {
      this._error.set(
        err instanceof AppError
          ? err
          : new AppError('rename_error', err instanceof Error ? err.message : 'Error al renombrar'),
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await firstValueFrom(this.api.delete(id));
      this._list.update((list) => list.filter((item) => item.id !== id));
    } catch (err) {
      this._error.set(
        err instanceof AppError
          ? err
          : new AppError('delete_error', err instanceof Error ? err.message : 'Error al eliminar'),
      );
    }
  }
}
