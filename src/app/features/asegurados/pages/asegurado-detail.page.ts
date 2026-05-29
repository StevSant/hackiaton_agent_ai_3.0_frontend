import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AseguradosStore } from '@core/state/asegurados.store';
import { AseguradoNavigationStore } from '@core/state/asegurado-navigation.store';
import { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';
import { ClaimNavigationStore } from '@core/state/claim-navigation.store';
import { ClaimsStore } from '@core/state/claims.store';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonCard } from '@shared/ui/skeleton-card';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { formatMoney, initials, navigateToClaimDetail, bindDetailKeyboardNav, bindRecordSwapPulse, scrollAppMainToTop } from '@shared/utils';
import { AseguradoClaimsList } from '../components/asegurado-claims-list';

@Component({
  selector: 'page-asegurado-detail',
  standalone: true,
  imports: [Button, Icon, KpiSmall, Pagination, SkeletonCard, SkeletonTable, AseguradoClaimsList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-3.5">
      <button
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
        (click)="back()"
      >
        <ui-icon name="arrow_back" [size]="14" /> Volver a asegurados
      </button>
      @if (aseguradoNav().total > 1) {
        <nav class="centinela-record-nav" aria-label="Navegación entre asegurados">
          <button
            type="button"
            class="centinela-record-nav__btn"
            [disabled]="!aseguradoNav().prevId"
            (click)="goToAsegurado(aseguradoNav().prevId)"
            aria-label="Asegurado anterior"
          >
            <ui-icon name="chevron_left" [size]="16" />
            <span class="hidden sm:inline">Anterior</span>
          </button>
          <span class="centinela-record-nav__count" [attr.data-swap]="swapTick()">
            {{ aseguradoNav().position }}/{{ aseguradoNav().total }}
          </span>
          <button
            type="button"
            class="centinela-record-nav__btn"
            [disabled]="!aseguradoNav().nextId"
            (click)="goToAsegurado(aseguradoNav().nextId)"
            aria-label="Asegurado siguiente"
          >
            <span class="hidden sm:inline">Siguiente</span>
            <ui-icon name="chevron_right" [size]="16" />
          </button>
        </nav>
      }
    </div>

    @if (asegurado(); as a) {
      <div class="bg-surface border border-line rounded-lg shadow-1 mb-5 overflow-hidden">
        <div
          class="centinela-detail-hero centinela-record-identity-panel"
          [attr.data-swap]="swapTick()"
        >
          <div
            class="w-14 h-14 rounded-full grid place-items-center font-semibold text-[16px] text-white shrink-0"
            [style.background]="a.color"
          >
            {{ initials(a.nombre) }}
          </div>
          <div class="centinela-detail-hero__body">
            <div class="flex flex-wrap items-center gap-2 mb-1.5">
              <span class="centinela-record-id-chip">{{ a.id }}</span>
              @if (a.mora_actual) {
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-tier-red-soft text-tier-red-ink">
                  Mora actual
                </span>
              }
              @if (a.segmento) {
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line">
                  {{ a.segmento }}
                </span>
              }
            </div>
            <h1 class="centinela-record-primary-name">{{ a.nombre }}</h1>
            <p class="centinela-record-secondary-line">
              {{ a.ciudad }}
              @if (a.antiguedad !== null) {
                · {{ a.antiguedad }} meses con la aseguradora
              }
              @if (a.num_polizas > 0) {
                · {{ a.num_polizas }} póliza{{ a.num_polizas === 1 ? '' : 's' }}
              }
            </p>
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
        <ui-kpi-small label="Casos asociados" [value]="a.casos + ''" icon="folder" />
        <ui-kpi-small label="Alertas" [value]="a.alertas + ''" icon="warning" tone="yellow" />
        <ui-kpi-small label="Monto total" [value]="formatMoney(a.monto)" icon="payments" />
        <ui-kpi-small label="% riesgo" [value]="riskPct() + '%'" icon="trending_up" tone="red" />
      </div>

      <div class="bg-surface border border-line rounded-lg shadow-1 mb-3 px-5 py-3.5">
        <h2 class="text-[14px] font-semibold m-0">Siniestros del asegurado</h2>
        <p class="text-ink-3 text-[12.5px] m-0 mt-0.5">
          Listado de casos en los que {{ a.nombre }} aparece como asegurado.
        </p>
      </div>

      @if (claimsStore.loading() && aseguradoClaims().length === 0) {
        <ui-skeleton-table [rows]="5" [cols]="7" />
      } @else if (aseguradoClaims().length === 0) {
        <div class="bg-surface border border-line rounded-lg shadow-1 px-5 py-12 text-center text-ink-3 text-[13px]">
          Sin siniestros asociados a este asegurado.
        </div>
      } @else {
        <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden">
          <asegurado-claims-list [claims]="pagedClaims()" (open)="openClaim($event)" />
          <ui-pagination
            [page]="page()"
            [pageSize]="pageSize()"
            [total]="aseguradoClaims().length"
            variant="compact"
            noun="siniestros"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)"
          />
        </div>
      }
    } @else if (store.loading()) {
      <ui-skeleton-card [bodyLines]="3" />
    } @else {
      <div class="bg-surface border border-line rounded-lg shadow-1 px-5 py-12 text-center text-ink-3 text-[13px]">
        Asegurado no encontrado.
      </div>
    }
  `,
})
export class AseguradoDetailPage {
  readonly id = input.required<string>();

  protected readonly store = inject(AseguradosStore);
  protected readonly claimsStore = inject(ClaimsStore);
  private readonly router = inject(Router);
  private readonly claimNavigation = inject(ClaimNavigationStore);
  private readonly aseguradoNavigation = inject(AseguradoNavigationStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shortcuts = inject(KeyboardShortcutsService);

  protected readonly asegurado = computed(() => this.store.findById(this.id()));

  protected readonly aseguradoClaims = computed(() => {
    const a = this.asegurado();
    if (!a) return [];
    const targetId = a.id.toLowerCase();
    const targetName = a.nombre.toLowerCase();
    return this.claimsStore.claims().filter((c) => {
      if (c.asegurado_id && c.asegurado_id.toLowerCase() === targetId) return true;
      return c.asegurado.toLowerCase() === targetName;
    });
  });

  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly swapTick = signal(0);

  protected readonly pagedClaims = computed(() => {
    const start = this.page() * this.pageSize();
    return this.aseguradoClaims().slice(start, start + this.pageSize());
  });

  constructor() {
    bindRecordSwapPulse(() => this.id(), this.swapTick);

    effect(() => {
      this.id();
      this.aseguradoClaims().length;
      this.page.set(0);
    });

    effect(() => {
      const id = this.id();
      if (!id) return;
      scrollAppMainToTop();
    });

    bindDetailKeyboardNav(this.destroyRef, this.shortcuts, {
      onPrev: () => this.goToAsegurado(this.aseguradoNav().prevId),
      onNext: () => this.goToAsegurado(this.aseguradoNav().nextId),
      onBack: () => this.back(),
    }, 'Asegurado');
  }

  protected readonly riskPct = computed(() => {
    const a = this.asegurado();
    if (!a || a.casos === 0) return 0;
    return Math.round((a.alertas / a.casos) * 100);
  });

  protected readonly fallbackNavIds = computed(() =>
    [...this.store.asegurados()]
      .sort((left, right) => right.alertas - left.alertas || left.nombre.localeCompare(right.nombre, 'es'))
      .map((asegurado) => asegurado.id),
  );

  protected readonly aseguradoNav = computed(() =>
    this.aseguradoNavigation.resolve(this.id(), this.fallbackNavIds()),
  );

  protected back(): void {
    void this.router.navigate(['/asegurados']);
  }

  protected goToAsegurado(id: string | null): void {
    if (!id || id === this.id()) return;
    scrollAppMainToTop();
    void this.router.navigate(['/asegurados', id]);
  }

  protected askAI(): void {
    const conversationId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    void this.router.navigate(['/agent'], {
      queryParams: { asegurado: this.id(), conversation: conversationId },
    });
  }

  protected openClaim(id: string): void {
    const contextIds = [...this.aseguradoClaims()]
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
