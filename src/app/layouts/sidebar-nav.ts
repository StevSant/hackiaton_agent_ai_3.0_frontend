import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';
import { bindSectionKeyboardNav } from '@shared/utils/section-keyboard-nav';
import { BrandLogo } from '@shared/ui/brand-logo';
import { Icon } from '@shared/ui/icon';
import { RoleBadge } from '@shared/ui/role-badge';
import { ThemeStore } from '@core/theme/theme.store';
import { AuthStore } from '@core/auth/auth.store';
import { AseguradosStore } from '@core/state/asegurados.store';
import { ClaimsStore } from '@core/state/claims.store';
import { ProvidersStore } from '@core/state/providers.store';

interface NavItem {
  link: string;
  label: string;
  icon: string;
  badge?: string;
  count?: number;
  featured?: boolean;
}

@Component({
  selector: 'app-sidebar-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, BrandLogo, Icon, RoleBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
      }
    `,
  ],
  template: `
    <aside class="centinela-sidebar h-full min-h-0 flex flex-col">
      <div class="centinela-sidebar__scroll flex-1 min-h-0 overflow-y-auto scroll-pretty px-3 pt-4">
        <ui-brand-logo />

        <nav class="flex flex-col gap-0.5" aria-label="Bandeja">
          <p class="centinela-nav-label">Bandeja</p>
          @for (it of primary(); track it.link) {
            <a
              [routerLink]="it.link"
              routerLinkActive="centinela-nav-link--active"
              [routerLinkActiveOptions]="{ exact: false }"
              class="centinela-nav-link"
              [class.centinela-nav-link--featured]="it.featured"
            >
              @if (it.icon === 'visibility') {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="shrink-0">
                  <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                </svg>
              } @else {
                <ui-icon [name]="it.icon" [size]="18" />
              }
              <span>{{ it.label }}</span>
              @if (it.badge) {
                <span class="centinela-nav-badge centinela-nav-badge--new">{{ it.badge }}</span>
              } @else if (it.count) {
                <span class="centinela-nav-badge centinela-nav-badge--count">{{ it.count }}</span>
              }
            </a>
          }
        </nav>

        <nav class="flex flex-col gap-0.5 mt-1 pb-3" aria-label="Operación">
          <p class="centinela-nav-label">Operación</p>
          @for (it of secondary(); track it.link) {
            <a
              [routerLink]="it.link"
              routerLinkActive="centinela-nav-link--active"
              class="centinela-nav-link"
            >
              <ui-icon [name]="it.icon" [size]="18" />
              <span>{{ it.label }}</span>
            </a>
          }
        </nav>
      </div>

      <div class="centinela-sidebar__foot shrink-0 px-3 pb-3 pt-3 flex flex-col gap-3">
        @if (roleCode(); as r) {
          <button
            type="button"
            class="centinela-sidebar__role-switch w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[var(--radius-control)] text-[12.5px] font-medium text-ink-2 hover:bg-hover hover:text-ink border border-dashed border-line-2 transition-colors"
            (click)="toggleRole()"
            [title]="otherRoleHint()"
          >
            <ui-icon name="swap_horiz" [size]="16" />
            <span class="truncate">Cambiar a {{ otherRoleLabel() }}</span>
          </button>
        }

        <div class="centinela-user-card">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full grid place-items-center font-semibold text-[14px] text-brand-on shrink-0"
              style="background: linear-gradient(145deg, var(--brand), var(--brand-2));"
            >
              {{ initials() }}
            </div>
            <div class="leading-tight min-w-0 flex-1">
              <div class="font-semibold text-[13.5px] truncate">{{ displayName() }}</div>
              <div class="flex items-center gap-1.5 mt-0.5">
                @if (roleCode(); as r) {
                  <ui-role-badge [role]="r" />
                }
              </div>
              <div class="text-[11px] text-ink-4 mt-0.5 truncate">{{ sucursal() }}</div>
            </div>
          </div>

          <div class="flex items-center gap-1.5 border-t border-line pt-3 mt-3">
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-1.5 rounded-[8px] px-2 py-1.5 text-[11.5px] text-ink-3 hover:bg-hover hover:text-ink transition-colors"
              (click)="theme.toggle()"
              [attr.aria-label]="theme.dark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            >
              <ui-icon [name]="theme.dark() ? 'light_mode' : 'dark_mode'" [size]="15" />
              <span>{{ theme.dark() ? 'Claro' : 'Oscuro' }}</span>
            </button>
            <div class="w-px h-5 bg-line shrink-0"></div>
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-1.5 rounded-[8px] px-2 py-1.5 text-[11.5px] text-tier-red-ink hover:bg-tier-red-soft transition-colors"
              (click)="onLogout()"
              aria-label="Cerrar sesión"
            >
              <ui-icon name="logout" [size]="15" />
              <span>Salir</span>
            </button>
          </div>
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
  private readonly asegurados = inject(AseguradosStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shortcuts = inject(KeyboardShortcutsService);

  constructor() {
    bindSectionKeyboardNav(this.destroyRef, this.shortcuts, this.router);
  }

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
        { link: '/providers', label: 'Proveedores', icon: 'storefront', count: this.providers.providers().length },
        { link: '/asegurados', label: 'Asegurados', icon: 'group', count: this.asegurados.asegurados().length },
        { link: '/network', label: 'Red de relaciones', icon: 'hub' },
        { link: '/agent', label: 'Centinela IA', icon: 'visibility', badge: 'Nuevo', featured: true },
        { link: '/uploads', label: 'Importar casos', icon: 'cloud_upload' },
      ];
    }
    const myActive = this.claims
      .claims()
      .filter((c) => c.review.status === 'pendiente' || c.review.status === 'escalado' || c.review.status === 'en_revision')
      .length;
    return [
      { link: '/claims', label: 'Bandeja', icon: 'dashboard', count: myActive },
      { link: '/insights', label: 'Insights IA', icon: 'insights' },
      { link: '/providers', label: 'Proveedores', icon: 'storefront', count: this.providers.providers().length },
      { link: '/asegurados', label: 'Asegurados', icon: 'group', count: this.asegurados.asegurados().length },
      { link: '/agent', label: 'Centinela IA', icon: 'visibility', badge: 'Nuevo', featured: true },
      { link: '/uploads', label: 'Importar casos', icon: 'cloud_upload' },
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

  protected async toggleRole(): Promise<void> {
    const r = this.roleCode();
    if (!r) return;
    const target: 'analista' | 'antifraude' = r === 'antifraude' ? 'analista' : 'antifraude';
    const ok = await this.auth.switchRole(target);
    if (!ok) return;
    void this.router.navigateByUrl(target === 'antifraude' ? '/antifraude/bandeja' : '/claims');
  }

  protected onLogout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }
}
