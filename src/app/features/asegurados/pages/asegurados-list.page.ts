import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AseguradosStore } from '@core/state/asegurados.store';
import { Chip } from '@shared/ui/chip';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { formatMoney } from '@shared/utils';
import { AseguradosTable } from '../components/asegurados-table';

type MoraFilter = 'todos' | 'mora' | 'al-dia';

@Component({
  selector: 'page-asegurados-list',
  standalone: true,
  imports: [Chip, Icon, KpiSmall, Pagination, SkeletonTable, AseguradosTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Asegurados</h1>
        <p class="text-ink-3 text-[13.5px] m-0">
          Listado de personas aseguradas con su exposición y nivel de alertas acumuladas.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-3 mb-5">
      <ui-kpi-small label="Total" [value]="stats().total + ''" icon="group" tone="brand" />
      <ui-kpi-small label="En mora" [value]="stats().mora + ''" icon="report" tone="red" />
      <ui-kpi-small label="Alertas acumuladas" [value]="stats().alertas + ''" icon="warning" tone="yellow" />
      <ui-kpi-small label="Monto total" [value]="formatMoney(stats().monto)" icon="payments" />
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1 px-4 py-3 mb-4 flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-2 flex-1 min-w-[260px]">
        <ui-icon name="search" [size]="16" class="text-ink-3" />
        <input
          type="search"
          class="bg-transparent border-0 outline-0 text-[13.5px] flex-1 text-ink placeholder:text-ink-3"
          placeholder="Buscar por nombre, ciudad o segmento…"
          [value]="search()"
          (input)="search.set($any($event.target).value)"
        />
      </div>
      <div class="flex items-center gap-1.5">
        <ui-chip [active]="mora() === 'todos'" (click)="mora.set('todos')">Todos</ui-chip>
        <ui-chip [active]="mora() === 'mora'" (click)="mora.set('mora')">En mora</ui-chip>
        <ui-chip [active]="mora() === 'al-dia'" (click)="mora.set('al-dia')">Al día</ui-chip>
      </div>
    </div>

    @if (store.loading() && store.asegurados().length === 0) {
      <ui-skeleton-table [rows]="8" [cols]="6" />
    } @else if (filtered().length === 0) {
      <div class="bg-surface border border-line rounded-lg shadow-1 px-5 py-12 text-center text-ink-3 text-[13px]">
        Sin asegurados que coincidan con los filtros aplicados.
      </div>
    } @else {
      <asegurados-table [asegurados]="paged()" (open)="openAsegurado($event)" />
      <ui-pagination
        [page]="page()"
        [pageSize]="pageSize()"
        [total]="filtered().length"
        noun="asegurados"
        (pageChange)="page.set($event)"
        (pageSizeChange)="onPageSize($event)"
      />
    }
  `,
})
export class AseguradosListPage {
  protected readonly store = inject(AseguradosStore);
  private readonly router = inject(Router);

  protected readonly search = signal<string>('');
  protected readonly mora = signal<MoraFilter>('todos');
  protected readonly page = signal<number>(0);
  protected readonly pageSize = signal<number>(25);

  protected readonly stats = this.store.stats;

  protected readonly filtered = computed(() => {
    const list = this.store.asegurados();
    const term = this.search().trim().toLowerCase();
    const moraFilter = this.mora();
    return list.filter((a) => {
      if (moraFilter === 'mora' && !a.mora_actual) return false;
      if (moraFilter === 'al-dia' && a.mora_actual) return false;
      if (!term) return true;
      return (
        a.nombre.toLowerCase().includes(term) ||
        a.ciudad.toLowerCase().includes(term) ||
        (a.segmento ?? '').toLowerCase().includes(term)
      );
    });
  });

  protected readonly paged = computed(() => {
    const list = this.filtered();
    const size = this.pageSize();
    const start = this.page() * size;
    return list.slice(start, start + size);
  });

  protected openAsegurado(id: string): void {
    void this.router.navigate(['/asegurados', id]);
  }

  protected onPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(0);
  }

  protected readonly formatMoney = formatMoney;
}
