import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ClaimsStore } from '@core/state/claims.store';
import { ClaimNavigationStore } from '@core/state/claim-navigation.store';
import { ProviderNavigationStore } from '@core/state/provider-navigation.store';
import { ProvidersStore } from '@core/state/providers.store';
import { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonCard } from '@shared/ui/skeleton-card';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { formatMoney, initials, navigateToClaimDetail, bindDetailKeyboardNav, bindRecordSwapPulse, scrollAppMainToTop } from '@shared/utils';
import { ProviderClaimsList } from '../components/provider-claims-list';

@Component({
  selector: 'page-provider-detail',
  standalone: true,
  imports: [Button, Icon, KpiSmall, Pagination, SkeletonCard, SkeletonTable, ProviderClaimsList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-3.5">
      <button
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
        (click)="back()"
      >
        <ui-icon name="arrow_back" [size]="14" /> Volver a proveedores
      </button>
      @if (providerNav().total > 1) {
        <nav class="centinela-record-nav" aria-label="Navegación entre proveedores">
          <button
            type="button"
            class="centinela-record-nav__btn"
            [disabled]="!providerNav().prevId"
            (click)="goToProvider(providerNav().prevId)"
            aria-label="Proveedor anterior"
          >
            <ui-icon name="chevron_left" [size]="16" />
            <span class="hidden sm:inline">Anterior</span>
          </button>
          <span class="centinela-record-nav__count" [attr.data-swap]="swapTick()">
            {{ providerNav().position }}/{{ providerNav().total }}
          </span>
          <button
            type="button"
            class="centinela-record-nav__btn"
            [disabled]="!providerNav().nextId"
            (click)="goToProvider(providerNav().nextId)"
            aria-label="Proveedor siguiente"
          >
            <span class="hidden sm:inline">Siguiente</span>
            <ui-icon name="chevron_right" [size]="16" />
          </button>
        </nav>
      }
    </div>

    @if (provider(); as p) {
      <div class="bg-surface border border-line rounded-lg shadow-1 mb-5 overflow-hidden">
        <div
          class="centinela-detail-hero centinela-record-identity-panel"
          [attr.data-swap]="swapTick()"
        >
          <div
            class="w-14 h-14 rounded-lg grid place-items-center font-semibold text-[16px] text-white shrink-0"
            [style.background]="p.color"
          >
            {{ initials(p.nombre) }}
          </div>
          <div class="centinela-detail-hero__body">
            <div class="flex flex-wrap items-center gap-2 mb-1.5">
              <span class="centinela-record-id-chip">{{ p.id }}</span>
              @if (p.listaRestrictiva) {
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-tier-red-soft text-tier-red-ink">
                  Lista restrictiva
                </span>
              }
            </div>
            <h1 class="centinela-record-primary-name">{{ p.nombre }}</h1>
            <p class="centinela-record-secondary-line">{{ p.tipo }} · {{ p.ciudad }}</p>
          </div>
          <div class="centinela-detail-hero__actions">
            <ui-button (click)="askAI()">
              <ui-icon name="auto_awesome" [size]="14" />
              Preguntar a la IA
            </ui-button>
          </div>
        </div>
      </div>

      <div class="centinela-kpi-row">
        <ui-kpi-small label="Casos asociados" [value]="p.casos + ''" icon="folder" />
        <ui-kpi-small label="Alertas" [value]="p.alertas + ''" icon="warning" tone="yellow" />
        <ui-kpi-small label="Monto total" [value]="formatMoney(p.monto)" icon="payments" />
        <ui-kpi-small label="% riesgo" [value]="riskPct() + '%'" icon="trending_up" tone="red" />
      </div>

      <div class="bg-surface border border-line rounded-lg shadow-1 mb-3 px-5 py-3.5">
        <h2 class="text-[14px] font-semibold m-0">Siniestros asociados</h2>
        <p class="text-ink-3 text-[12.5px] m-0 mt-0.5">
          Listado de casos donde {{ p.nombre }} aparece como proveedor o beneficiario.
        </p>
      </div>

      @if (claimsStore.loading() && providerClaims().length === 0) {
        <ui-skeleton-table [rows]="5" [cols]="8" />
      } @else if (providerClaims().length === 0) {
        <div class="bg-surface border border-line rounded-lg shadow-1 px-5 py-12 text-center text-ink-3 text-[13px]">
          Sin siniestros asociados a este proveedor.
        </div>
      } @else {
        <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden">
          <provider-claims-list [claims]="pagedClaims()" (open)="openClaim($event)" />
          <ui-pagination
            [page]="page()"
            [pageSize]="pageSize()"
            [total]="providerClaims().length"
            variant="compact"
            noun="siniestros"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)"
          />
        </div>
      }
    } @else if (providersStore.loading()) {
      <ui-skeleton-card [bodyLines]="3" />
    } @else {
      <div class="bg-surface border border-line rounded-lg shadow-1 px-5 py-12 text-center text-ink-3 text-[13px]">
        Proveedor no encontrado.
      </div>
    }
  `,
})
export class ProviderDetailPage {
  readonly id = input.required<string>();

  protected readonly providersStore = inject(ProvidersStore);
  protected readonly claimsStore = inject(ClaimsStore);
  private readonly router = inject(Router);
  private readonly claimNavigation = inject(ClaimNavigationStore);
  private readonly providerNavigation = inject(ProviderNavigationStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shortcuts = inject(KeyboardShortcutsService);

  protected readonly provider = computed(() => this.providersStore.findById(this.id()));

  protected readonly providerClaims = computed(() => {
    const p = this.provider();
    if (!p) return [];
    const targetId = p.id.toLowerCase();
    const targetName = p.nombre.toLowerCase();
    return this.claimsStore.claims().filter((c) => {
      // Match by id first (the canonical FK on siniestros.beneficiario), then
      // fall back to name (covers older summary rows without proveedor_id).
      if (c.proveedor_id && c.proveedor_id.toLowerCase() === targetId) return true;
      return !!c.proveedor && c.proveedor.toLowerCase() === targetName;
    });
  });

  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly swapTick = signal(0);

  protected readonly pagedClaims = computed(() => {
    const start = this.page() * this.pageSize();
    return this.providerClaims().slice(start, start + this.pageSize());
  });

  constructor() {
    bindRecordSwapPulse(() => this.id(), this.swapTick);

    effect(() => {
      this.id();
      this.providerClaims().length;
      this.page.set(0);
    });

    effect(() => {
      const id = this.id();
      if (!id) return;
      scrollAppMainToTop();
    });

    bindDetailKeyboardNav(this.destroyRef, this.shortcuts, {
      onPrev: () => this.goToProvider(this.providerNav().prevId),
      onNext: () => this.goToProvider(this.providerNav().nextId),
      onBack: () => this.back(),
    }, 'Proveedor');
  }

  protected readonly riskPct = computed(() => {
    const p = this.provider();
    if (!p || p.casos === 0) return 0;
    return Math.round((p.alertas / p.casos) * 100);
  });

  protected readonly fallbackNavIds = computed(() =>
    [...this.providersStore.providers()]
      .sort((left, right) => right.alertas - left.alertas || left.nombre.localeCompare(right.nombre, 'es'))
      .map((provider) => provider.id),
  );

  protected readonly providerNav = computed(() =>
    this.providerNavigation.resolve(this.id(), this.fallbackNavIds()),
  );

  protected back(): void {
    void this.router.navigate(['/providers']);
  }

  protected goToProvider(id: string | null): void {
    if (!id || id === this.id()) return;
    scrollAppMainToTop();
    void this.router.navigate(['/providers', id]);
  }

  protected askAI(): void {
    const conversationId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    void this.router.navigate(['/agent'], {
      queryParams: { provider: this.id(), conversation: conversationId },
    });
  }

  protected openClaim(id: string): void {
    const contextIds = [...this.providerClaims()]
      .sort((a, b) => b.score - a.score)
      .map((claim) => claim.id);
    this.claimsStore.prefetchNeighborDetails(contextIds, id, 1);
    navigateToClaimDetail(this.router, this.claimNavigation, id, contextIds);
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(0);
  }

  protected readonly formatMoney = formatMoney;
  protected readonly initials = initials;
}
