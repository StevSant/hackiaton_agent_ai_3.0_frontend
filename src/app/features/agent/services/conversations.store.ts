import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConversationsApi } from '@core/api/clients/conversations.api';
import { AppError } from '@core/errors/app-error';
import type { ConversationSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class ConversationsStore {
  private readonly api = inject(ConversationsApi);

  private readonly _list = signal<ConversationSummary[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<AppError | null>(null);
  private readonly _query = signal<string>('');

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly list = this._list.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly query = this._query.asReadonly();

  readonly isEmpty = computed(() => !this._loading() && this._list().length === 0);

  async refresh(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const q = this._query() || undefined;
      const result = await firstValueFrom(this.api.list(q));
      this._list.set(result);
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

  setQuery(q: string): void {
    this._query.set(q);
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      void this.refresh();
    }, 250);
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
