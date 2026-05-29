import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import {
  type AseguradoCreate,
  type AseguradoUpdate,
} from '@core/api/clients/asegurados.api';
import { AseguradosStore } from '@core/state/asegurados.store';
import { AseguradoNavigationStore } from '@core/state/asegurado-navigation.store';
import { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';
import type { Asegurado } from '@shared/models';
import { Button } from '@shared/ui/button';
import { Chip } from '@shared/ui/chip';
import { ExportModal, type ExportRequest } from '@shared/ui/export-modal';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { PageHeader } from '@shared/ui/page-header';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { formatMoney, navigateToAseguradoDetail, bindListKeyboardNav } from '@shared/utils';
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

type MoraFilter = 'todos' | 'mora' | 'al-dia';

@Component({
  selector: 'page-asegurados-list',
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
    AseguradosTable,
    AseguradoFormModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Asegurados">
      <p class="centinela-page-header__desc" ngProjectAs="[description]">
        Listado de personas aseguradas con su exposición y nivel de alertas acumuladas.
      </p>
      <div ngProjectAs="[actions]" class="flex flex-wrap items-center gap-2">
        <ui-button variant="primary" (click)="openCreate()">
          <ui-icon name="add" [size]="16" />
          Agregar asegurado
        </ui-button>
        <ui-button [disabled]="filtered().length === 0" (click)="exportOpen.set(true)">
          <ui-icon name="download" [size]="14" />
          Exportar reporte
        </ui-button>
      </div>
    </ui-page-header>

    <div class="centinela-kpi-row">
      <ui-kpi-small label="Total" [value]="stats().total + ''" icon="group" tone="brand" />
      <ui-kpi-small label="En mora" [value]="stats().mora + ''" icon="report" tone="red" />
      <ui-kpi-small label="Alertas acumuladas" [value]="stats().alertas + ''" icon="warning" tone="yellow" />
      <ui-kpi-small label="Monto total" [value]="formatMoney(stats().monto)" icon="payments" />
    </div>

    <div class="centinela-list-toolbar">
      <div class="centinela-list-toolbar__search">
        <ui-icon name="search" [size]="16" class="text-ink-3 shrink-0" />
        <input
          type="search"
          data-keyboard-search
          placeholder="Buscar por nombre, ciudad o segmento…"
          [value]="search()"
          (input)="search.set($any($event.target).value)"
        />
      </div>
      <div class="centinela-list-toolbar__filters">
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
  private readonly aseguradoNavigation = inject(AseguradoNavigationStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shortcuts = inject(KeyboardShortcutsService);

  protected readonly search = signal<string>('');
  protected readonly mora = signal<MoraFilter>('todos');
  protected readonly page = signal<number>(0);
  protected readonly pageSize = signal<number>(25);
  protected readonly listFocusIndex = signal(-1);
  protected readonly exportOpen = signal<boolean>(false);
  protected readonly aseguradoColumns = ASEGURADO_EXPORT_COLUMNS;

  protected readonly formOpen = signal<boolean>(false);
  protected readonly formMode = signal<'create' | 'edit'>('create');
  protected readonly formTarget = signal<Asegurado | null>(null);

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

  protected readonly focusedRowId = computed(() => {
    const rows = this.paged();
    const index = this.listFocusIndex();
    return index >= 0 && index < rows.length ? rows[index].id : null;
  });

  constructor() {
    bindListKeyboardNav(this.destroyRef, this.shortcuts, {
      scopeTitle: 'Asegurados',
      rows: () => this.paged(),
      focusedIndex: this.listFocusIndex,
      onOpen: (id) => this.openAsegurado(id),
    });
  }

  protected readonly previewRows = computed(() =>
    this.filtered().slice(0, 3).map(projectAsegurado),
  );

  protected readonly exportFilename = computed(() => `centinela-asegurados-${todayStamp()}`);

  protected openAsegurado(id: string): void {
    navigateToAseguradoDetail(
      this.router,
      this.aseguradoNavigation,
      id,
      this.filtered().map((asegurado) => asegurado.id),
    );
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
