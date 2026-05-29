import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { Chip } from '@shared/ui/chip';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { PageHeader } from '@shared/ui/page-header';
import { Pagination } from '@shared/ui/pagination';
import { SegmentedTabs, type SegmentedTab } from '@shared/ui/segmented-tabs';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { ClaimsTable } from '../components/claims-table';
import { BandejaFilters, type BandejaFilterState } from '../components/bandeja-filters';
import { ClaimsStore } from '@core/state/claims.store';
import type { Claim } from '@shared/models';
import { byTriagePriority, type RiskTier } from '@shared/utils';

type TabKey = 'activos' | 'historico';
type TierFilter = 'todos' | RiskTier | 'rebotados';

const DEFAULT_FILTER_STATE: BandejaFilterState = {
  search: '',
  ramo: '',
  ciudad: '',
  datePreset: 'todos',
  customFrom: '',
  customTo: '',
};

@Component({
  selector: 'page-claims-list',
  standalone: true,
  imports: [Chip, Icon, KpiSmall, PageHeader, Pagination, SegmentedTabs, SkeletonTable, ClaimsTable, BandejaFilters],
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
          <div class="flex items-center gap-1.5 flex-wrap">
            @if (tab() === 'activos') {
              <ui-chip [active]="tierFilter() === 'todos'" (click)="setTier('todos')">Todos</ui-chip>
              @if (kpis().rebotados > 0) {
                <ui-chip [active]="tierFilter() === 'rebotados'" (click)="setTier('rebotados')">
                  <ui-icon name="restart_alt" [size]="11" /> Rebotados ({{ kpis().rebotados }})
                </ui-chip>
              }
            }
            <ui-chip [active]="tierFilter() === 'rojo'" (click)="setTier('rojo')">
              <span class="tier-dot tier-dot-r" style="box-shadow: none"></span> Alto
            </ui-chip>
            <ui-chip [active]="tierFilter() === 'amarillo'" (click)="setTier('amarillo')">
              <span class="tier-dot tier-dot-y" style="box-shadow: none"></span> Medio
            </ui-chip>
            <ui-chip [active]="tierFilter() === 'verde'" (click)="setTier('verde')">
              <span class="tier-dot tier-dot-g" style="box-shadow: none"></span> Bajo
            </ui-chip>
          </div>
        </div>

        <div class="centinela-panel__toolbar">
          <claims-bandeja-filters
            [state]="filterState()"
            [ramos]="availableRamos()"
            [ciudades]="availableCiudades()"
            (stateChange)="onFilterChange($event)"
            (resetFilters)="resetFilters()"
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
            <claims-table [claims]="paged()" (open)="openCase($event)" />
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
  `,
})
export class ClaimsListPage {
  protected readonly store = inject(ClaimsStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tab = signal<TabKey>('activos');
  protected readonly tierFilter = signal<TierFilter>('todos');
  protected readonly page = signal<number>(0);
  protected readonly pageSize = signal<number>(10);

  // Seed search from ?q= URL param (e.g. after importing multiple cases)
  protected readonly filterState = signal<BandejaFilterState>({
    ...DEFAULT_FILTER_STATE,
    search: this.route.snapshot.queryParamMap.get('q') ?? '',
  });

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

  protected readonly availableRamos = computed<string[]>(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of this.store.claims()) {
      if (c.ramo && !seen.has(c.ramo)) {
        seen.add(c.ramo);
        result.push(c.ramo);
      }
    }
    return result.sort();
  });

  protected readonly availableCiudades = computed<string[]>(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of this.store.claims()) {
      if (c.ciudad && !seen.has(c.ciudad)) {
        seen.add(c.ciudad);
        result.push(c.ciudad);
      }
    }
    return result.sort();
  });

  protected readonly filtered = computed<Claim[]>(() => {
    const list = this.store.claims();
    const t = this.tab();
    const tier = this.tierFilter();
    const fs = this.filterState();
    const q = fs.search.toLowerCase().trim();
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
        if (fs.ramo && c.ramo !== fs.ramo) return false;
        if (fs.ciudad && c.ciudad !== fs.ciudad) return false;
        if (fs.datePreset !== 'todos') {
          const reportDate = new Date(c.fecha_reporte || c.fecha_ocurrencia);
          if (!isNaN(reportDate.getTime())) {
            if (fs.datePreset === '7d') {
              const cutoff = new Date(today);
              cutoff.setDate(cutoff.getDate() - 7);
              if (reportDate < cutoff) return false;
            } else if (fs.datePreset === '30d') {
              const cutoff = new Date(today);
              cutoff.setDate(cutoff.getDate() - 30);
              if (reportDate < cutoff) return false;
            } else if (fs.datePreset === 'custom') {
              if (fs.customFrom) {
                const from = new Date(fs.customFrom);
                if (!isNaN(from.getTime()) && reportDate < from) return false;
              }
              if (fs.customTo) {
                const to = new Date(fs.customTo);
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

  protected readonly paged = computed(() => {
    const list = this.filtered();
    const start = this.page() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  protected onTab(key: string): void {
    this.tab.set(key as TabKey);
    this.setTier('todos');
    this.page.set(0);
  }

  protected onPageSize(n: number): void {
    this.pageSize.set(n);
    this.page.set(0);
  }

  protected setTier(t: TierFilter): void {
    this.tierFilter.set(t);
    this.page.set(0);
  }

  protected onFilterChange(patch: Partial<BandejaFilterState>): void {
    this.filterState.update((s) => ({ ...s, ...patch }));
    this.page.set(0);
  }

  protected resetFilters(): void {
    this.filterState.set({ ...DEFAULT_FILTER_STATE });
    this.page.set(0);
  }

  protected openCase(id: string): void {
    void this.router.navigate(['/claims', id]);
  }
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
