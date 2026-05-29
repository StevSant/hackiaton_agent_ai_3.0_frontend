import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '@shared/ui/button';
import { ExportButton } from '@shared/ui/export-button';
import { ExportModal, type ExportRequest } from '@shared/ui/export-modal';
import { FilterBar, type FilterControl, type FilterValue } from '@shared/ui/filter-bar';
import { Icon } from '@shared/ui/icon';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { byTriagePriority, RAMOS, reviewStatusLabel, type RamoKey, type RiskTier } from '@shared/utils';
import type { Claim } from '@shared/models';
import { InvestigacionTable } from '../components/investigacion-table';
import { SavedFiltersModal } from '../components/saved-filters-modal';
import { CLAIM_EXPORT_COLUMNS, exportClaims, projectClaim } from '../utils/export-claims';
import {
  EMPTY_INVESTIGATION_FILTERS,
  type InvestigationCategoryFilter,
  type InvestigationFilters,
  type InvestigationStatusFilter,
  type InvestigationTierFilter,
} from '../utils/investigation-filters';
import { ClaimsStore } from '@core/state/claims.store';

type StatusFilter = InvestigationStatusFilter;
type TierFilter = InvestigationTierFilter;
type CategoryFilter = InvestigationCategoryFilter;

const EMPTY_FILTERS = EMPTY_INVESTIGATION_FILTERS;

@Component({
  selector: 'page-antifraude-investigacion',
  standalone: true,
  imports: [
    Button,
    ExportButton,
    ExportModal,
    FilterBar,
    Icon,
    InvestigacionTable,
    Pagination,
    SavedFiltersModal,
    SkeletonTable,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-start justify-between gap-4 py-2 pb-5">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Investigación Avanzada</h1>
        <p class="text-ink-3 text-[13.5px] m-0 max-w-2xl">
          Vista completa de todos los siniestros. Cruza patrones por proveedor, asegurado y ramo.
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <ui-button variant="secondary" (click)="savedFiltersOpen.set(true)">
          <ui-icon name="tune" [size]="15" />
          Filtros guardados
        </ui-button>
        <ui-export-button
          [disabled]="filtered().length === 0"
          (trigger)="exportOpen.set(true)"
        />
      </div>
    </div>

    <ui-filter-bar
      [controls]="filterControls()"
      [value]="filterValue()"
      (valueChange)="onFilterValue($event)"
    />

    @if (store.error(); as err) {
      <div class="bg-tier-red-soft border border-line rounded-lg shadow-1 p-4 mb-4 flex items-center justify-between gap-4">
        <div class="flex items-start gap-2 text-tier-red-ink">
          <ui-icon name="error_outline" [size]="18" class="mt-0.5 shrink-0" />
          <div class="text-[13px]">
            <div class="font-medium">No pudimos cargar los siniestros.</div>
            <div class="text-[12px] opacity-80">{{ err.message }}</div>
          </div>
        </div>
        <ui-button variant="secondary" (click)="reload()">
          <ui-icon name="refresh" [size]="14" />
          Reintentar
        </ui-button>
      </div>
    }

    <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden">
      @if (store.loading()) {
        <ui-skeleton-table [rows]="8" [cols]="7" />
      } @else if (filtered().length === 0) {
        <div class="px-5 py-16 text-center text-ink-3 text-[13px]">
          @if (store.claims().length === 0 && !store.error()) {
            No hay siniestros cargados todavía.
          } @else {
            Sin siniestros con los filtros seleccionados.
          }
        </div>
      } @else {
        <investigacion-table [claims]="paged()" (open)="openCase($event)" />
        <ui-pagination
          variant="numbered"
          noun="siniestros"
          [page]="page()"
          [pageSize]="pageSize()"
          [total]="filtered().length"
          (pageChange)="page.set($event)"
          (pageSizeChange)="onPageSize($event)"
        />
      }
    </div>

    <ui-export-modal
      [open]="exportOpen()"
      title="Exportar siniestros"
      subtitle="Genera un archivo con los siniestros que coinciden con los filtros actuales."
      [columns]="claimColumns"
      [defaultFilename]="exportFilename()"
      [totalRows]="filtered().length"
      [previewRows]="previewRows()"
      (close)="exportOpen.set(false)"
      (download)="onExport($event)"
    />

    <antifraude-saved-filters-modal
      [open]="savedFiltersOpen()"
      [currentFilters]="filters()"
      (close)="savedFiltersOpen.set(false)"
      (load)="onLoadSavedFilter($event)"
    />
  `,
})
export class InvestigacionPage {
  protected readonly store = inject(ClaimsStore);
  private readonly router = inject(Router);

  protected reload(): void {
    void this.store.loadList();
  }

  protected readonly filters = signal<InvestigationFilters>({ ...EMPTY_FILTERS });
  protected readonly page = signal<number>(0);
  protected readonly pageSize = signal<number>(10);
  protected readonly exportOpen = signal<boolean>(false);
  protected readonly savedFiltersOpen = signal<boolean>(false);
  protected readonly claimColumns = CLAIM_EXPORT_COLUMNS;

  protected readonly ramoFilters = (Object.keys(RAMOS) as RamoKey[]).map((key) => ({
    key,
    label: RAMOS[key].label,
  }));

  protected readonly cityOptions = computed(() => {
    const cities = new Set<string>();
    for (const claim of this.store.claims()) {
      const cityName = claim.ciudad.trim();
      if (cityName) cities.add(cityName);
    }
    return [...cities].sort((a, b) => a.localeCompare(b, 'es'));
  });

  protected readonly filterControls = computed<FilterControl[]>(() => [
    { type: 'search', key: 'search', placeholder: 'Buscar por ID o asegurado…' },
    {
      type: 'select',
      key: 'tier',
      label: 'Riesgo IA',
      emptyValue: 'todos',
      options: [
        { value: 'todos', label: 'Todos' },
        { value: 'rojo', label: 'Alto' },
        { value: 'amarillo', label: 'Medio' },
        { value: 'verde', label: 'Bajo' },
      ],
    },
    {
      type: 'select',
      key: 'ramo',
      label: 'Ramo',
      emptyValue: 'todos',
      options: [
        { value: 'todos', label: 'Todos' },
        ...this.ramoFilters.map((r) => ({ value: r.key, label: r.label })),
      ],
    },
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
    { type: 'date', key: 'dateFrom', label: 'Fecha desde' },
    {
      type: 'select',
      key: 'status',
      label: 'Estado',
      emptyValue: 'todos',
      options: [
        { value: 'todos', label: 'Todos' },
        { value: 'pendiente', label: reviewStatusLabel('pendiente') },
        { value: 'escalado', label: reviewStatusLabel('escalado') },
        { value: 'en_revision', label: reviewStatusLabel('en_revision') },
        { value: 'dictaminado', label: reviewStatusLabel('dictaminado') },
        { value: 'revisado_sin_escalar', label: reviewStatusLabel('revisado_sin_escalar') },
      ],
    },
  ]);

  protected readonly filterValue = computed<FilterValue>(() => {
    const f = this.filters();
    return {
      search: f.search,
      tier: f.tier,
      ramo: f.ramo,
      city: f.city,
      dateFrom: f.dateFrom,
      status: f.status,
    };
  });

  protected onFilterValue(v: FilterValue): void {
    this.filters.set({
      search: v['search'] ?? '',
      tier: (v['tier'] ?? 'todos') as InvestigationFilters['tier'],
      ramo: (v['ramo'] ?? 'todos') as InvestigationFilters['ramo'],
      city: v['city'] ?? '',
      dateFrom: v['dateFrom'] ?? '',
      status: (v['status'] ?? 'todos') as InvestigationFilters['status'],
    });
    this.page.set(0);
  }

  protected readonly filtered = computed<Claim[]>(() => {
    const list = this.store.claims();
    const filterState = this.filters();

    return list
      .filter((claim) => this.matchesFilters(claim, filterState))
      .sort(byTriagePriority);
  });

  protected readonly paged = computed(() => {
    const list = this.filtered();
    const start = this.page() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  protected readonly previewRows = computed(() => this.filtered().slice(0, 3).map(projectClaim));

  protected readonly exportFilename = computed(() => `centinela-siniestros-${todayStamp()}`);

  protected onPageSize(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(0);
  }

  protected openCase(id: string): void {
    void this.router.navigate(['/claims', id]);
  }

  protected onExport(req: ExportRequest): void {
    exportClaims(this.filtered(), req);
  }

  protected onLoadSavedFilter(filters: InvestigationFilters): void {
    this.filters.set({ ...EMPTY_FILTERS, ...filters });
    this.page.set(0);
  }

  protected readonly reviewStatusLabel = reviewStatusLabel;

  private matchesFilters(claim: Claim, filters: InvestigationFilters): boolean {
    const term = filters.search.trim().toLowerCase();
    if (term) {
      const hay = `${claim.id} ${claim.asegurado ?? ''}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (filters.status !== 'todos' && claim.review.status !== filters.status) return false;
    if (filters.tier !== 'todos' && claim.nivel !== filters.tier) return false;
    if (filters.ramo !== 'todos' && claim.ramo !== filters.ramo) return false;

    if (filters.city && claim.ciudad !== filters.city) return false;

    if (filters.dateFrom && claim.fecha_ocurrencia < filters.dateFrom) return false;

    return true;
  }
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
