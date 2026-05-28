import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { RAMOS, reviewStatusLabel, type RamoKey, type RiskTier } from '@shared/utils';
import type { Claim } from '@shared/models';
import { InvestigacionTable } from '../components/investigacion-table';
import { ClaimsStore } from '@core/state/claims.store';

type StatusFilter = 'todos' | 'pendiente' | 'escalado' | 'en_revision' | 'dictaminado' | 'revisado_sin_escalar';
type TierFilter = 'todos' | RiskTier;
type CategoryFilter = 'todos' | RamoKey;

interface InvestigationFilters {
  tier: TierFilter;
  ramo: CategoryFilter;
  city: string;
  dateFrom: string;
  status: StatusFilter;
}

interface ActiveFilterTag {
  key: keyof InvestigationFilters;
  label: string;
}

const EMPTY_FILTERS: InvestigationFilters = {
  tier: 'todos',
  ramo: 'todos',
  city: '',
  dateFrom: '',
  status: 'todos',
};

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
  imports: [Button, Icon, Pagination, SkeletonTable, InvestigacionTable],
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
        <ui-button variant="secondary">
          <ui-icon name="tune" [size]="15" />
          Filtros guardados
        </ui-button>
        <ui-button variant="primary">
          <ui-icon name="download" [size]="15" />
          Exportar reporte
        </ui-button>
      </div>
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1 mb-4">
      <div class="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <label class="block min-w-0">
          <span class="text-[12px] font-medium text-ink-2 mb-1.5 block">Nivel de riesgo IA</span>
          <select
            class="w-full bg-surface border border-line rounded-md px-3 py-2 text-[13px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-2"
            [value]="filters().tier"
            (change)="patchFilter('tier', $any($event.target).value)"
          >
            <option value="todos">Todos</option>
            <option value="rojo">Alto</option>
            <option value="amarillo">Medio</option>
            <option value="verde">Bajo</option>
          </select>
        </label>

        <label class="block min-w-0">
          <span class="text-[12px] font-medium text-ink-2 mb-1.5 block">Ramo asegurador</span>
          <select
            class="w-full bg-surface border border-line rounded-md px-3 py-2 text-[13px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-2"
            [value]="filters().ramo"
            (change)="patchFilter('ramo', $any($event.target).value)"
          >
            <option value="todos">Todos</option>
            @for (ramo of ramoFilters; track ramo.key) {
              <option [value]="ramo.key">{{ ramo.label }}</option>
            }
          </select>
        </label>

        <label class="block min-w-0">
          <span class="text-[12px] font-medium text-ink-2 mb-1.5 block">Ciudad o región</span>
          <div class="flex items-center gap-2 bg-surface border border-line rounded-md px-3 py-2">
            <ui-icon name="location_on" [size]="16" class="text-ink-3 shrink-0" />
            <select
              class="flex-1 border-0 outline-0 bg-transparent text-[13px] text-ink min-w-0 cursor-pointer focus-visible:outline-none"
              [value]="filters().city"
              (change)="patchFilter('city', $any($event.target).value)"
            >
              <option value="">Todas</option>
              @for (city of cityOptions(); track city) {
                <option [value]="city">{{ city }}</option>
              }
            </select>
          </div>
        </label>

        <label class="block min-w-0">
          <span class="text-[12px] font-medium text-ink-2 mb-1.5 block">Fecha desde</span>
          <div class="flex items-center gap-2 bg-surface border border-line rounded-md px-3 py-2">
            <ui-icon name="calendar_today" [size]="16" class="text-ink-3 shrink-0" />
            <input
              type="date"
              class="flex-1 border-0 outline-0 bg-transparent text-[13px] text-ink min-w-0"
              [value]="filters().dateFrom"
              (input)="patchFilter('dateFrom', $any($event.target).value)"
            />
          </div>
        </label>

        <label class="block min-w-0">
          <span class="text-[12px] font-medium text-ink-2 mb-1.5 block">Estado de revisión</span>
          <select
            class="w-full bg-surface border border-line rounded-md px-3 py-2 text-[13px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-2"
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
        </label>
      </div>

      <div class="px-5 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 min-h-[28px]">
          @if (activeFilterTags().length === 0) {
            <span class="text-[12px] text-ink-3 italic">Sin filtros activos</span>
          } @else {
            @for (tag of activeFilterTags(); track tag.key) {
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-soft text-ink-2 border border-line">
                {{ tag.label }}
                <button
                  type="button"
                  class="border-0 bg-transparent p-0 cursor-pointer text-ink-3 hover:text-ink grid place-items-center"
                  (click)="removeFilter(tag.key)"
                  [attr.aria-label]="'Quitar filtro ' + tag.label"
                >
                  <ui-icon name="close" [size]="14" />
                </button>
              </span>
            }
          }
        </div>
        <div class="flex items-center gap-2 shrink-0">
          @if (activeFilterTags().length > 0) {
            <button
              type="button"
              class="text-[13px] text-ink-3 hover:text-ink bg-transparent border-0 cursor-pointer px-2 py-1"
              (click)="clearFilters()"
            >
              Limpiar filtros
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
    void this.router.navigate(['/claims', id]);
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
