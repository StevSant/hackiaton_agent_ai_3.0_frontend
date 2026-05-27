import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { Chip } from '@shared/ui/chip';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { Pagination } from '@shared/ui/pagination';
import { SegmentedTabs, type SegmentedTab } from '@shared/ui/segmented-tabs';
import { ClaimsTable } from '../components/claims-table';
import { ClaimsStore } from '../services/claims.store';
import type { Claim } from '../models';
import type { RiskTier } from '@shared/utils';

type TabKey = 'activos' | 'historico';
type TierFilter = 'todos' | RiskTier | 'rebotados';

@Component({
  selector: 'page-claims-list',
  standalone: true,
  imports: [Chip, Icon, KpiSmall, Pagination, SegmentedTabs, ClaimsTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">{{ greeting() }}</h1>
        <p class="text-ink-3 text-[13.5px] m-0">
          @if (kpis().pendientes > 0) {
            Tienes <b class="text-tier-red-ink">{{ kpis().pendientes }} casos</b> esperando tu decisión de triaje.
          } @else {
            Sin casos pendientes — te puedes enfocar en seguimiento.
          }
          @if (kpis().rebotados > 0) {
            <span class="ml-1.5 text-tier-yellow-ink">·  {{ kpis().rebotados }} caso{{ kpis().rebotados > 1 ? 's' : '' }} rebotado{{ kpis().rebotados > 1 ? 's' : '' }} de Antifraude.</span>
          }
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 bg-surface border border-line rounded-md px-3 py-1.5 w-[280px] text-ink-3 text-[13px] shadow-1">
          <ui-icon name="search" [size]="16" />
          <input
            type="text"
            placeholder="Buscar por ID, asegurado, ciudad…"
            class="flex-1 border-0 outline-0 bg-transparent text-ink min-w-0"
            [value]="search()"
            (input)="onSearch($any($event.target).value)"
          />
          <kbd class="text-[10.5px] text-ink-4 border border-line px-1.5 py-px rounded bg-canvas font-sans">⌘K</kbd>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-3 mb-5">
      <ui-kpi-small label="Por triagear hoy" [value]="kpis().pendientes" icon="inbox" tone="brand" />
      <ui-kpi-small label="Escalados (míos)" [value]="kpis().escalados" icon="flag" tone="yellow" />
      <ui-kpi-small label="Rebotados" [value]="kpis().rebotados" icon="restart_alt" [tone]="kpis().rebotados > 0 ? 'red' : 'default'" />
      <ui-kpi-small label="T. medio decisión" value="2h 41m" icon="schedule" />
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line flex-wrap">
        <div class="flex items-center gap-3.5">
          <h3 class="text-[13px] font-semibold m-0">Mi bandeja</h3>
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
      @if (filtered().length === 0) {
        <div class="px-5 py-12 text-center text-ink-3 text-[13px]">
          @if (tab() === 'activos') {
            Sin casos activos con los filtros seleccionados.
          } @else {
            Todavía no tienes casos en histórico.
          }
        </div>
      } @else {
        <claims-table [claims]="paged()" (open)="openCase($event)" />
        <ui-pagination
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
export class ClaimsListPage {
  private readonly store = inject(ClaimsStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly tab = signal<TabKey>('activos');
  protected readonly tierFilter = signal<TierFilter>('todos');
  protected readonly search = signal<string>('');
  protected readonly page = signal<number>(0);
  protected readonly pageSize = signal<number>(10);

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

  protected readonly filtered = computed<Claim[]>(() => {
    const list = this.store.claims();
    const t = this.tab();
    const tier = this.tierFilter();
    const q = this.search().toLowerCase().trim();

    const baseSet = list.filter(t === 'activos' ? isActiveForAnalista : isHistoricForAnalista);

    return baseSet
      .filter((c) => {
        if (tier === 'rebotados') {
          if (!(c.review.status === 'pendiente' && c.review.bounce_count > 0)) return false;
        } else if (tier !== 'todos' && c.nivel !== tier) {
          return false;
        }
        if (q) {
          return (
            c.id.toLowerCase().includes(q) ||
            c.asegurado.toLowerCase().includes(q) ||
            c.cobertura.toLowerCase().includes(q) ||
            c.ciudad.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.score - a.score);
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

  protected onSearch(value: string): void {
    this.search.set(value);
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
