import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';
import { ExportButton } from '@shared/ui/export-button';
import { ExportModal, type ExportRequest } from '@shared/ui/export-modal';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { PageHeader } from '@shared/ui/page-header';
import { Pagination } from '@shared/ui/pagination';
import { SegmentedTabs, type SegmentedTab } from '@shared/ui/segmented-tabs';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { FilterBar, type FilterControl, type FilterValue } from '@shared/ui/filter-bar';
import { ClaimsTable } from '../components/claims-table';
import { ClaimsStore } from '@core/state/claims.store';
import type { Claim } from '@shared/models';
import {
  bindListKeyboardNav,
  byTriagePriority,
  CLAIM_EXPORT_COLUMNS,
  exportClaims,
  normalizeRamoKey,
  projectClaim,
  RAMO_KEYS,
  RAMOS,
  sortRows,
  TableSortController,
  type RamoKey,
  type RiskTier,
  type SortAccessors,
} from '@shared/utils';

type TabKey = 'activos' | 'historico';
type TierFilter = 'todos' | RiskTier | 'rebotados';
type DateRangePreset = 'todos' | '7d' | '30d' | 'custom';

@Component({
  selector: 'page-claims-list',
  standalone: true,
  imports: [
    Icon,
    KpiSmall,
    PageHeader,
    Pagination,
    SegmentedTabs,
    SkeletonTable,
    FilterBar,
    ClaimsTable,
    ExportButton,
    ExportModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="centinela-viewport-page">
      <ui-page-header eyebrow="Bandeja de triaje" [title]="greeting()" [compact]="true">
        <p class="centinela-page-header__desc" ngProjectAs="[description]">
          @if (kpis().pendientes > 0) {
            Tienes <b class="text-tier-red-ink">{{ kpis().pendientes }} casos</b> esperando tu decisión de triaje.
          } @else {
            Sin casos pendientes — te puedes enfocar en seguimiento.
          }
          @if (kpis().rebotados > 0) {
            <span class="ml-1.5 text-tier-yellow-ink">· {{ kpis().rebotados }} caso{{ kpis().rebotados > 1 ? 's' : '' }} rebotado{{ kpis().rebotados > 1 ? 's' : '' }} de Antifraude.</span>
          }
        </p>
        <div ngProjectAs="[actions]">
          <ui-export-button
            label="Exportar reporte"
            [disabled]="filtered().length === 0"
            (trigger)="exportOpen.set(true)"
          />
        </div>
      </ui-page-header>

      <div class="centinela-kpi-row">
        <ui-kpi-small label="Por triagear hoy" [value]="kpis().pendientes" icon="inbox" tone="brand" />
        <ui-kpi-small label="Escalados (míos)" [value]="kpis().escalados" icon="flag" tone="yellow" />
        <ui-kpi-small label="Rebotados" [value]="kpis().rebotados" icon="restart_alt" [tone]="kpis().rebotados > 0 ? 'red' : 'default'" />
        <ui-kpi-small label="T. medio decisión" value="2h 41m" icon="schedule" />
      </div>

      <div class="centinela-panel centinela-panel--fill">
        <div class="centinela-panel__head">
          <div class="flex items-center gap-3.5 flex-wrap">
            <h2 class="centinela-panel__title">Mi bandeja</h2>
            <ui-segmented-tabs [tabs]="tabs()" [active]="tab()" (select)="onTab($any($event))" />
          </div>
        </div>

        <div class="centinela-panel__toolbar">
          <ui-filter-bar
            [controls]="filterControls()"
            [value]="filters()"
            (valueChange)="filters.set($event)"
          />
        </div>

        @if (store.loading() && store.claims().length === 0) {
          <div class="centinela-panel__scroll">
            <ui-skeleton-table [rows]="8" [cols]="6" />
          </div>
        } @else if (filtered().length === 0) {
          <div class="centinela-panel__scroll">
            <div class="centinela-empty centinela-empty--compact">
              <div class="centinela-empty__icon">
                <ui-icon name="inbox" [size]="22" />
              </div>
              @if (tab() === 'activos') {
                Sin casos activos con los filtros seleccionados.
              } @else {
                Todavía no tienes casos en histórico.
              }
            </div>
          </div>
        } @else {
          <div class="centinela-panel__scroll">
            <claims-table [claims]="paged()" [sort]="sort" [focusedId]="focusedRowId()" (open)="openCase($event)" />
          </div>
          <ui-pagination
            [page]="page()"
            [pageSize]="pageSize()"
            [total]="filtered().length"
            (pageChange)="page.set($event)"
            (pageSizeChange)="onPageSize($event)"
          />
        }
      </div>
    </div>

    <ui-export-modal
      [open]="exportOpen()"
      title="Exportar bandeja de triaje"
      subtitle="Genera un archivo con los siniestros que coinciden con la pestaña y los filtros actuales."
      [columns]="claimColumns"
      [defaultFilename]="exportFilename()"
      [totalRows]="filtered().length"
      [previewRows]="previewRows()"
      (close)="exportOpen.set(false)"
      (download)="onExport($event)"
    />
  `,
})
export class ClaimsListPage {
  protected readonly store = inject(ClaimsStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shortcuts = inject(KeyboardShortcutsService);

  protected readonly tab = signal<TabKey>('activos');
  protected readonly sort = new TableSortController();
  protected readonly page = signal<number>(0);
  protected readonly pageSize = signal<number>(10);
  protected readonly listFocusIndex = signal(-1);
  protected readonly exportOpen = signal<boolean>(false);
  protected readonly claimColumns = CLAIM_EXPORT_COLUMNS;

  // Seed filters from URL params (e.g. ?q= after import, ?ciudad=/?ramo= from Insights drill-downs)
  protected readonly filters = signal<FilterValue>({
    search: this.route.snapshot.queryParamMap.get('q') ?? '',
    ramo: this.route.snapshot.queryParamMap.get('ramo') ?? '',
    ciudad: this.route.snapshot.queryParamMap.get('ciudad') ?? '',
    datePreset: 'todos',
    customFrom: '',
    customTo: '',
    tier: 'todos',
  });

  constructor() {
    bindListKeyboardNav(this.destroyRef, this.shortcuts, {
      rows: () => this.paged(),
      focusedIndex: this.listFocusIndex,
      onOpen: (id) => this.openCase(id),
    });

    // Reset to the first page whenever the filter set changes, so a narrowed
    // result set never leaves the user stranded on a now-empty page.
    effect(() => {
      this.filters();
      this.page.set(0);
    });

    // Re-sorting also jumps back to the first page.
    effect(() => {
      this.sort.key();
      this.sort.dir();
      this.page.set(0);
    });
  }

  protected readonly greeting = computed(() => {
    const name = this.auth.user()?.name?.split(' ')[0] ?? 'Analista';
    return `Hola, ${name}`;
  });

  protected readonly tabs = computed<SegmentedTab[]>(() => {
    const all = this.store.claims();
    const active = all.filter(isActiveForAnalista).length;
    const hist = all.filter(isHistoricForAnalista).length;
    return [
      { key: 'activos', label: 'Activos', count: active },
      { key: 'historico', label: 'Histórico', count: hist },
    ];
  });

  protected readonly kpis = computed(() => {
    const list = this.store.claims();
    const pendientes = list.filter(
      (c) => c.review.status === 'pendiente' && c.review.bounce_count === 0,
    ).length;
    const escalados = list.filter(
      (c) => c.review.status === 'escalado' || c.review.status === 'en_revision',
    ).length;
    const rebotados = list.filter(
      (c) => c.review.status === 'pendiente' && c.review.bounce_count > 0,
    ).length;
    return { pendientes, escalados, rebotados };
  });

  // Canonical ramo categories (matches the Insights donut + backend normalize_ramo)
  protected readonly ramoOptions = computed<RamoKey[]>(() => {
    const seen = new Set<RamoKey>();
    for (const c of this.store.claims()) {
      seen.add(normalizeRamoKey(c.ramo));
    }
    return RAMO_KEYS.filter((key) => seen.has(key));
  });

  protected readonly ciudadOptions = computed<string[]>(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of this.store.claims()) {
      if (c.ciudad && !seen.has(c.ciudad)) {
        seen.add(c.ciudad);
        result.push(c.ciudad);
      }
    }
    return result.sort((a, b) => a.localeCompare(b, 'es'));
  });

  /** Declarative filter-bar controls. Rebotados chip is added conditionally. */
  protected readonly filterControls = computed<FilterControl[]>(() => {
    const rebotados = this.kpis().rebotados;
    const isActivos = this.tab() === 'activos';
    const datePreset = this.filters()['datePreset'] ?? 'todos';

    const tierOptions: { value: string; label: string; icon?: string }[] = [
      { value: 'todos', label: 'Todos' },
    ];
    // Rebotados chip: only visible in the activos tab when count > 0
    if (isActivos && rebotados > 0) {
      tierOptions.push({ value: 'rebotados', label: `Rebotados (${rebotados})`, icon: 'restart_alt' });
    }
    tierOptions.push(
      { value: 'rojo', label: 'Alto', icon: 'circle' },
      { value: 'amarillo', label: 'Medio', icon: 'circle' },
      { value: 'verde', label: 'Bajo', icon: 'circle' },
    );

    const controls: FilterControl[] = [
      { type: 'search', key: 'search', placeholder: 'Buscar ID, asegurado, ciudad…' },
      {
        type: 'select',
        key: 'ramo',
        label: 'Ramo',
        options: [
          { value: '', label: 'Todos los ramos' },
          ...this.ramoOptions().map((key) => ({ value: key, label: RAMOS[key].label })),
        ],
      },
      {
        type: 'select',
        key: 'ciudad',
        label: 'Ciudad',
        icon: 'location_on',
        options: [
          { value: '', label: 'Todas las ciudades' },
          ...this.ciudadOptions().map((c) => ({ value: c, label: c })),
        ],
      },
      {
        type: 'select',
        key: 'datePreset',
        label: 'Fecha',
        emptyValue: 'todos',
        options: [
          { value: 'todos', label: 'Cualquier fecha' },
          { value: '7d', label: 'Últimos 7 días' },
          { value: '30d', label: 'Últimos 30 días' },
          { value: 'custom', label: 'Personalizado' },
        ],
      },
      { type: 'chips', key: 'tier', emptyValue: 'todos', options: tierOptions },
    ];

    // Show custom date range inputs only when the preset is 'custom'
    if (datePreset === 'custom') {
      controls.push(
        { type: 'date', key: 'customFrom', label: 'Desde', icon: 'calendar_today' },
        { type: 'date', key: 'customTo', label: 'Hasta', icon: 'calendar_today' },
      );
    }

    return controls;
  });

  protected readonly filtered = computed<Claim[]>(() => {
    const list = this.store.claims();
    const t = this.tab();
    const f = this.filters();
    const tier = (f['tier'] ?? 'todos') as TierFilter;
    const ramo = f['ramo'] ?? '';
    const ciudad = f['ciudad'] ?? '';
    const datePreset = (f['datePreset'] ?? 'todos') as DateRangePreset;
    const customFrom = f['customFrom'] ?? '';
    const customTo = f['customTo'] ?? '';
    const q = (f['search'] ?? '').toLowerCase().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseSet = list.filter(t === 'activos' ? isActiveForAnalista : isHistoricForAnalista);

    return baseSet
      .filter((c) => {
        if (tier === 'rebotados') {
          if (!(c.review.status === 'pendiente' && c.review.bounce_count > 0)) return false;
        } else if (tier !== 'todos' && c.nivel !== tier) {
          return false;
        }
        if (ramo && normalizeRamoKey(c.ramo) !== ramo) return false;
        if (ciudad && c.ciudad !== ciudad) return false;
        if (datePreset !== 'todos') {
          const reportDate = new Date(c.fecha_reporte || c.fecha_ocurrencia);
          if (!isNaN(reportDate.getTime())) {
            if (datePreset === '7d') {
              const cutoff = new Date(today);
              cutoff.setDate(cutoff.getDate() - 7);
              if (reportDate < cutoff) return false;
            } else if (datePreset === '30d') {
              const cutoff = new Date(today);
              cutoff.setDate(cutoff.getDate() - 30);
              if (reportDate < cutoff) return false;
            } else if (datePreset === 'custom') {
              if (customFrom) {
                const from = new Date(customFrom);
                if (!isNaN(from.getTime()) && reportDate < from) return false;
              }
              if (customTo) {
                const to = new Date(customTo);
                to.setHours(23, 59, 59, 999);
                if (!isNaN(to.getTime()) && reportDate > to) return false;
              }
            }
          }
        }
        if (q) {
          return (
            c.id.toLowerCase().includes(q) ||
            c.asegurado.toLowerCase().includes(q) ||
            c.ciudad.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort(byTriagePriority);
  });

  // Default order = tier→FIFO triage priority; a clicked column overrides it.
  // Sorting the full list here (not inside the table) keeps pagination correct —
  // the table only ever sees one page.
  protected readonly sorted = computed<Claim[]>(() =>
    sortRows(this.filtered(), this.sort.key(), this.sort.dir(), CLAIMS_SORT),
  );

  protected readonly paged = computed(() => {
    const list = this.sorted();
    const start = this.page() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  protected readonly focusedRowId = computed(() => {
    const rows = this.paged();
    const index = this.listFocusIndex();
    return index >= 0 && index < rows.length ? rows[index].id : null;
  });

  protected onTab(key: string): void {
    this.tab.set(key as TabKey);
    // Reset tier filter when switching tabs
    this.filters.update((f) => ({ ...f, tier: 'todos' }));
    this.page.set(0);
  }

  protected onPageSize(n: number): void {
    this.pageSize.set(n);
    this.page.set(0);
  }

  protected readonly previewRows = computed(() => this.filtered().slice(0, 3).map(projectClaim));

  protected readonly exportFilename = computed(
    () => `centinela-bandeja-${this.tab()}-${todayStamp()}`,
  );

  protected onExport(req: ExportRequest): void {
    exportClaims(this.filtered(), req);
  }

  protected openCase(id: string): void {
    void this.router.navigate(['/claims', id]);
  }
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isActiveForAnalista(c: Claim): boolean {
  return (
    c.review.status === 'pendiente' ||
    c.review.status === 'escalado' ||
    c.review.status === 'en_revision'
  );
}

function isHistoricForAnalista(c: Claim): boolean {
  return c.review.status === 'dictaminado' || c.review.status === 'revisado_sin_escalar';
}

const CLAIMS_SORT: SortAccessors<Claim> = {
  score: (c) => c.score,
  id: (c) => c.id,
  asegurado: (c) => c.asegurado,
  cobertura: (c) => c.cobertura,
  ciudad: (c) => c.ciudad,
  monto: (c) => c.monto_reclamado,
  alertas: (c) => c.alertas.length,
  estado: (c) => c.estado,
};
