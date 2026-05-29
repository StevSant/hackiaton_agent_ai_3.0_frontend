import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import {
  type ProviderCreate,
  type ProviderUpdate,
} from '@core/api/clients/network.api';
import { ProvidersStore } from '@core/state/providers.store';
import { ProviderNavigationStore } from '@core/state/provider-navigation.store';
import type { Provider } from '@shared/models';
import { Button } from '@shared/ui/button';
import { Chip } from '@shared/ui/chip';
import { ExportModal, type ExportRequest } from '@shared/ui/export-modal';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { PageHeader } from '@shared/ui/page-header';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import {
  PROVIDER_EXPORT_COLUMNS,
  exportProviders,
  formatMoney,
  navigateToProviderDetail,
  projectProvider,
} from '@shared/utils';
import { ProviderFormModal, type ProviderFormValue } from '../components/provider-form-modal';
import { ProvidersTable } from '../components/providers-table';

type RestrictiveFilter = 'todos' | 'restrictiva' | 'normal';

@Component({
  selector: 'page-providers-list',
  standalone: true,
  imports: [
    Button,
    Chip,
    ExportModal,
    Icon,
    KpiSmall,
    PageHeader,
    Pagination,
    SkeletonTable,
    ProvidersTable,
    ProviderFormModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Proveedores y beneficiarios">
      <p class="centinela-page-header__desc" ngProjectAs="[description]">
        Listado de talleres, clínicas y beneficiarios asociados a los siniestros.
      </p>
      <div ngProjectAs="[actions]" class="flex flex-wrap items-center gap-2">
        <ui-button variant="primary" (click)="openCreate()">
          <ui-icon name="add" [size]="16" />
          Agregar proveedor
        </ui-button>
        <ui-button [disabled]="filtered().length === 0" (click)="exportOpen.set(true)">
          <ui-icon name="download" [size]="14" />
          Exportar reporte
        </ui-button>
      </div>
    </ui-page-header>

    <div class="centinela-kpi-row">
      <ui-kpi-small label="Total" [value]="stats().total + ''" icon="storefront" tone="brand" />
      <ui-kpi-small label="En lista restrictiva" [value]="stats().restrictiva + ''" icon="report" tone="red" />
      <ui-kpi-small label="Alertas acumuladas" [value]="stats().alertas + ''" icon="warning" tone="yellow" />
      <ui-kpi-small label="Monto total" [value]="formatMoney(stats().monto)" icon="payments" />
    </div>

    <div class="centinela-list-toolbar">
      <div class="centinela-list-toolbar__search">
        <ui-icon name="search" [size]="16" class="text-ink-3 shrink-0" />
        <input
          type="search"
          placeholder="Buscar por nombre, ciudad o tipo…"
          [value]="search()"
          (input)="search.set($any($event.target).value)"
        />
      </div>
      <div class="centinela-list-toolbar__filters">
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
      <providers-table
        [providers]="paged()"
        (open)="openProvider($event)"
        (edit)="openEdit($event)"
        (remove)="onDelete($event)"
      />
      <ui-pagination
        [page]="page()"
        [pageSize]="pageSize()"
        [total]="filtered().length"
        (pageChange)="page.set($event)"
        (pageSizeChange)="onPageSize($event)"
      />
    }

    <ui-export-modal
      [open]="exportOpen()"
      title="Exportar proveedores"
      subtitle="Genera un archivo con los proveedores que coinciden con los filtros actuales."
      [columns]="providerColumns"
      [defaultFilename]="exportFilename()"
      [totalRows]="filtered().length"
      [previewRows]="previewRows()"
      (close)="exportOpen.set(false)"
      (download)="onExport($event)"
    />

    <provider-form-modal
      [open]="formOpen()"
      [mode]="formMode()"
      [value]="formTarget()"
      (save)="onFormSave($event)"
      (close)="formOpen.set(false)"
    />
  `,
})
export class ProvidersListPage {
  protected readonly store = inject(ProvidersStore);
  private readonly router = inject(Router);
  private readonly providerNavigation = inject(ProviderNavigationStore);

  protected readonly search = signal<string>('');
  protected readonly restrictive = signal<RestrictiveFilter>('todos');
  protected readonly page = signal<number>(1);
  protected readonly pageSize = signal<number>(20);
  protected readonly exportOpen = signal<boolean>(false);
  protected readonly providerColumns = PROVIDER_EXPORT_COLUMNS;

  protected readonly formOpen = signal<boolean>(false);
  protected readonly formMode = signal<'create' | 'edit'>('create');
  protected readonly formTarget = signal<Provider | null>(null);

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

  protected readonly previewRows = computed(() =>
    this.filtered().slice(0, 3).map(projectProvider),
  );

  protected readonly exportFilename = computed(() => `centinela-proveedores-${todayStamp()}`);

  protected openProvider(id: string): void {
    navigateToProviderDetail(
      this.router,
      this.providerNavigation,
      id,
      this.filtered().map((provider) => provider.id),
    );
  }

  protected onPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  protected onExport(req: ExportRequest): void {
    exportProviders(this.filtered(), req);
  }

  protected openCreate(): void {
    this.formTarget.set(null);
    this.formMode.set('create');
    this.formOpen.set(true);
  }

  protected openEdit(provider: Provider): void {
    this.formTarget.set(provider);
    this.formMode.set('edit');
    this.formOpen.set(true);
  }

  protected async onFormSave(value: ProviderFormValue): Promise<void> {
    try {
      const target = this.formTarget();
      if (this.formMode() === 'edit' && target) {
        const update: ProviderUpdate = {
          nombre: value.nombre || null,
          tipo: value.tipo,
          ciudad: value.ciudad,
          lista_restrictiva: value.listaRestrictiva,
        };
        await this.store.update(target.id, update);
      } else {
        const create: ProviderCreate = {
          nombre: value.nombre || null,
          tipo: value.tipo,
          ciudad: value.ciudad,
          antiguedad: value.antiguedad,
          lista_restrictiva: value.listaRestrictiva,
        };
        await this.store.create(create);
      }
      this.formOpen.set(false);
    } catch {
      // Failure surfaces via the HTTP error interceptor; keep the modal open.
    }
  }

  protected async onDelete(provider: Provider): Promise<void> {
    const confirmed = window.confirm(
      `¿Eliminar al proveedor «${provider.nombre}»? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    try {
      await this.store.remove(provider.id);
    } catch {
      // Failure surfaces via the HTTP error interceptor.
    }
  }

  protected readonly formatMoney = formatMoney;
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
