import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Icon } from '../../../shared/ui/icon';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'page-login',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-login-panel">
      <div class="mb-6 lg:hidden -mx-2 overflow-hidden rounded-lg">
        <img
          src="/assets/auth/centinela-hero.png"
          alt="Centinela — inteligencia antifraude"
          class="w-full aspect-[4/3] object-cover object-center"
          width="1024"
          height="1024"
          loading="eager"
        />
      </div>

      <h1 class="text-[28px] font-semibold tracking-tight m-0 mb-2 text-ink">Iniciar sesión</h1>
      <p class="text-ink-3 text-[14px] m-0 mb-8 leading-relaxed">
        Ingresa tus credenciales corporativas para continuar.
      </p>

      <form (submit)="onSubmit($event)" class="flex flex-col gap-5">
        <div>
          <label class="auth-field-label" for="login-email">Email corporativo</label>
          <div class="auth-field">
            <ui-icon name="mail" [size]="18" class="text-ink-3 shrink-0" />
            <input
              id="login-email"
              type="email"
              autocomplete="email"
              placeholder="nombre@empresa.com"
              class="auth-field-input"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
              required
            />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between gap-3 mb-2">
            <label class="auth-field-label m-0" for="login-password">Contraseña</label>
            <button type="button" class="auth-link-button">¿Olvidé mi clave?</button>
          </div>
          <div class="auth-field">
            <ui-icon name="lock" [size]="18" class="text-ink-3 shrink-0" />
            <input
              id="login-password"
              [type]="showPassword() ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••"
              class="auth-field-input"
              [value]="password()"
              (input)="password.set($any($event.target).value)"
              required
            />
            <button
              type="button"
              class="text-ink-3 hover:text-ink shrink-0"
              (click)="showPassword.set(!showPassword())"
              [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            >
              <ui-icon [name]="showPassword() ? 'visibility_off' : 'visibility'" [size]="18" />
            </button>
          </div>
        </div>

        <label class="flex items-center gap-2.5 text-[13px] text-ink-2 cursor-pointer select-none">
          <input
            type="checkbox"
            class="auth-checkbox"
            [checked]="remember()"
            (change)="remember.set($any($event.target).checked)"
          />
          Mantener sesión iniciada
        </label>

        @if (auth.error(); as err) {
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-md bg-tier-red-soft text-tier-red-ink text-[12.5px]">
            <ui-icon name="error" [size]="16" />
            {{ err.message }}
          </div>
        }

        <button type="submit" class="auth-primary-button" [disabled]="auth.loading()">
          @if (auth.loading()) {
            <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            Entrando…
          } @else {
            Acceder al entorno
            <ui-icon name="arrow_forward" [size]="18" />
          }
        </button>

        <div class="auth-divider">
          <span>Acceso rápido de prueba</span>
        </div>

        <div class="flex flex-col gap-2.5">
          <button type="button" class="auth-demo-button" (click)="onDemo('analista')">
            <ui-icon name="badge" [size]="18" />
            Analista de siniestros
          </button>
          <button type="button" class="auth-demo-button" (click)="onDemo('antifraude')">
            <ui-icon name="shield_person" [size]="18" />
            Analista antifraude
          </button>
        </div>
      </form>

      <div class="auth-security-notice mt-8">
        <ui-icon name="verified_user" [size]="18" class="text-ink-3 shrink-0 mt-0.5" />
        <p class="m-0">
          Sistema restringido. El acceso no autorizado está estrictamente prohibido y monitoreado.
          Protegido por encriptación de grado institucional.
        </p>
      </div>
    </div>
  `,
})
export class LoginPage {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly email = signal<string>('analista@demo.com');
  protected readonly password = signal<string>('Demo.Analista2026');
  protected readonly showPassword = signal<boolean>(false);
  protected readonly remember = signal<boolean>(true);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const loginSucceeded = await this.auth.login(this.email(), this.password());
    if (!loginSucceeded) return;
    this.navigateAfterLogin();
  }

  protected async onDemo(role: 'analista' | 'antifraude'): Promise<void> {
    this.auth.loginDemoAs(role);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    this.navigateAfterLogin();
  }

  private navigateAfterLogin(): void {
    const landingRoute =
      this.auth.user()?.roleCode === 'antifraude' ? '/antifraude/bandeja' : '/claims';
    void this.router.navigateByUrl(landingRoute);
  }
}
