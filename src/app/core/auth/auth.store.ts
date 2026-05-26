import { Injectable, computed, effect, signal } from '@angular/core';

import { initials } from '../../shared/utils';
import { AppError } from '../errors/app-error';
import type { AuthUser, RoleCode } from './auth-user.model';

const STORAGE_KEY = 'centinela:session';

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
    const parsed = JSON.parse(raw) as StoredSession;
    // Backfill roleCode for sessions stored before the typed role was introduced.
    if (parsed.user && !parsed.user.roleCode) {
      parsed.user.roleCode = inferRoleFromEmail(parsed.user.email);
    }
    return parsed;
  } catch {
    return null;
  }
}

function inferRoleFromEmail(email: string): RoleCode {
  return email.toLowerCase().startsWith('lucia') || email.toLowerCase().includes('antifraude')
    ? 'antifraude'
    : 'analista';
}

function nameToProfile(email: string): AuthUser {
  const local = email.split('@')[0] ?? 'analista';
  const pretty =
    local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Analista Demo';
  const roleCode = inferRoleFromEmail(email);
  return {
    id: `usr_${local}`,
    name: pretty,
    email,
    role: ROLE_LABEL[roleCode],
    roleCode,
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
    this.loginDemoAs('antifraude');
  }

  /**
   * Mockup helper: drops the chosen demo persona into the session so the
   * presenter can pick a role from the login screen.
   * - analista  → Ana Lema  (sees /claims default landing)
   * - antifraude → Lucía Vélez (sees /antifraude/bandeja default landing)
   */
  loginDemoAs(roleCode: RoleCode): void {
    const user: AuthUser =
      roleCode === 'antifraude'
        ? {
            id: 'usr_lucia',
            name: 'Lucía Vélez',
            email: 'lucia.velez@aseguradorasur.ec',
            role: ROLE_LABEL.antifraude,
            roleCode: 'antifraude',
            sucursal: 'Quito Norte',
            initials: 'LV',
          }
        : {
            id: 'usr_ana',
            name: 'Ana Lema',
            email: 'ana.lema@aseguradorasur.ec',
            role: ROLE_LABEL.analista,
            roleCode: 'analista',
            sucursal: 'Quito Norte',
            initials: 'AL',
          };
    this._user.set(user);
    this._token.set(`mock_demo_${Date.now()}`);
    this._error.set(null);
  }

  /**
   * Mockup-only: flips the current user's role without re-login. Lets the demo
   * choreography exercise both perspectives quickly. Real auth replaces this
   * with role-aware login + role.guard.
   */
  switchRole(roleCode: RoleCode): void {
    const u = this._user();
    if (!u) return;
    if (u.roleCode === roleCode) return;
    const next: AuthUser =
      roleCode === 'antifraude'
        ? {
            id: 'usr_lucia',
            name: 'Lucía Vélez',
            email: 'lucia.velez@aseguradorasur.ec',
            role: ROLE_LABEL.antifraude,
            roleCode: 'antifraude',
            sucursal: 'Quito Norte',
            initials: 'LV',
          }
        : {
            id: 'usr_ana',
            name: 'Ana Lema',
            email: 'ana.lema@aseguradorasur.ec',
            role: ROLE_LABEL.analista,
            roleCode: 'analista',
            sucursal: 'Quito Norte',
            initials: 'AL',
          };
    this._user.set(next);
  }

  logout(): void {
    this._user.set(null);
    this._token.set(null);
  }

  clearError(): void {
    this._error.set(null);
  }
}
