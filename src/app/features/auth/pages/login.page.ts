import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'page-login',
  standalone: true,
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <div class="mb-6 lg:hidden flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-md grid place-items-center text-white" style="background: linear-gradient(135deg, var(--brand), var(--brand-2));">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3z" stroke="white" stroke-width="1.8" stroke-linejoin="round" />
            <path d="M9 12.5 11 14.5 15 10.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="font-semibold text-[15px]">Centinela</div>
      </div>

      <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1.5">Bienvenido de vuelta</h1>
      <p class="text-ink-3 text-[13.5px] m-0 mb-6">
        Ingresa con tu correo corporativo de Aseguradora del Sur para abrir tu bandeja.
      </p>

      <form (submit)="onSubmit($event)" class="flex flex-col gap-3.5">
        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">Correo corporativo</label>
          <div class="flex items-center gap-2 bg-surface border border-line rounded-sm px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft">
            <ui-icon name="mail" [size]="16" />
            <input
              type="email"
              autocomplete="email"
              placeholder="lucia.velez@aseguradorasur.ec"
              class="flex-1 bg-transparent border-0 outline-0 text-ink text-[13.5px] min-w-0"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
              required
            />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium">Contraseña</label>
            <button type="button" class="text-[11.5px] text-brand-ink hover:underline">¿Olvidaste tu clave?</button>
          </div>
          <div class="flex items-center gap-2 bg-surface border border-line rounded-sm px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft">
            <ui-icon name="lock" [size]="16" />
            <input
              [type]="showPassword() ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••"
              class="flex-1 bg-transparent border-0 outline-0 text-ink text-[13.5px] min-w-0"
              [value]="password()"
              (input)="password.set($any($event.target).value)"
              required
            />
            <button
              type="button"
              class="text-ink-3 hover:text-ink"
              (click)="showPassword.set(!showPassword())"
              [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            >
              <ui-icon [name]="showPassword() ? 'visibility_off' : 'visibility'" [size]="16" />
            </button>
          </div>
        </div>

        <label class="flex items-center gap-2 text-[12.5px] text-ink-2 cursor-pointer select-none">
          <input type="checkbox" class="accent-[var(--brand)]" [checked]="remember()" (change)="remember.set($any($event.target).checked)" />
          Mantener sesión iniciada en este dispositivo
        </label>

        @if (auth.error(); as err) {
          <div class="flex items-center gap-2 px-3 py-2 rounded-sm bg-tier-red-soft text-tier-red-ink text-[12.5px]">
            <ui-icon name="error" [size]="14" />
            {{ err.message }}
          </div>
        }

        <ui-button variant="primary" type="submit">
          <ui-icon name="login" [size]="14" />
          Iniciar sesión
        </ui-button>

        <div class="flex items-center gap-2 my-1.5">
          <div class="flex-1 h-px bg-line"></div>
          <span class="text-[11px] text-ink-4 uppercase tracking-wider">o</span>
          <div class="flex-1 h-px bg-line"></div>
        </div>

        <button type="button" class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-[13px] border border-line bg-surface hover:bg-hover" (click)="onDemo()">
          <ui-icon name="auto_awesome" [size]="14" [fill]="true" />
          Entrar como analista demo (Lucía Vélez)
        </button>
      </form>

      <p class="text-[11.5px] text-ink-3 mt-5 leading-relaxed">
        Esta es una demo del prototipo Centinela. La autenticación está mockeada: cualquier correo válido y una clave de 4+ caracteres te permite entrar.
        En producción se integrará con Supabase Auth + SSO corporativo.
      </p>
    </div>
  `,
})
export class LoginPage {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly email = signal<string>('lucia.velez@aseguradorasur.ec');
  protected readonly password = signal<string>('demo1234');
  protected readonly showPassword = signal<boolean>(false);
  protected readonly remember = signal<boolean>(true);

  protected onSubmit(e: Event): void {
    e.preventDefault();
    const ok = this.auth.loginMock(this.email(), this.password());
    if (ok) void this.router.navigateByUrl('/claims');
  }

  protected onDemo(): void {
    this.auth.loginDemo();
    void this.router.navigateByUrl('/claims');
  }
}
