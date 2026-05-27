import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { BrandLogo } from '../shared/ui/brand-logo';
import { Icon } from '../shared/ui/icon';
import { RoleBadge } from '../shared/ui/role-badge';
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
  imports: [RouterLink, RouterLinkActive, BrandLogo, Icon, RoleBadge],
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
      @for (it of secondary(); track it.link) {
        <a
          [routerLink]="it.link"
          routerLinkActive="bg-surface text-ink shadow-1 font-medium"
          class="flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-ink-2 text-[13.5px] cursor-pointer select-none hover:bg-hover hover:text-ink"
        >
          <ui-icon [name]="it.icon" [size]="18" />
          <span>{{ it.label }}</span>
        </a>
      }

      <div class="mt-auto pt-3 px-2 border-t border-line flex flex-col gap-2">
        @if (roleCode(); as r) {
          <button
            type="button"
            class="flex items-center gap-2 px-2 py-1.5 rounded-sm text-[11.5px] text-ink-3 hover:bg-hover hover:text-ink border border-dashed border-line text-left"
            (click)="toggleRole()"
            [title]="otherRoleHint()"
          >
            <ui-icon name="swap_horiz" [size]="14" />
            <span class="flex-1 truncate">Cambiar a {{ otherRoleLabel() }}</span>
          </button>
        }
        <div class="flex items-center gap-2.5">
          <div
            class="w-7 h-7 rounded-full grid place-items-center font-semibold text-[12px] text-white shrink-0"
            style="background: linear-gradient(135deg, oklch(0.55 0.16 30), oklch(0.5 0.18 350));"
          >
            {{ initials() }}
          </div>
          <div class="leading-tight min-w-0 flex-1">
            <div class="font-medium text-[13px] truncate">{{ displayName() }}</div>
            <div class="flex items-center gap-1.5 mt-0.5">
              @if (roleCode(); as r) {
                <ui-role-badge [role]="r" />
              }
              <span class="text-[11px] text-ink-4 truncate">{{ sucursal() }}</span>
            </div>
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
  protected readonly sucursal = computed(() => this.auth.user()?.sucursal ?? '');
  protected readonly roleCode = computed(() => this.auth.user()?.roleCode ?? null);

  protected readonly otherRoleLabel = computed(() =>
    this.roleCode() === 'antifraude' ? 'Analista' : 'Antifraude',
  );

  protected readonly otherRoleHint = computed(() =>
    this.roleCode() === 'antifraude'
      ? 'Mockup: cambiar a la vista de Analista de siniestros'
      : 'Mockup: cambiar a la vista de Analista antifraude',
  );

  protected readonly primary = computed<NavItem[]>(() => {
    const r = this.roleCode();
    if (r === 'antifraude') {
      const inbox = this.claims
        .claims()
        .filter((c) => c.review.status === 'escalado' || c.review.status === 'en_revision').length;
      return [
        { link: '/antifraude/bandeja', label: 'Bandeja Antifraude', icon: 'shield_person', count: inbox },
        { link: '/antifraude/investigacion', label: 'Investigación', icon: 'travel_explore', count: this.claims.claims().length },
        { link: '/insights', label: 'Insights IA', icon: 'insights' },
        { link: '/network', label: 'Proveedores', icon: 'hub', count: this.providers.providers().length },
        { link: '/agent', label: 'Centinela IA', icon: 'auto_awesome', badge: 'Nuevo' },
      ];
    }
    // analista (default)
    const myActive = this.claims
      .claims()
      .filter((c) => c.review.status === 'pendiente' || c.review.status === 'escalado' || c.review.status === 'en_revision')
      .length;
    return [
      { link: '/claims', label: 'Bandeja', icon: 'dashboard', count: myActive },
      { link: '/insights', label: 'Insights IA', icon: 'insights' },
      { link: '/agent', label: 'Centinela IA', icon: 'auto_awesome', badge: 'Nuevo' },
    ];
  });

  protected readonly secondary = computed<NavItem[]>(() => {
    const r = this.roleCode();
    if (r === 'antifraude') {
      return [
        { link: '/alerts', label: 'Reglas y alertas', icon: 'rule' },
        { link: '/audit', label: 'Auditoría', icon: 'description' },
        { link: '/settings', label: 'Configuración', icon: 'settings' },
      ];
    }
    return [
      { link: '/alerts', label: 'Reglas (consulta)', icon: 'menu_book' },
      { link: '/settings', label: 'Configuración', icon: 'settings' },
    ];
  });

  protected toggleRole(): void {
    const r = this.roleCode();
    if (!r) return;
    void this.auth.switchRole(r === 'antifraude' ? 'analista' : 'antifraude');
  }

  protected onLogout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }
}
