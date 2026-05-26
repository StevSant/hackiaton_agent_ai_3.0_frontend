import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { BrandLogo } from '../shared/ui/brand-logo';
import { Icon } from '../shared/ui/icon';
import { ThemeStore } from '../core/theme/theme.store';
import { AuthStore } from '../core/auth/auth.store';
import { ClaimsStore } from '../features/claims/services/claims.store';
import { ProvidersStore } from '../features/network/services/providers.store';

interface NavItem {
  link: string;
  label: string;
  icon: string;
  badge?: string;
  count?: number;
}

@Component({
  selector: 'app-sidebar-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, BrandLogo, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="bg-canvas border-r border-line h-full overflow-y-auto scroll-pretty flex flex-col gap-1 px-3.5 pt-4 pb-2"
    >
      <ui-brand-logo />

      <div class="text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-4 px-2 pt-3 pb-1.5">Bandeja</div>
      @for (it of primary(); track it.link) {
        <a
          [routerLink]="it.link"
          routerLinkActive="bg-surface text-ink shadow-1 font-medium [&_ui-icon_span]:!text-brand [&_.count-badge]:bg-brand-soft [&_.count-badge]:text-brand-ink"
          [routerLinkActiveOptions]="{ exact: false }"
          class="flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-ink-2 text-[13.5px] cursor-pointer select-none hover:bg-hover hover:text-ink"
        >
          <ui-icon [name]="it.icon" [size]="18" />
          <span>{{ it.label }}</span>
          @if (it.badge) {
            <span class="count-badge ml-auto text-[11px] text-brand-ink bg-brand-soft px-1.5 py-px rounded-full tabular-nums">{{ it.badge }}</span>
          } @else if (it.count) {
            <span class="count-badge ml-auto text-[11px] text-ink-3 bg-soft px-1.5 py-px rounded-full tabular-nums">{{ it.count }}</span>
          }
        </a>
      }

      <div class="text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-4 px-2 pt-4 pb-1.5">Operación</div>
      @for (it of secondary; track it.link) {
        <a
          [routerLink]="it.link"
          routerLinkActive="bg-surface text-ink shadow-1 font-medium"
          class="flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-ink-2 text-[13.5px] cursor-pointer select-none hover:bg-hover hover:text-ink"
        >
          <ui-icon [name]="it.icon" [size]="18" />
          <span>{{ it.label }}</span>
        </a>
      }

      <div class="mt-auto pt-3 px-2 border-t border-line flex items-center gap-2.5">
        <div
          class="w-7 h-7 rounded-full grid place-items-center font-semibold text-[12px] text-white shrink-0"
          style="background: linear-gradient(135deg, oklch(0.55 0.16 30), oklch(0.5 0.18 350));"
        >
          {{ initials() }}
        </div>
        <div class="leading-tight min-w-0 flex-1">
          <div class="font-medium text-[13px] truncate">{{ displayName() }}</div>
          <div class="text-[11.5px] text-ink-3 truncate">{{ displayRole() }}</div>
        </div>
        <button
          type="button"
          class="rounded-sm w-7 h-7 grid place-items-center text-ink-3 hover:bg-hover hover:text-ink"
          (click)="theme.toggle()"
          [attr.aria-label]="theme.dark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        >
          <ui-icon [name]="theme.dark() ? 'light_mode' : 'dark_mode'" [size]="16" />
        </button>
        <button
          type="button"
          class="rounded-sm w-7 h-7 grid place-items-center text-ink-3 hover:bg-tier-red-soft hover:text-tier-red-ink"
          (click)="onLogout()"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <ui-icon name="logout" [size]="16" />
        </button>
      </div>
    </aside>
  `,
})
export class SidebarNav {
  protected readonly theme = inject(ThemeStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly claims = inject(ClaimsStore);
  private readonly providers = inject(ProvidersStore);

  protected readonly initials = computed(() => this.auth.user()?.initials ?? '··');
  protected readonly displayName = computed(() => this.auth.user()?.name ?? 'Sin sesión');
  protected readonly displayRole = computed(() => this.auth.user()?.role ?? 'Inicia sesión');

  protected readonly primary = computed<NavItem[]>(() => [
    { link: '/claims', label: 'Bandeja', icon: 'dashboard', count: this.claims.claims().length },
    { link: '/agent', label: 'Centinela IA', icon: 'auto_awesome', badge: 'Nuevo' },
    { link: '/network', label: 'Proveedores', icon: 'hub', count: this.providers.providers().length },
  ]);

  protected readonly secondary: NavItem[] = [
    { link: '/alerts', label: 'Reglas y alertas', icon: 'rule' },
    { link: '/audit', label: 'Auditoría', icon: 'description' },
    { link: '/settings', label: 'Configuración', icon: 'settings' },
  ];

  protected onLogout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }
}
