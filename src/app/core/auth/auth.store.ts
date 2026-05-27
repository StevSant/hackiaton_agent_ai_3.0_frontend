import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { initials } from '../../shared/utils';
import { AppError } from '../errors/app-error';
import { environment } from '../config/env';
import type { AuthUser, RoleCode } from './auth-user.model';

const STORAGE_KEY = 'centinela:session';

interface StoredSession {
  user: AuthUser;
  token: string;
}

interface LoginApiResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
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
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed.user && !parsed.user.roleCode) {
      parsed.user.roleCode = inferRoleCode(parsed.user.role);
    }
    return parsed;
  } catch {
    return null;
  }
}

function inferRoleCode(roleOrEmail: string): RoleCode {
  const lower = roleOrEmail.toLowerCase();
  return lower === 'antifraude' || lower.includes('antifraude') ? 'antifraude' : 'analista';
}

function apiResponseToUser(res: LoginApiResponse): AuthUser {
  const roleCode = inferRoleCode(res.role);
  return {
    id: res.user_id,
    name: res.full_name,
    email: res.email,
    role: ROLE_LABEL[roleCode],
    roleCode,
    sucursal: 'Quito Norte',
    initials: initials(res.full_name),
  };
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);
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
    if (!email.includes('@') || password.length < 4) {
      this._error.set(
        new AppError('auth/invalid', 'Ingresa un correo válido y al menos 4 caracteres de clave.'),
      );
      return false;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const res = await firstValueFrom(
        this.http.post<LoginApiResponse>(
          `${environment.backendUrl}${environment.apiPrefix}/auth/login`,
          { email, password },
        ),
      );
      this._user.set(apiResponseToUser(res));
      this._token.set(res.access_token);
      return true;
    } catch (err: unknown) {
      const message =
        (err as { error?: { detail?: string } })?.error?.detail ??
        'Error al iniciar sesión. Intenta de nuevo.';
      this._error.set(new AppError('auth/failed', message));
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  /** Kept for demo quick-access buttons — uses real backend credentials */
  loginDemoAs(roleCode: RoleCode): void {
    const credentials: Record<RoleCode, { email: string; password: string; name: string }> = {
      analista: { email: 'analista@demo.com', password: 'Demo.Analista2026', name: 'Ana Lema' },
      antifraude: { email: 'antifraude@demo.com', password: 'Demo.Antifraude2026', name: 'Lucia Velez' },
    };
    const cred = credentials[roleCode];
    void this.login(cred.email, cred.password);
  }

  loginDemo(): void {
    this.loginDemoAs('antifraude');
  }

  switchRole(roleCode: RoleCode): void {
    const u = this._user();
    if (!u || u.roleCode === roleCode) return;
    this.loginDemoAs(roleCode);
  }

  logout(): void {
    this._user.set(null);
    this._token.set(null);
  }

  clearError(): void {
    this._error.set(null);
  }
}
