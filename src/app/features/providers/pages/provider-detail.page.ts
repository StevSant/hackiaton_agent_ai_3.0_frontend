import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ClaimsStore } from '@core/state/claims.store';
import { ProvidersStore } from '@core/state/providers.store';
import { Button } from '@shared/ui/button';
import { EntityConversations } from '@shared/ui/entity-conversations';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonCard } from '@shared/ui/skeleton-card';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { formatMoney, initials } from '@shared/utils';
import { ProviderClaimsList } from '../components/provider-claims-list';

@Component({
  selector: 'page-provider-detail',
  standalone: true,
  imports: [Button, EntityConversations, Icon, KpiSmall, Pagination, SkeletonCard, SkeletonTable, ProviderClaimsList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2 mb-3.5">
      <button
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
        (click)="back()"
      >
        <ui-icon name="arrow_back" [size]="14" /> Volver a proveedores
      </button>
    </div>

    @if (provider(); as p) {
      <div class="bg-surface border border-line rounded-lg shadow-1 mb-5">
        <div class="px-6 py-5 flex items-start gap-4">
          <div
            class="w-14 h-14 rounded-lg grid place-items-center font-semibold text-[16px] text-white shrink-0"
            [style.background]="p.color"
          >
            {{ initials(p.nombre) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2.5 mb-1">
              <h1 class="text-[20px] font-semibold tracking-tight m-0">{{ p.nombre }}</h1>
              @if (p.listaRestrictiva) {
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-tier-red-soft text-tier-red-ink">
                  Lista restrictiva
                </span>
              }
            </div>
            <div class="text-[13px] text-ink-3">{{ p.tipo }} · {{ p.ciudad }}</div>
            <div class="text-[11.5px] text-ink-3 font-mono mt-1">{{ p.id }}</div>
          </div>
          <div class="shrink-0 self-start">
            <ui-button (click)="askAI()">
              <ui-icon name="auto_awesome" [size]="14" />
              Preguntar a la IA
            </ui-button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-3 mb-5">
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
      <div class="mt-5">
        <ui-entity-conversations kind="provider" [entityId]="p.id" />
      </div>
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

  protected readonly pagedClaims = computed(() => {
    const start = this.page() * this.pageSize();
    return this.providerClaims().slice(start, start + this.pageSize());
  });

  constructor() {
    // Reset to the first page whenever the underlying provider (or its claim
    // count) changes — otherwise a deep page number leaks across navigations.
    effect(() => {
      this.id();
      this.providerClaims().length;
      this.page.set(0);
    });
  }

  protected readonly riskPct = computed(() => {
    const p = this.provider();
    if (!p || p.casos === 0) return 0;
    return Math.round((p.alertas / p.casos) * 100);
  });

  protected back(): void {
    void this.router.navigate(['/providers']);
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
    void this.router.navigate(['/claims', id]);
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
