import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { RulesApi, type RuleChangeDto } from '@core/api/clients/rules.api';
import { AuthStore } from '@core/auth/auth.store';
import { AppError } from '@core/errors/app-error';
import type { RuleChange } from '../models/rule-change.model';

function formatTs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dtoToChange(dto: RuleChangeDto): RuleChange {
  return {
    id: dto.id,
    ts: formatTs(dto.ts),
    actor: dto.actor,
    ruleCode: dto.rule_code,
    ruleName: dto.rule_name,
    kind: dto.kind,
    summary: dto.summary,
    before: dto.before_value ?? undefined,
    after: dto.after_value ?? undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class RuleChangesStore {
  private readonly api = inject(RulesApi);
  private readonly auth = inject(AuthStore);

  private readonly _changes = signal<RuleChange[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<AppError | null>(null);

  readonly changes = this._changes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  private lastUserId: string | null = null;

  constructor() {
    effect(() => {
      const userId = this.auth.user()?.id ?? null;
      if (userId === this.lastUserId) return;
      this.lastUserId = userId;
      if (userId) {
        void this.loadList();
      } else {
        this._changes.set([]);
      }
    });
  }

  async loadList(): Promise<void> {
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const dtos = await firstValueFrom(this.api.listChanges());
      this._changes.set(dtos.map(dtoToChange));
    } catch (err) {
      this._error.set(err instanceof AppError ? err : new AppError('unknown', String(err)));
    } finally {
      this._loading.set(false);
    }
  }
}
