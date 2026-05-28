import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ClaimsApi } from '@core/api/clients/claims.api';
import type { ClaimSummaryDto, InboxRowDto } from '@core/api/clients/claim.dto';
import { AuthStore } from '@core/auth/auth.store';
import { AppError } from '@core/errors/app-error';

const PAGE_SIZE = 100;

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof HttpErrorResponse) {
    const message =
      error.status === 0
        ? 'No se pudo contactar al backend.'
        : `Error ${error.status} al cargar la bandeja antifraude.`;
    return new AppError('antifraude/inbox', message, error.status);
  }
  return new AppError('antifraude/inbox', 'Error desconocido al cargar la bandeja.');
}

@Injectable({ providedIn: 'root' })
export class AntifraudeInboxStore {
  private readonly api = inject(ClaimsApi);
  private readonly auth = inject(AuthStore);

  private readonly _items = signal<InboxRowDto[]>([]);
  private readonly _historico = signal<ClaimSummaryDto[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _historicoLoading = signal<boolean>(false);
  private readonly _historicoLoaded = signal<boolean>(false);
  private readonly _error = signal<AppError | null>(null);

  readonly items = this._items.asReadonly();
  readonly historico = this._historico.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly historicoLoading = this._historicoLoading.asReadonly();
  readonly historicoLoaded = this._historicoLoaded.asReadonly();
  readonly error = this._error.asReadonly();

  readonly kpis = computed(() => {
    const list = this._items();
    const meName = this.auth.user()?.name ?? '';
    return {
      porTomar: list.filter((r) => !r.assigned_to_name).length,
      mineEnRevision: list.filter((r) => r.assigned_to_name === meName).length,
      reworks: list.filter((r) => r.bounce_count > 0).length,
    };
  });

  private lastUserId: string | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      const userId = user?.id ?? null;
      if (userId === this.lastUserId) return;
      this.lastUserId = userId;
      if (userId && user?.roleCode === 'antifraude') {
        void this.loadInbox();
      } else {
        this._items.set([]);
        this._historico.set([]);
        this._historicoLoaded.set(false);
        this._error.set(null);
      }
    });
  }

  async loadInbox(): Promise<void> {
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    let attempt = 0;
    while (true) {
      try {
        const items: InboxRowDto[] = [];
        let page = 0;
        while (true) {
          const result = await firstValueFrom(
            this.api.antifraudeInbox({ page, page_size: PAGE_SIZE }),
          );
          items.push(...result.items);
          if (items.length >= result.total || result.items.length === 0) break;
          page += 1;
        }
        this._items.set(items);
        break;
      } catch (error) {
        if (attempt === 0) {
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        this._error.set(toAppError(error));
        break;
      }
    }
    this._loading.set(false);
  }

  async loadHistorico(): Promise<void> {
    if (this._historicoLoading()) return;
    this._historicoLoading.set(true);
    try {
      const items: ClaimSummaryDto[] = [];
      let page = 0;
      while (true) {
        const result = await firstValueFrom(
          this.api.antifraudeHistorico({ page, page_size: PAGE_SIZE }),
        );
        items.push(...result.items);
        if (items.length >= result.total || result.items.length === 0) break;
        page += 1;
      }
      this._historico.set(items);
      this._historicoLoaded.set(true);
    } catch (error) {
      this._error.set(toAppError(error));
    } finally {
      this._historicoLoading.set(false);
    }
  }
}
