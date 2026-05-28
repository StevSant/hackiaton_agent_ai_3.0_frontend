import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthApi, type LoginUserPayload } from '../api/clients/auth.api';
import { environment } from '../config/env';
import { AppError } from '../errors/app-error';
import { initials } from '@shared/utils';
import type { AuthUser, RoleCode } from './auth-user.model';

// Bumped key invalidates pre-real-auth mock sessions so stale "mock_*" tokens
// don't end up in Authorization headers after this rollout.
const STORAGE_KEY = 'centinela:session:v2';

interface StoredSession {
  user: AuthUser;
  token: string;
}

const ROLE_LABEL: Record<RoleCode, string> = {
  analista: 'Analista de siniestros',
  antifraude: 'Analista antifraude',
};

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

function toAuthUser(payload: LoginUserPayload): AuthUser {
  const local = payload.email.split('@')[0] ?? 'usuario';
  return {
    id: `usr_${local}`,
    name: payload.full_name,
    email: payload.email,
    role: ROLE_LABEL[payload.role],
    roleCode: payload.role,
    sucursal: 'Quito Norte',
    initials: initials(payload.full_name),
  };
}

function mapHttpError(e: unknown): AppError {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 401) {
      return new AppError('auth/invalid', 'Credenciales inválidas.', 401);
    }
    if (e.status === 0) {
      return new AppError(
        'auth/offline',
        'No se pudo contactar al backend. Verifica que esté corriendo en ' +
          `${environment.backendUrl}.`,
        0,
      );
    }
    const detail =
      typeof e.error === 'object' && e.error !== null && 'message' in e.error
        ? String((e.error as { message: unknown }).message)
        : 'Error al iniciar sesión.';
    return new AppError('auth/error', detail, e.status);
  }
  if (e instanceof AppError) return e;
  return new AppError('auth/unknown', 'Error desconocido al iniciar sesión.');
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApi);
  private readonly stored = readStored();

  private readonly _user = signal<AuthUser | null>(this.stored?.user ?? null);
  private readonly _token = signal<string | null>(this.stored?.token ?? null);
  private readonly _error = signal<AppError | null>(null);
  private readonly _loading = signal<boolean>(false);

  readonly user = this._user.asReadonly();
  readonly accessToken = this._token.asReadonly();
  readonly error = this._error.asReadonly();
  readonly loading = this._loading.asReadonly();
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

  async login(email: string, password: string): Promise<boolean> {
    this._error.set(null);
    this._loading.set(true);
    try {
      const res = await firstValueFrom(this.api.login({ email, password }));
      this._user.set(toAuthUser(res.user));
      this._token.set(res.access_token);
      return true;
    } catch (e) {
      this._error.set(mapHttpError(e));
      this._user.set(null);
      this._token.set(null);
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Demo helper: logs in as the seeded persona for *roleCode*. Credentials
   * come from environment.demoCredentials (which mirrors AUTH_SEED_USERS in
   * the backend .env) so the demo button exercises the real auth flow.
   */
  loginAsDemo(roleCode: RoleCode): Promise<boolean> {
    const creds = environment.demoCredentials[roleCode];
    return this.login(creds.email, creds.password);
  }

  /**
   * Sidebar "switch perspective" action: logs out the current session and
   * re-authenticates as the other demo persona so the JWT actually carries
   * the displayed role (otherwise role-gated calls would 403).
   */
  switchRole(roleCode: RoleCode): Promise<boolean> {
    return this.loginAsDemo(roleCode);
  }

  logout(): void {
    this._user.set(null);
    this._token.set(null);
  }

  /**
   * Called by the error interceptor when a protected request comes back 401:
   * clears the session like logout() but leaves an error message so the login
   * page tells the user *why* they got bounced.
   */
  expireSession(): void {
    this._user.set(null);
    this._token.set(null);
    this._error.set(
      new AppError('auth/expired', 'Sesión expirada — vuelve a iniciar sesión.', 401),
    );
  }

  clearError(): void {
    this._error.set(null);
  }
}
