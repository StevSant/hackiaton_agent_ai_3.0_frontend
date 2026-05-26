import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Icon } from '../../../shared/ui/icon';
import { AuthStore } from '../../../core/auth/auth.store';
import { ThemeStore } from '../../../core/theme/theme.store';

@Component({
  selector: 'page-settings',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="py-2 pb-6">
      <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Configuración</h1>
      <p class="text-ink-3 text-[13.5px] m-0">
        Ajustes de tu cuenta de analista y preferencias de la interfaz.
      </p>
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1 max-w-2xl">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <h3 class="text-[13px] font-semibold m-0">Apariencia</h3>
      </div>
      <div class="px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <div class="text-[13.5px] font-medium">Modo oscuro</div>
          <div class="text-[12.5px] text-ink-3 mt-0.5">
            Cambia los colores de la interfaz para sesiones largas o luz baja.
          </div>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-[13px] bg-soft border border-line text-ink hover:bg-hover"
          (click)="theme.toggle()"
        >
          <ui-icon [name]="theme.dark() ? 'light_mode' : 'dark_mode'" [size]="14" />
          {{ theme.dark() ? 'Cambiar a claro' : 'Cambiar a oscuro' }}
        </button>
      </div>
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1 max-w-2xl mt-5">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <h3 class="text-[13px] font-semibold m-0">Cuenta</h3>
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-tier-green-soft text-tier-green-ink">
          <span class="w-1.5 h-1.5 rounded-full" style="background: var(--tier-green)"></span>
          Sesión activa
        </span>
      </div>
      <div class="px-5 py-5 flex items-center gap-4 border-b border-line">
        <div
          class="w-12 h-12 rounded-full grid place-items-center font-semibold text-[16px] text-white"
          style="background: linear-gradient(135deg, oklch(0.55 0.16 30), oklch(0.5 0.18 350));"
        >
          {{ user()?.initials ?? '··' }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-[14px]">{{ user()?.name ?? 'Sin sesión' }}</div>
          <div class="text-[12.5px] text-ink-3">{{ user()?.email ?? '—' }}</div>
        </div>
      </div>
      <div class="px-5 py-5 grid grid-cols-2 gap-y-3.5 gap-x-6">
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Rol</div>
          <div class="text-[13.5px] font-medium">{{ user()?.role ?? '—' }}</div>
        </div>
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Sucursal</div>
          <div class="text-[13.5px] font-medium">{{ user()?.sucursal ?? '—' }}</div>
        </div>
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">ID interno</div>
          <div class="text-[13.5px] font-medium font-mono">{{ user()?.id ?? '—' }}</div>
        </div>
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Sesión</div>
          <div class="text-[13.5px] font-medium font-mono">{{ sessionLabel() }}</div>
        </div>
      </div>
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1 max-w-2xl mt-5">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <h3 class="text-[13px] font-semibold m-0">Sesión</h3>
      </div>
      <div class="px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <div class="text-[13.5px] font-medium">Cerrar sesión</div>
          <div class="text-[12.5px] text-ink-3 mt-0.5">
            Volverás a la pantalla de inicio. Tu bandeja queda intacta.
          </div>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-[13px] bg-tier-red-soft text-tier-red-ink hover:opacity-80"
          (click)="onLogout()"
        >
          <ui-icon name="logout" [size]="14" />
          Cerrar sesión
        </button>
      </div>
    </div>
  `,
})
export class SettingsPage {
  protected readonly theme = inject(ThemeStore);
  protected readonly user = inject(AuthStore).user;
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly sessionLabel = computed(() => (this.user() ? 'demo · prototipo' : '—'));

  protected onLogout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }
}
