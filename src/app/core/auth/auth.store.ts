import { Injectable, computed, signal } from '@angular/core';

import { AppError } from '../errors/app-error';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly userIdSignal = signal<string | null>(null);
  private readonly errorSignal = signal<AppError | null>(null);

  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly userId = this.userIdSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.accessTokenSignal() !== null);

  setSession(token: string, userId: string): void {
    this.accessTokenSignal.set(token);
    this.userIdSignal.set(userId);
    this.errorSignal.set(null);
  }

  clearSession(): void {
    this.accessTokenSignal.set(null);
    this.userIdSignal.set(null);
  }

  setError(error: AppError): void {
    this.errorSignal.set(error);
  }
}
