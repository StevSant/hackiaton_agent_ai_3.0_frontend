import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AseguradosStore } from '@core/state/asegurados.store';
import { ClaimsStore } from '@core/state/claims.store';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonCard } from '@shared/ui/skeleton-card';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { formatMoney, initials } from '@shared/utils';
import { AseguradoClaimsList } from '../components/asegurado-claims-list';

@Component({
  selector: 'page-asegurado-detail',
  standalone: true,
  imports: [Button, Icon, KpiSmall, Pagination, SkeletonCard, SkeletonTable, AseguradoClaimsList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2 mb-3.5">
      <button
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
        (click)="back()"
      >
        <ui-icon name="arrow_back" [size]="14" /> Volver a asegurados
      </button>
    </div>

    @if (asegurado(); as a) {
      <div class="bg-surface border border-line rounded-lg shadow-1 mb-5">
        <div class="px-6 py-5 flex items-start gap-4">
          <div
            class="w-14 h-14 rounded-full grid place-items-center font-semibold text-[16px] text-white shrink-0"
            [style.background]="a.color"
          >
            {{ initials(a.nombre) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2.5 mb-1">
              <h1 class="text-[20px] font-semibold tracking-tight m-0">{{ a.nombre }}</h1>
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
            <div class="text-[13px] text-ink-3">
              {{ a.ciudad }}
              @if (a.antiguedad !== null) {
                · {{ a.antiguedad }} meses con la aseguradora
              }
              @if (a.num_polizas > 0) {
                · {{ a.num_polizas }} póliza{{ a.num_polizas === 1 ? '' : 's' }}
              }
            </div>
            <div class="text-[11.5px] text-ink-3 font-mono mt-1">{{ a.id }}</div>
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

  protected readonly pagedClaims = computed(() => {
    const start = this.page() * this.pageSize();
    return this.aseguradoClaims().slice(start, start + this.pageSize());
  });

  constructor() {
    effect(() => {
      this.id();
      this.aseguradoClaims().length;
      this.page.set(0);
    });
  }

  protected readonly riskPct = computed(() => {
    const a = this.asegurado();
    if (!a || a.casos === 0) return 0;
    return Math.round((a.alertas / a.casos) * 100);
  });

  protected back(): void {
    void this.router.navigate(['/asegurados']);
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
