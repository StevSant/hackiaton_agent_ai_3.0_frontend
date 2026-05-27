import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ProvidersStore } from '@core/state/providers.store';
import { Chip } from '@shared/ui/chip';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { formatMoney } from '@shared/utils';
import { ProvidersTable } from '../components/providers-table';

type RestrictiveFilter = 'todos' | 'restrictiva' | 'normal';

@Component({
  selector: 'page-providers-list',
  standalone: true,
  imports: [Chip, Icon, KpiSmall, Pagination, SkeletonTable, ProvidersTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Proveedores y beneficiarios</h1>
        <p class="text-ink-3 text-[13.5px] m-0">
          Listado de talleres, clínicas y beneficiarios asociados a los siniestros.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-3 mb-5">
      <ui-kpi-small label="Total" [value]="stats().total + ''" icon="storefront" tone="brand" />
      <ui-kpi-small label="En lista restrictiva" [value]="stats().restrictiva + ''" icon="report" tone="red" />
      <ui-kpi-small label="Alertas acumuladas" [value]="stats().alertas + ''" icon="warning" tone="yellow" />
      <ui-kpi-small label="Monto total" [value]="formatMoney(stats().monto)" icon="payments" />
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1 px-4 py-3 mb-4 flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-2 flex-1 min-w-[260px]">
        <ui-icon name="search" [size]="16" class="text-ink-3" />
        <input
          type="search"
          class="bg-transparent border-0 outline-0 text-[13.5px] flex-1 text-ink placeholder:text-ink-3"
          placeholder="Buscar por nombre, ciudad o tipo…"
          [value]="search()"
          (input)="search.set($any($event.target).value)"
        />
      </div>
      <div class="flex items-center gap-1.5">
        <ui-chip [active]="restrictive() === 'todos'" (click)="restrictive.set('todos')">Todos</ui-chip>
        <ui-chip [active]="restrictive() === 'restrictiva'" (click)="restrictive.set('restrictiva')">Lista restrictiva</ui-chip>
        <ui-chip [active]="restrictive() === 'normal'" (click)="restrictive.set('normal')">Normales</ui-chip>
      </div>
    </div>

    @if (store.loading() && store.providers().length === 0) {
      <ui-skeleton-table [rows]="8" [cols]="6" />
    } @else if (filtered().length === 0) {
      <div class="bg-surface border border-line rounded-lg shadow-1 px-5 py-12 text-center text-ink-3 text-[13px]">
        Sin proveedores que coincidan con los filtros aplicados.
      </div>
    } @else {
      <providers-table [providers]="paged()" (open)="openProvider($event)" />
      <ui-pagination
        [page]="page()"
        [pageSize]="pageSize()"
        [total]="filtered().length"
        (pageChange)="page.set($event)"
        (pageSizeChange)="onPageSize($event)"
      />
    }
  `,
})
export class ProvidersListPage {
  protected readonly store = inject(ProvidersStore);
  private readonly router = inject(Router);

  protected readonly search = signal<string>('');
  protected readonly restrictive = signal<RestrictiveFilter>('todos');
  protected readonly page = signal<number>(1);
  protected readonly pageSize = signal<number>(20);

  protected readonly stats = this.store.stats;

  protected readonly filtered = computed(() => {
    const list = this.store.providers();
    const term = this.search().trim().toLowerCase();
    const restrictiveFilter = this.restrictive();
    return list.filter((p) => {
      if (restrictiveFilter === 'restrictiva' && !p.listaRestrictiva) return false;
      if (restrictiveFilter === 'normal' && p.listaRestrictiva) return false;
      if (!term) return true;
      return (
        p.nombre.toLowerCase().includes(term) ||
        p.ciudad.toLowerCase().includes(term) ||
        p.tipo.toLowerCase().includes(term)
      );
    });
  });

  protected readonly paged = computed(() => {
    const list = this.filtered();
    const size = this.pageSize();
    const start = (this.page() - 1) * size;
    return list.slice(start, start + size);
  });

  protected openProvider(id: string): void {
    void this.router.navigate(['/providers', id]);
  }

  protected onPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  protected readonly formatMoney = formatMoney;
}
