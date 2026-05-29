import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { environment } from '@core/config/env';
import { Icon } from '@shared/ui/icon';
import { AuthStore } from '@core/auth/auth.store';
import type { RoleCode } from '@core/auth/auth-user.model';
import { ClaimsStore } from '@core/state/claims.store';
import { RulesStore } from '@features/alerts/services/rules.store';

@Component({
  selector: 'page-login',
  standalone: true,
  imports: [Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .auth-field {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.75rem 0.875rem;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 0.75rem;
      background: rgba(51, 65, 85, 0.45);
      transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;
    }

    .auth-field:focus-within {
      border-color: rgba(103, 232, 249, 0.55);
      background: rgba(51, 65, 85, 0.62);
      box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.14);
    }

    .auth-field ui-icon {
      color: rgba(103, 232, 249, 0.75);
    }

    .auth-glow-button {
      box-shadow:
        0 0 0 1px rgba(34, 211, 238, 0.4),
        0 8px 32px -8px rgba(34, 211, 238, 0.45);
      transition: transform 200ms ease, box-shadow 200ms ease;
    }

    .auth-glow-button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow:
        0 0 0 1px rgba(34, 211, 238, 0.55),
        0 14px 38px -6px rgba(34, 211, 238, 0.55);
    }

    .auth-demo-card {
      background: rgba(51, 65, 85, 0.38);
      border: 1px solid rgba(148, 163, 184, 0.22);
      transition: border-color 220ms ease, background 220ms ease;
    }

    .auth-demo-card:hover {
      border-color: rgba(103, 232, 249, 0.4);
      background: rgba(51, 65, 85, 0.58);
    }

    .auth-demo-card--antifraude:hover {
      border-color: rgba(251, 113, 133, 0.35);
    }
  `],
  template: `
    <div>
      <div class="mb-6 flex items-center justify-between gap-3">
        <a routerLink="/"
           class="inline-flex items-center gap-1.5 text-[12.5px] text-slate-300 hover:text-cyan-200 px-2 py-1 -ml-2 rounded-lg hover:bg-slate-600/30 transition-colors"
           aria-label="Volver al inicio">
          <ui-icon name="arrow_back" [size]="14" />
          Volver al inicio
        </a>

        <div class="lg:hidden flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg grid place-items-center bg-cyan-400/12 border border-cyan-400/35">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
                    stroke="#67e8f9" stroke-width="1.7" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="#67e8f9" stroke-width="1.7"/>
            </svg>
          </span>
          <div class="font-semibold text-[14px] text-white">Centinela</div>
        </div>
      </div>

      <div class="text-cyan-300/80 text-[11px] uppercase tracking-[0.18em] mb-2">Iniciar sesión</div>
      <h1 class="text-[26px] sm:text-[28px] font-semibold tracking-tight text-white m-0 mb-1.5">Bienvenido de vuelta</h1>
      <p class="text-slate-300 text-[14px] m-0 mb-6 leading-relaxed">
        Abre tu bandeja con correo corporativo o entra directo con una perspectiva demo.
      </p>

      <form (submit)="onSubmit($event)" class="flex flex-col gap-3.5">
        <div>
          <label class="block text-[11px] text-slate-300 uppercase tracking-[0.14em] font-medium mb-1.5">Correo corporativo</label>
          <div class="auth-field">
            <ui-icon name="mail" [size]="16" />
            <input type="email"
                   autocomplete="email"
                   placeholder="analista@demo.com"
                   class="flex-1 bg-transparent border-0 outline-0 text-slate-100 text-[14px] min-w-0 placeholder:text-slate-500"
                   [value]="email()"
                   (input)="email.set($any($event.target).value)"
                   required />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-[11px] text-slate-300 uppercase tracking-[0.14em] font-medium">Contraseña</label>
            <button type="button" class="text-[11px] text-cyan-300/80 hover:text-cyan-200">¿Olvidaste tu clave?</button>
          </div>
          <div class="auth-field">
            <ui-icon name="lock" [size]="16" />
            <input [type]="showPassword() ? 'text' : 'password'"
                   autocomplete="current-password"
                   placeholder="••••••••"
                   class="flex-1 bg-transparent border-0 outline-0 text-slate-100 text-[14px] min-w-0 placeholder:text-slate-500"
                   [value]="password()"
                   (input)="password.set($any($event.target).value)"
                   required />
            <button type="button"
                    class="text-slate-500 hover:text-slate-300"
                    (click)="showPassword.set(!showPassword())"
                    [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <ui-icon [name]="showPassword() ? 'visibility_off' : 'visibility'" [size]="16" />
            </button>
          </div>
        </div>

        <label class="flex items-center gap-2 text-[12.5px] text-slate-300 cursor-pointer select-none">
          <input type="checkbox" class="accent-cyan-400 rounded" [checked]="remember()" (change)="remember.set($any($event.target).checked)" />
          Mantener sesión en este dispositivo
        </label>

        @if (auth.error(); as err) {
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-tier-red-soft/80 text-tier-red-ink text-[12.5px] border border-tier-red-ink/20">
            <ui-icon name="error" [size]="14" />
            {{ err.message }}
          </div>
        }

        <button type="submit"
                [disabled]="auth.loading()"
                class="auth-glow-button inline-flex items-center justify-center gap-2 w-full text-[14px] font-medium text-[#05070d] bg-cyan-300 px-5 py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed">
          <ui-icon name="login" [size]="14" />
          {{ auth.loading() ? 'Verificando…' : 'Iniciar sesión' }}
        </button>

        <div class="flex items-center gap-2 my-1">
          <div class="flex-1 h-px bg-slate-700/60"></div>
          <span class="text-[10px] text-slate-400 uppercase tracking-[0.14em]">Demo · elige perspectiva</span>
          <div class="flex-1 h-px bg-slate-700/60"></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button type="button"
                  class="auth-demo-card flex items-center gap-2.5 text-left px-3 py-3 rounded-xl"
                  (click)="onDemo('analista')">
            <span class="w-8 h-8 rounded-full shrink-0 grid place-items-center bg-cyan-400/12 border border-cyan-400/30 text-cyan-200">
              <ui-icon name="badge" [size]="15" />
            </span>
            <span class="flex-1 leading-tight min-w-0">
              <span class="block text-[13px] font-medium text-white">Analista de siniestros</span>
              <span class="block text-[11px] text-slate-300 mt-0.5 truncate">Ana Lema · triaje</span>
            </span>
          </button>

          <button type="button"
                  class="auth-demo-card auth-demo-card--antifraude flex items-center gap-2.5 text-left px-3 py-3 rounded-xl"
                  (click)="onDemo('antifraude')">
            <span class="w-8 h-8 rounded-full shrink-0 grid place-items-center bg-rose-400/12 border border-rose-400/30 text-rose-200">
              <ui-icon name="shield_person" [size]="15" />
            </span>
            <span class="flex-1 leading-tight min-w-0">
              <span class="block text-[13px] font-medium text-white">Especialista antifraude</span>
              <span class="block text-[11px] text-slate-300 mt-0.5 truncate">Lucía Vélez · dictamen</span>
            </span>
          </button>
        </div>

        <p class="text-[11px] text-slate-400 text-center mt-0.5">
          Puedes cambiar de perspectiva desde el panel lateral.
        </p>
      </form>

      <p class="text-[11px] text-slate-400 mt-5 leading-relaxed">
        Prototipo Centinela — autenticación JWT local. Credenciales demo en
        <code class="font-mono text-slate-400">AUTH_SEED_USERS</code> del backend.
      </p>
    </div>
  `,
})
export class LoginPage {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly claims = inject(ClaimsStore);
  private readonly rules = inject(RulesStore);

  protected readonly email = signal<string>(environment.demoCredentials.analista.email);
  protected readonly password = signal<string>(environment.demoCredentials.analista.password);
  protected readonly showPassword = signal<boolean>(false);
  protected readonly remember = signal<boolean>(true);

  private prefetchAfterLogin(): void {
    void this.claims.loadList().catch(() => undefined);
    void this.rules.loadList().catch(() => undefined);
  }

  protected async onSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const ok = await this.auth.login(this.email(), this.password());
    if (!ok) return;
    this.prefetchAfterLogin();
    const landing = this.auth.user()?.roleCode === 'antifraude' ? '/antifraude/bandeja' : '/claims';
    void this.router.navigateByUrl(landing);
  }

  protected async onDemo(role: RoleCode): Promise<void> {
    const creds = environment.demoCredentials[role];
    this.email.set(creds.email);
    this.password.set(creds.password);
    const ok = await this.auth.login(creds.email, creds.password);
    if (!ok) return;
    this.prefetchAfterLogin();
    const landing = role === 'antifraude' ? '/antifraude/bandeja' : '/claims';
    void this.router.navigateByUrl(landing);
  }
}
