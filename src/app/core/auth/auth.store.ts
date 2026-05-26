import { Injectable, computed, effect, signal } from '@angular/core';

import { initials } from '../../shared/utils';
import { AppError } from '../errors/app-error';
import type { AuthUser } from './auth-user.model';

const STORAGE_KEY = 'centinela:session';

interface StoredSession {
  user: AuthUser;
  token: string;
}

function readStored(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function nameToProfile(email: string): AuthUser {
  const local = email.split('@')[0] ?? 'analista';
  const pretty =
    local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Analista Demo';
  return {
    id: `usr_${local}`,
    name: pretty,
    email,
    role: 'Analista antifraude',
    sucursal: 'Quito Norte',
    initials: initials(pretty),
  };
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly stored = readStored();

  private readonly _user = signal<AuthUser | null>(this.stored?.user ?? null);
  private readonly _token = signal<string | null>(this.stored?.token ?? null);
  private readonly _error = signal<AppError | null>(null);

  readonly user = this._user.asReadonly();
  readonly accessToken = this._token.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);

  constructor() {
    effect(() => {
      if (typeof window === 'undefined') return;
      const u = this._user();
      const t = this._token();
      try {
        if (u && t) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, token: t }));
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // storage unavailable — ignore
      }
    });
  }

  loginMock(email: string, password: string): boolean {
    if (!email.includes('@') || password.length < 4) {
      this._error.set(
        new AppError('auth/invalid', 'Ingresa un correo válido y al menos 4 caracteres de clave.'),
      );
      return false;
    }
    this._user.set(nameToProfile(email));
    this._token.set(`mock_${Date.now()}`);
    this._error.set(null);
    return true;
  }

  loginDemo(): void {
    this._user.set({
      id: 'usr_lucia',
      name: 'Lucía Vélez',
      email: 'lucia.velez@aseguradorasur.ec',
      role: 'Analista antifraude',
      sucursal: 'Quito Norte',
      initials: 'LV',
    });
    this._token.set(`mock_demo_${Date.now()}`);
    this._error.set(null);
  }

  logout(): void {
    this._user.set(null);
    this._token.set(null);
  }

  clearError(): void {
    this._error.set(null);
  }
}
