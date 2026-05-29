import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import {
  type AseguradoCreate,
  type AseguradoUpdate,
} from '@core/api/clients/asegurados.api';
import { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';
import { AseguradosStore } from '@core/state/asegurados.store';
import type { Asegurado } from '@shared/models';
import { Button } from '@shared/ui/button';
import { ExportButton } from '@shared/ui/export-button';
import { ExportModal, type ExportRequest } from '@shared/ui/export-modal';
import { FilterBar, type FilterControl, type FilterValue } from '@shared/ui/filter-bar';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { formatMoney, bindListKeyboardNav } from '@shared/utils';
import {
  AseguradoFormModal,
  type AseguradoFormValue,
} from '../components/asegurado-form-modal';
import { AseguradosTable } from '../components/asegurados-table';
import {
  ASEGURADO_EXPORT_COLUMNS,
  exportAsegurados,
  projectAsegurado,
} from '../utils/export-asegurados';

@Component({
  selector: 'page-asegurados-list',
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
    AseguradosTable,
    AseguradoFormModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Asegurados</h1>
        <p class="text-ink-3 text-[13.5px] m-0">
          Listado de personas aseguradas con su exposición y nivel de alertas acumuladas.
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <ui-button variant="primary" (click)="openCreate()">
          <ui-icon name="add" [size]="16" />
          Agregar asegurado
        </ui-button>
        <ui-export-button
          label="Exportar reporte"
          [disabled]="filtered().length === 0"
          (trigger)="exportOpen.set(true)"
        />
      </div>
    </div>

    <div class="grid grid-cols-4 gap-3 mb-5">
      <ui-kpi-small label="Total" [value]="stats().total + ''" icon="group" tone="brand" />
      <ui-kpi-small label="En mora" [value]="stats().mora + ''" icon="report" tone="red" />
      <ui-kpi-small label="Alertas acumuladas" [value]="stats().alertas + ''" icon="warning" tone="yellow" />
      <ui-kpi-small label="Monto total" [value]="formatMoney(stats().monto)" icon="payments" />
    </div>

    <ui-filter-bar
      [controls]="filterControls()"
      [value]="filters()"
      (valueChange)="filters.set($event)"
    />

    @if (store.loading() && store.asegurados().length === 0) {
      <ui-skeleton-table [rows]="8" [cols]="6" />
    } @else if (filtered().length === 0) {
      <div class="bg-surface border border-line rounded-lg shadow-1 px-5 py-12 text-center text-ink-3 text-[13px]">
        Sin asegurados que coincidan con los filtros aplicados.
      </div>
    } @else {
      <asegurados-table
        [asegurados]="paged()"
        [focusedId]="focusedRowId()"
        (open)="openAsegurado($event)"
        (edit)="openEdit($event)"
        (remove)="onDelete($event)"
      />
      <ui-pagination
        [page]="page()"
        [pageSize]="pageSize()"
        [total]="filtered().length"
        noun="asegurados"
        (pageChange)="page.set($event)"
        (pageSizeChange)="onPageSize($event)"
      />
    }

    <ui-export-modal
      [open]="exportOpen()"
      title="Exportar asegurados"
      subtitle="Genera un archivo con los asegurados que coinciden con los filtros actuales."
      [columns]="aseguradoColumns"
      [defaultFilename]="exportFilename()"
      [totalRows]="filtered().length"
      [previewRows]="previewRows()"
      (close)="exportOpen.set(false)"
      (download)="onExport($event)"
    />

    <asegurado-form-modal
      [open]="formOpen()"
      [mode]="formMode()"
      [value]="formTarget()"
      (save)="onFormSave($event)"
      (close)="formOpen.set(false)"
    />
  `,
})
export class AseguradosListPage {
  protected readonly store = inject(AseguradosStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shortcuts = inject(KeyboardShortcutsService);

  protected readonly filters = signal<FilterValue>({
    search: '',
    city: '',
    segmento: '',
    mora: 'todos',
  });

  protected readonly filterControls = computed<FilterControl[]>(() => [
    { type: 'search', key: 'search', placeholder: 'Buscar por nombre, ciudad o segmento…' },
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
      key: 'segmento',
      label: 'Segmento',
      options: [
        { value: '', label: 'Todos los segmentos' },
        ...this.segmentoOptions().map((s) => ({ value: s, label: s })),
      ],
    },
    {
      type: 'chips',
      key: 'mora',
      emptyValue: 'todos',
      options: [
        { value: 'todos', label: 'Todos' },
        { value: 'mora', label: 'En mora' },
        { value: 'al-dia', label: 'Al día' },
      ],
    },
  ]);

  protected readonly cityOptions = computed(() =>
    uniqueSorted(this.store.asegurados().map((a) => a.ciudad)),
  );

  protected readonly segmentoOptions = computed(() =>
    uniqueSorted(this.store.asegurados().map((a) => a.segmento ?? '')),
  );

  protected readonly page = signal<number>(0);
  protected readonly pageSize = signal<number>(25);
  protected readonly listFocusIndex = signal(-1);
  protected readonly exportOpen = signal<boolean>(false);
  protected readonly aseguradoColumns = ASEGURADO_EXPORT_COLUMNS;

  protected readonly formOpen = signal<boolean>(false);
  protected readonly formMode = signal<'create' | 'edit'>('create');
  protected readonly formTarget = signal<Asegurado | null>(null);

  protected readonly stats = this.store.stats;

  constructor() {
    bindListKeyboardNav(this.destroyRef, this.shortcuts, {
      rows: () => this.paged(),
      focusedIndex: this.listFocusIndex,
      onOpen: (id) => this.openAsegurado(id),
    });

    effect(() => {
      this.filters(); // track
      this.page.set(0);
    });
  }

  protected readonly filtered = computed(() => {
    const list = this.store.asegurados();
    const f = this.filters();
    const term = (f['search'] ?? '').trim().toLowerCase();
    const city = f['city'] ?? '';
    const segmento = f['segmento'] ?? '';
    const mora = f['mora'] ?? 'todos';
    return list.filter((a) => {
      if (mora === 'mora' && !a.mora_actual) return false;
      if (mora === 'al-dia' && a.mora_actual) return false;
      if (city && a.ciudad !== city) return false;
      if (segmento && (a.segmento ?? '') !== segmento) return false;
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

  protected readonly focusedRowId = computed(() => {
    const rows = this.paged();
    const index = this.listFocusIndex();
    return index >= 0 && index < rows.length ? rows[index].id : null;
  });

  protected readonly previewRows = computed(() =>
    this.filtered().slice(0, 3).map(projectAsegurado),
  );

  protected readonly exportFilename = computed(() => `centinela-asegurados-${todayStamp()}`);

  protected openAsegurado(id: string): void {
    void this.router.navigate(['/asegurados', id]);
  }

  protected onPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(0);
  }

  protected onExport(req: ExportRequest): void {
    exportAsegurados(this.filtered(), req);
  }

  protected openCreate(): void {
    this.formTarget.set(null);
    this.formMode.set('create');
    this.formOpen.set(true);
  }

  protected openEdit(asegurado: Asegurado): void {
    this.formTarget.set(asegurado);
    this.formMode.set('edit');
    this.formOpen.set(true);
  }

  protected async onFormSave(value: AseguradoFormValue): Promise<void> {
    try {
      const target = this.formTarget();
      const body: AseguradoUpdate = {
        nombre: value.nombre || null,
        segmento: value.segmento || null,
        ciudad: value.ciudad,
        antiguedad: value.antiguedad,
        num_polizas: value.num_polizas,
        reclamos_ultimos_12_meses: value.reclamos_ultimos_12_meses,
        mora_actual: value.mora_actual,
        score_cliente_simulado: value.score_cliente_simulado,
      };
      if (this.formMode() === 'edit' && target) {
        await this.store.update(target.id, body);
      } else {
        await this.store.create(body as AseguradoCreate);
      }
      this.formOpen.set(false);
    } catch {
      // Failure surfaces via the HTTP error interceptor; keep the modal open.
    }
  }

  protected async onDelete(asegurado: Asegurado): Promise<void> {
    const confirmed = window.confirm(
      `¿Eliminar al asegurado «${asegurado.nombre}»? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    try {
      await this.store.remove(asegurado.id);
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

function uniqueSorted(values: readonly string[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const trimmed = (v ?? '').trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}
