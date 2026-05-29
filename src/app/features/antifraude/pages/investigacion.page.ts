import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '@shared/ui/button';
import { ExportModal, type ExportRequest } from '@shared/ui/export-modal';
import { Icon } from '@shared/ui/icon';
import { PageHeader } from '@shared/ui/page-header';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { RAMOS, navigateToClaimDetail, reviewStatusLabel, bindListKeyboardNav, type RamoKey, type RiskTier } from '@shared/utils';
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
import { ClaimNavigationStore } from '@core/state/claim-navigation.store';
import { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';

type StatusFilter = InvestigationStatusFilter;
type TierFilter = InvestigationTierFilter;
type CategoryFilter = InvestigationCategoryFilter;

interface ActiveFilterTag {
  key: keyof InvestigationFilters;
  label: string;
}

const EMPTY_FILTERS = EMPTY_INVESTIGATION_FILTERS;

const TIER_LABELS: Record<RiskTier, string> = {
  rojo: 'Alto',
  amarillo: 'Medio',
  verde: 'Bajo',
};

const STATUS_LABELS: Record<Exclude<StatusFilter, 'todos'>, string> = {
  pendiente: reviewStatusLabel('pendiente'),
  escalado: reviewStatusLabel('escalado'),
  en_revision: reviewStatusLabel('en_revision'),
  dictaminado: reviewStatusLabel('dictaminado'),
  revisado_sin_escalar: reviewStatusLabel('revisado_sin_escalar'),
};

@Component({
  selector: 'page-antifraude-investigacion',
  standalone: true,
  imports: [
    Button,
    ExportModal,
    Icon,
    PageHeader,
    InvestigacionTable,
    Pagination,
    SavedFiltersModal,
    SkeletonTable,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Investigación Avanzada">
      <p class="centinela-page-header__desc" ngProjectAs="[description]">
        Vista completa de todos los siniestros. Cruza patrones por proveedor, asegurado y ramo.
      </p>
      <ui-button
        ngProjectAs="[actions]"
        variant="primary"
        [disabled]="filtered().length === 0"
        (click)="exportOpen.set(true)"
      >
        <ui-icon name="download" [size]="15" />
        Exportar reporte
      </ui-button>
    </ui-page-header>

    <div class="centinela-filter-panel">
      <button
        type="button"
        class="centinela-filter-panel__toggle md:hidden"
        (click)="filtersOpen.update((open) => !open)"
        [attr.aria-expanded]="filtersOpen()"
      >
        <span class="inline-flex items-center gap-2 min-w-0">
          <ui-icon name="tune" [size]="16" class="shrink-0" />
          <span class="truncate">Filtros</span>
          @if (activeFilterTags().length > 0) {
            <span class="centinela-filter-panel__toggle-badge">{{ activeFilterTags().length }}</span>
          }
        </span>
        <ui-icon [name]="filtersOpen() ? 'expand_less' : 'expand_more'" [size]="18" class="shrink-0 text-ink-3" />
      </button>

      <div class="centinela-filter-panel__head hidden md:flex">
        <span class="centinela-filter-panel__title">Filtros</span>
        <button type="button" class="centinela-filter-panel__saved" (click)="savedFiltersOpen.set(true)">
          <ui-icon name="bookmark" [size]="14" />
          Filtros guardados
        </button>
      </div>

      <div
        class="centinela-filter-panel__body"
        [class.centinela-filter-panel__body--open]="filtersOpen()"
      >
        <div class="centinela-filter-panel__grid">
          <label class="centinela-filter-field">
            <span class="centinela-filter-field__label">Riesgo IA</span>
            <span class="centinela-field">
              <select
                [value]="filters().tier"
                (change)="patchFilter('tier', $any($event.target).value)"
              >
                <option value="todos">Todos</option>
                <option value="rojo">Alto</option>
                <option value="amarillo">Medio</option>
                <option value="verde">Bajo</option>
              </select>
            </span>
          </label>

          <label class="centinela-filter-field">
            <span class="centinela-filter-field__label">Ramo</span>
            <span class="centinela-field">
              <select
                [value]="filters().ramo"
                (change)="patchFilter('ramo', $any($event.target).value)"
              >
                <option value="todos">Todos</option>
                @for (ramo of ramoFilters; track ramo.key) {
                  <option [value]="ramo.key">{{ ramo.label }}</option>
                }
              </select>
            </span>
          </label>

          <label class="centinela-filter-field">
            <span class="centinela-filter-field__label">Ciudad</span>
            <span class="centinela-field">
              <ui-icon name="location_on" [size]="14" class="shrink-0" />
              <select
                [value]="filters().city"
                (change)="patchFilter('city', $any($event.target).value)"
              >
                <option value="">Todas</option>
                @for (city of cityOptions(); track city) {
                  <option [value]="city">{{ city }}</option>
                }
              </select>
            </span>
          </label>

          <label class="centinela-filter-field">
            <span class="centinela-filter-field__label">Desde</span>
            <span class="centinela-field">
              <ui-icon name="calendar_today" [size]="14" class="shrink-0" />
              <input
                type="date"
                [value]="filters().dateFrom"
                (input)="patchFilter('dateFrom', $any($event.target).value)"
              />
            </span>
          </label>

          <label class="centinela-filter-field centinela-filter-field--wide">
            <span class="centinela-filter-field__label">Estado</span>
            <span class="centinela-field">
              <select
                [value]="filters().status"
                (change)="patchFilter('status', $any($event.target).value)"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">{{ reviewStatusLabel('pendiente') }}</option>
                <option value="escalado">{{ reviewStatusLabel('escalado') }}</option>
                <option value="en_revision">{{ reviewStatusLabel('en_revision') }}</option>
                <option value="dictaminado">{{ reviewStatusLabel('dictaminado') }}</option>
                <option value="revisado_sin_escalar">{{ reviewStatusLabel('revisado_sin_escalar') }}</option>
              </select>
            </span>
          </label>
        </div>
      </div>

      <div class="centinela-filter-panel__foot">
        <div class="centinela-filter-panel__tags">
          @if (activeFilterTags().length === 0) {
            <span class="centinela-filter-panel__empty">Sin filtros activos</span>
          } @else {
            @for (tag of activeFilterTags(); track tag.key) {
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] bg-soft text-ink-2 border border-line">
                {{ tag.label }}
                <button
                  type="button"
                  class="border-0 bg-transparent p-0 cursor-pointer text-ink-3 hover:text-ink grid place-items-center"
                  (click)="removeFilter(tag.key)"
                  [attr.aria-label]="'Quitar filtro ' + tag.label"
                >
                  <ui-icon name="close" [size]="13" />
                </button>
              </span>
            }
          }
        </div>
        <div class="centinela-filter-panel__foot-actions">
          <button type="button" class="centinela-filter-panel__saved md:hidden" (click)="savedFiltersOpen.set(true)">
            <ui-icon name="bookmark" [size]="14" />
            Filtros guardados
          </button>
          @if (activeFilterTags().length > 0) {
            <button type="button" class="centinela-filter-panel__clear" (click)="clearFilters()">
              Limpiar
            </button>
          }
        </div>
      </div>
    </div>

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
        <investigacion-table
          [claims]="paged()"
          [focusedId]="focusedRowId()"
          (open)="openCase($event)"
        />
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
  private readonly claimNavigation = inject(ClaimNavigationStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shortcuts = inject(KeyboardShortcutsService);

  protected reload(): void {
    void this.store.loadList();
  }

  protected readonly filters = signal<InvestigationFilters>({ ...EMPTY_FILTERS });
  protected readonly filtersOpen = signal<boolean>(false);
  protected readonly page = signal<number>(0);
  protected readonly pageSize = signal<number>(10);
  protected readonly listFocusIndex = signal(-1);
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

  protected readonly activeFilterTags = computed<ActiveFilterTag[]>(() => {
    const filterState = this.filters();
    const tags: ActiveFilterTag[] = [];

    if (filterState.tier !== 'todos') {
      tags.push({ key: 'tier', label: `Riesgo IA: ${TIER_LABELS[filterState.tier]}` });
    }
    if (filterState.ramo !== 'todos') {
      tags.push({ key: 'ramo', label: `Ramo: ${RAMOS[filterState.ramo].label}` });
    }
    if (filterState.city) {
      tags.push({ key: 'city', label: `Ciudad: ${filterState.city}` });
    }
    if (filterState.dateFrom) {
      tags.push({ key: 'dateFrom', label: `Fecha desde: ${formatFilterDate(filterState.dateFrom)}` });
    }
    if (filterState.status !== 'todos') {
      tags.push({ key: 'status', label: `Estado: ${STATUS_LABELS[filterState.status]}` });
    }

    return tags;
  });

  protected readonly filtered = computed<Claim[]>(() => {
    const list = this.store.claims();
    const filterState = this.filters();

    return list
      .filter((claim) => this.matchesFilters(claim, filterState))
      .sort((a, b) => b.score - a.score);
  });

  protected readonly paged = computed(() => {
    const list = this.filtered();
    const start = this.page() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  protected readonly focusedRowId = computed(() => {
    const rows = this.paged();
    const index = this.listFocusIndex();
    return index >= 0 && index < rows.length ? rows[index].id : null;
  });

  constructor() {
    bindListKeyboardNav(this.destroyRef, this.shortcuts, {
      scopeTitle: 'Investigación',
      rows: () => this.paged(),
      focusedIndex: this.listFocusIndex,
      onOpen: (id) => this.openCase(id),
    });
  }

  protected readonly previewRows = computed(() => this.filtered().slice(0, 3).map(projectClaim));

  protected readonly exportFilename = computed(() => `centinela-siniestros-${todayStamp()}`);

  protected patchFilter<K extends keyof InvestigationFilters>(key: K, value: InvestigationFilters[K]): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
    this.page.set(0);
  }

  protected clearFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
    this.page.set(0);
  }

  protected removeFilter(key: keyof InvestigationFilters): void {
    const resetValue = key === 'city' || key === 'dateFrom' ? '' : 'todos';
    this.filters.update((current) => ({ ...current, [key]: resetValue }));
    this.page.set(0);
  }

  protected onPageSize(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(0);
  }

  protected openCase(id: string): void {
    const ids = this.filtered().map((claim) => claim.id);
    navigateToClaimDetail(this.router, this.claimNavigation, id, ids);
    this.store.prefetchNeighborDetails(ids, id, 2);
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
    if (filters.status !== 'todos' && claim.review.status !== filters.status) return false;
    if (filters.tier !== 'todos' && claim.nivel !== filters.tier) return false;
    if (filters.ramo !== 'todos' && claim.ramo !== filters.ramo) return false;

    if (filters.city && claim.ciudad !== filters.city) return false;

    if (filters.dateFrom && claim.fecha_ocurrencia < filters.dateFrom) return false;

    return true;
  }
}

function formatFilterDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
