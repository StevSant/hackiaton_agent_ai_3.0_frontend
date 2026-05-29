import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import {
  type ProviderCreate,
  type ProviderUpdate,
} from '@core/api/clients/network.api';
import { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';
import { ProvidersStore } from '@core/state/providers.store';
import type { Provider } from '@shared/models';
import { Button } from '@shared/ui/button';
import { ExportButton } from '@shared/ui/export-button';
import { ExportModal, type ExportRequest } from '@shared/ui/export-modal';
import { FilterBar, type FilterControl, type FilterValue } from '@shared/ui/filter-bar';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import {
  PROVIDER_EXPORT_COLUMNS,
  TableSortController,
  bindListKeyboardNav,
  exportProviders,
  formatMoney,
  projectProvider,
  sortRows,
  type SortAccessors,
} from '@shared/utils';
import { ProviderFormModal, type ProviderFormValue } from '../components/provider-form-modal';
import { ProvidersTable } from '../components/providers-table';

@Component({
  selector: 'page-providers-list',
  standalone: true,
  imports: [
    Button,
    ExportButton,
    ExportModal,
    FilterBar,
    Icon,
    KpiSmall,
    Pagination,
    SkeletonTable,
    ProvidersTable,
    ProviderFormModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Proveedores y beneficiarios</h1>
        <p class="text-ink-3 text-[13.5px] m-0">
          Listado de talleres, clínicas y beneficiarios asociados a los siniestros.
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <ui-button variant="primary" (click)="openCreate()">
          <ui-icon name="add" [size]="16" />
          Agregar proveedor
        </ui-button>
        <ui-export-button
          label="Exportar reporte"
          [disabled]="filtered().length === 0"
          (trigger)="exportOpen.set(true)"
        />
      </div>
    </div>

    <div class="grid grid-cols-4 gap-3 mb-5">
      <ui-kpi-small label="Total" [value]="stats().total + ''" icon="storefront" tone="brand" />
      <ui-kpi-small label="En lista restrictiva" [value]="stats().restrictiva + ''" icon="report" tone="red" />
      <ui-kpi-small label="Alertas acumuladas" [value]="stats().alertas + ''" icon="warning" tone="yellow" />
      <ui-kpi-small label="Monto total" [value]="formatMoney(stats().monto)" icon="payments" />
    </div>

    <ui-filter-bar
      [controls]="filterControls()"
      [value]="filters()"
      (valueChange)="filters.set($event)"
    />

    @if (store.loading() && store.providers().length === 0) {
      <ui-skeleton-table [rows]="8" [cols]="6" />
    } @else if (filtered().length === 0) {
      <div class="bg-surface border border-line rounded-lg shadow-1 px-5 py-12 text-center text-ink-3 text-[13px]">
        Sin proveedores que coincidan con los filtros aplicados.
      </div>
    } @else {
      <providers-table
        [providers]="paged()"
        [sort]="sort"
        [focusedId]="focusedRowId()"
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly shortcuts = inject(KeyboardShortcutsService);

  protected readonly filters = signal<FilterValue>({
    search: '',
    city: '',
    tipo: '',
    restrictive: 'todos',
  });

  protected readonly filterControls = computed<FilterControl[]>(() => [
    { type: 'search', key: 'search', placeholder: 'Buscar por nombre, ciudad o tipo…' },
    {
      type: 'select',
      key: 'city',
      label: 'Ciudad',
      icon: 'location_on',
      options: [
        { value: '', label: 'Todas las ciudades' },
        ...this.cityOptions().map((c) => ({ value: c, label: c })),
      ],
    },
    {
      type: 'select',
      key: 'tipo',
      label: 'Tipo',
      options: [
        { value: '', label: 'Todos los tipos' },
        ...this.tipoOptions().map((t) => ({ value: t, label: t })),
      ],
    },
    {
      type: 'chips',
      key: 'restrictive',
      emptyValue: 'todos',
      options: [
        { value: 'todos', label: 'Todos' },
        { value: 'restrictiva', label: 'Lista restrictiva' },
        { value: 'normal', label: 'Normales' },
      ],
    },
  ]);

  protected readonly cityOptions = computed(() =>
    uniqueSorted(this.store.providers().map((p) => p.ciudad)),
  );
  protected readonly tipoOptions = computed(() =>
    uniqueSorted(this.store.providers().map((p) => p.tipo)),
  );

  protected readonly sort = new TableSortController();
  protected readonly page = signal<number>(1);
  protected readonly pageSize = signal<number>(20);
  protected readonly listFocusIndex = signal(-1);
  protected readonly exportOpen = signal<boolean>(false);
  protected readonly providerColumns = PROVIDER_EXPORT_COLUMNS;

  protected readonly formOpen = signal<boolean>(false);
  protected readonly formMode = signal<'create' | 'edit'>('create');
  protected readonly formTarget = signal<Provider | null>(null);

  protected readonly stats = this.store.stats;

  protected readonly filtered = computed(() => {
    const list = this.store.providers();
    const f = this.filters();
    const term = (f['search'] ?? '').trim().toLowerCase();
    const city = f['city'] ?? '';
    const tipo = f['tipo'] ?? '';
    const restrictive = f['restrictive'] ?? 'todos';
    return list.filter((p) => {
      if (restrictive === 'restrictiva' && !p.listaRestrictiva) return false;
      if (restrictive === 'normal' && p.listaRestrictiva) return false;
      if (city && p.ciudad !== city) return false;
      if (tipo && p.tipo !== tipo) return false;
      if (!term) return true;
      return (
        p.nombre.toLowerCase().includes(term) ||
        p.ciudad.toLowerCase().includes(term) ||
        p.tipo.toLowerCase().includes(term)
      );
    });
  });

  constructor() {
    bindListKeyboardNav(this.destroyRef, this.shortcuts, {
      rows: () => this.paged(),
      focusedIndex: this.listFocusIndex,
      onOpen: (id) => this.openProvider(id),
    });

    effect(() => {
      this.filters(); // track
      this.sort.key(); // re-sorting jumps the analyst back to the first page
      this.sort.dir();
      this.page.set(1);
    });
  }

  protected readonly sorted = computed(() =>
    sortRows(this.filtered(), this.sort.key(), this.sort.dir(), PROVIDER_SORT),
  );

  protected readonly paged = computed(() => {
    const list = this.sorted();
    const size = this.pageSize();
    const start = (this.page() - 1) * size;
    return list.slice(start, start + size);
  });

  protected readonly focusedRowId = computed(() => {
    const rows = this.paged();
    const index = this.listFocusIndex();
    return index >= 0 && index < rows.length ? rows[index].id : null;
  });

  protected readonly previewRows = computed(() =>
    this.filtered().slice(0, 3).map(projectProvider),
  );

  protected readonly exportFilename = computed(() => `centinela-proveedores-${todayStamp()}`);

  protected openProvider(id: string): void {
    void this.router.navigate(['/providers', id]);
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

const PROVIDER_SORT: SortAccessors<Provider> = {
  nombre: (p) => p.nombre,
  tipo: (p) => p.tipo,
  ciudad: (p) => p.ciudad,
  casos: (p) => p.casos,
  alertas: (p) => p.alertas,
  monto: (p) => p.monto,
  restrictiva: (p) => (p.listaRestrictiva ? 1 : 0),
};

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function uniqueSorted(values: readonly string[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const trimmed = (v ?? '').trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}
