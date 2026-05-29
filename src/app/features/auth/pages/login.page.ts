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
      border: 1.5px solid var(--mkt-auth-field-border);
      border-radius: 0.75rem;
      background: var(--mkt-auth-field-bg);
      transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;
    }

    .auth-field:focus-within {
      border-color: var(--mkt-accent);
      background: var(--mkt-auth-focus-bg);
      box-shadow: 0 0 0 3px var(--mkt-form-field-focus);
    }

    .auth-field ui-icon {
      color: var(--mkt-accent-ink);
    }

    .auth-glow-button {
      background: var(--mkt-auth-btn-bg);
      color: var(--mkt-auth-btn-ink);
      border: 1px solid var(--mkt-auth-btn-glow-1);
      font-weight: 600;
      box-shadow:
        0 0 0 1px var(--mkt-auth-btn-glow-1),
        0 8px 32px -8px var(--mkt-auth-btn-glow-2);
      transition: transform 200ms ease, box-shadow 200ms ease, filter 200ms ease;
    }

    .auth-glow-button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow:
        0 0 0 1px color-mix(in oklch, var(--mkt-auth-btn-glow-1) 140%, transparent),
        0 14px 38px -6px color-mix(in oklch, var(--mkt-auth-btn-glow-2) 120%, transparent);
    }

    :host-context(html:not(.dark)) .auth-glow-button:hover:not(:disabled) {
      filter: brightness(1.05);
    }

    .auth-demo-card {
      background: var(--mkt-auth-demo-bg);
      border: 1.5px solid var(--mkt-auth-demo-border);
      transition: border-color 220ms ease, background 220ms ease, box-shadow 220ms ease;
    }

    .auth-demo-card:hover {
      border-color: var(--mkt-accent);
      background: var(--mkt-auth-demo-hover-bg);
      box-shadow: 0 8px 24px -16px rgba(15, 23, 42, 0.18);
    }

    :host-context(html.dark) .auth-demo-card:hover {
      box-shadow: none;
    }

    .auth-demo-card--antifraude:hover {
      border-color: #e11d48;
    }

    .auth-divider {
      background: var(--mkt-auth-divider);
    }

    .auth-label {
      color: var(--mkt-auth-label);
    }

    .auth-muted {
      color: var(--mkt-auth-muted);
    }
  `],
  template: `
    <div>
      <div class="mb-6 flex items-center justify-between gap-3">
        <a routerLink="/"
           class="inline-flex items-center gap-1.5 text-[12.5px] text-mkt-ink-2 hover:text-mkt-accent px-2 py-1 -ml-2 rounded-lg hover:bg-mkt-accent-muted transition-colors"
           aria-label="Volver al inicio">
          <ui-icon name="arrow_back" [size]="14" />
          Volver al inicio
        </a>

        <div class="lg:hidden flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg grid place-items-center bg-mkt-accent-muted border border-mkt-accent-border">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
                    stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" class="text-mkt-accent"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7" class="text-mkt-accent"/>
            </svg>
          </span>
          <div class="font-semibold text-[14px] text-mkt-ink">Centinela</div>
        </div>
      </div>

      <div class="text-mkt-accent-ink text-[11px] uppercase tracking-[0.18em] mb-2 font-bold">Iniciar sesión</div>
      <h1 class="text-[26px] sm:text-[28px] font-bold tracking-tight text-mkt-ink m-0 mb-1.5">Bienvenido de vuelta</h1>
      <p class="auth-muted text-[14px] m-0 mb-6 leading-relaxed">
        Abre tu bandeja con correo corporativo o entra directo con una perspectiva demo.
      </p>

      <form (submit)="onSubmit($event)" class="flex flex-col gap-3.5">
        <div>
          <label class="auth-label block text-[11px] uppercase tracking-[0.14em] font-bold mb-1.5">Correo corporativo</label>
          <div class="auth-field">
            <ui-icon name="mail" [size]="16" />
            <input type="email"
                   autocomplete="email"
                   placeholder="analista@demo.com"
                   class="flex-1 bg-transparent border-0 outline-0 text-mkt-ink text-[14px] font-medium min-w-0 placeholder:text-mkt-ink-4"
                   [value]="email()"
                   (input)="email.set($any($event.target).value)"
                   required />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="auth-label block text-[11px] uppercase tracking-[0.14em] font-bold">Contraseña</label>
            <button type="button" class="text-[11px] text-mkt-accent-ink hover:text-mkt-accent font-semibold">¿Olvidaste tu clave?</button>
          </div>
          <div class="auth-field">
            <ui-icon name="lock" [size]="16" />
            <input [type]="showPassword() ? 'text' : 'password'"
                   autocomplete="current-password"
                   placeholder="••••••••"
                   class="flex-1 bg-transparent border-0 outline-0 text-mkt-ink text-[14px] font-medium min-w-0 placeholder:text-mkt-ink-4"
                   [value]="password()"
                   (input)="password.set($any($event.target).value)"
                   required />
            <button type="button"
                    class="text-mkt-ink-4 hover:text-mkt-ink-2"
                    (click)="showPassword.set(!showPassword())"
                    [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <ui-icon [name]="showPassword() ? 'visibility_off' : 'visibility'" [size]="16" />
            </button>
          </div>
        </div>

        <label class="flex items-center gap-2 text-[12.5px] auth-muted font-medium cursor-pointer select-none">
          <input type="checkbox" class="accent-mkt-accent rounded" [checked]="remember()" (change)="remember.set($any($event.target).checked)" />
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
                class="auth-glow-button inline-flex items-center justify-center gap-2 w-full text-[14px] px-5 py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed">
          <ui-icon name="login" [size]="14" />
          {{ auth.loading() ? 'Verificando…' : 'Iniciar sesión' }}
        </button>

        <div class="flex items-center gap-2 my-1">
          <div class="flex-1 h-px auth-divider"></div>
          <span class="text-[10px] auth-muted uppercase tracking-[0.14em] font-semibold">Demo · elige perspectiva</span>
          <div class="flex-1 h-px auth-divider"></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button type="button"
                  class="auth-demo-card flex items-center gap-2.5 text-left px-3 py-3 rounded-xl"
                  (click)="onDemo('analista')">
            <span class="w-8 h-8 rounded-full shrink-0 grid place-items-center bg-mkt-accent-muted border border-mkt-accent-border text-mkt-accent">
              <ui-icon name="badge" [size]="15" />
            </span>
            <span class="flex-1 leading-tight min-w-0">
              <span class="block text-[13px] font-semibold text-mkt-ink">Analista de siniestros</span>
              <span class="block text-[11px] auth-muted mt-0.5 truncate">Ana Lema · triaje</span>
            </span>
          </button>

          <button type="button"
                  class="auth-demo-card auth-demo-card--antifraude flex items-center gap-2.5 text-left px-3 py-3 rounded-xl"
                  (click)="onDemo('antifraude')">
            <span class="w-8 h-8 rounded-full shrink-0 grid place-items-center bg-rose-400/12 border border-rose-400/30 text-rose-500 dark:text-rose-200">
              <ui-icon name="shield_person" [size]="15" />
            </span>
            <span class="flex-1 leading-tight min-w-0">
              <span class="block text-[13px] font-semibold text-mkt-ink">Especialista antifraude</span>
              <span class="block text-[11px] auth-muted mt-0.5 truncate">Lucía Vélez · dictamen</span>
            </span>
          </button>
        </div>

        <p class="text-[11px] auth-muted text-center mt-0.5">
          Puedes cambiar de perspectiva desde el panel lateral.
        </p>
      </form>

      <p class="text-[11px] auth-muted mt-5 leading-relaxed">
        Prototipo Centinela — autenticación JWT local. Credenciales demo en
        <code class="font-mono text-mkt-ink-3 bg-mkt-auth-field-bg px-1 py-0.5 rounded">AUTH_SEED_USERS</code> del backend.
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
