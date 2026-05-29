import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AuthStore } from '@core/auth/auth.store';
import { Button } from '@shared/ui/button';
import { Chip } from '@shared/ui/chip';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { PageHeader } from '@shared/ui/page-header';
import { Pagination } from '@shared/ui/pagination';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { NewRuleModal } from '../components/new-rule-modal';
import { RuleHistoryModal } from '../components/rule-history-modal';
import { RuleRow } from '../components/rule-row';
import { RulesStore } from '@core/state/rules.store';
import type { RiskTier } from '@shared/utils';

type Filter = 'todas' | RiskTier;

@Component({
  selector: 'page-alerts',
  standalone: true,
  imports: [Button, Chip, Icon, KpiSmall, PageHeader, Pagination, SkeletonTable, NewRuleModal, RuleHistoryModal, RuleRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header [title]="canEdit() ? 'Reglas y alertas' : 'Catálogo de reglas'">
      <p class="centinela-page-header__desc" ngProjectAs="[description]">
        @if (canEdit()) {
          Configura los umbrales de las 14 señales y revisa el histórico de activaciones.
        } @else {
          Consulta el catálogo de las 14 señales y reglas críticas activas. La edición está reservada al equipo Antifraude.
        }
      </p>
      @if (canEdit()) {
        <div ngProjectAs="[actions]" class="flex flex-wrap items-center gap-2">
          <ui-button (click)="historyOpen.set(true)">
            <ui-icon name="history" [size]="14" />
            Historial de cambios
          </ui-button>
          <ui-button variant="primary" (click)="newRuleOpen.set(true)">
            <ui-icon name="add" [size]="14" />
            Nueva regla
          </ui-button>
        </div>
      } @else {
        <span
          ngProjectAs="[actions]"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-ink-3 bg-soft border border-line"
        >
          <ui-icon name="visibility" [size]="13" />
          Vista de consulta
        </span>
      }
    </ui-page-header>

    <div class="centinela-kpi-row">
      <ui-kpi-small label="Reglas activas" [value]="stats().activas + ' / ' + stats().total" icon="rule" tone="brand" />
      <ui-kpi-small label="Reglas críticas" [value]="stats().criticas" icon="warning" tone="red" />
      <ui-kpi-small label="Activaciones 30 días" [value]="stats().activaciones" icon="flag" tone="yellow" />
      <ui-kpi-small label="Falsos positivos est." value="12%" icon="filter_alt" />
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden">
      <div class="centinela-panel-head">
        <div class="centinela-panel-head__title">
          <h3 class="text-[13px] font-semibold m-0">Catálogo de reglas</h3>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line">{{ filtered().length }} reglas</span>
        </div>
        <div class="centinela-panel-head__filters">
          <ui-chip [active]="filter() === 'todas'" (click)="setFilter('todas')">Todas</ui-chip>
          <ui-chip [active]="filter() === 'rojo'" (click)="setFilter('rojo')">
            <span class="tier-dot tier-dot-r" style="box-shadow: none"></span> Rojo
          </ui-chip>
          <ui-chip [active]="filter() === 'amarillo'" (click)="setFilter('amarillo')">
            <span class="tier-dot tier-dot-y" style="box-shadow: none"></span> Amarillo
          </ui-chip>
          <ui-chip [active]="filter() === 'verde'" (click)="setFilter('verde')">
            <span class="tier-dot tier-dot-g" style="box-shadow: none"></span> Verde
          </ui-chip>
        </div>
      </div>

      <div class="overflow-x-auto">
        <div class="min-w-[640px]">
      <div class="grid grid-cols-[96px_1fr_120px_72px_120px_72px] gap-4 px-5 py-2.5 bg-soft border-b border-line text-[11.5px] text-ink-3 font-medium tracking-wide">
        <span>Código</span>
        <span>Nombre / Descripción</span>
        <span>Clasificación</span>
        <span class="text-right">Pts máx</span>
        <span>Activaciones (30d)</span>
        <span class="text-center">Estado</span>
      </div>

      @if (initialLoading()) {
        <div class="p-3">
          <ui-skeleton-table [rows]="8" [cols]="6" />
        </div>
      } @else {
        @for (r of paged(); track r.code) {
          <alerts-rule-row [rule]="r" [maxActivations]="maxActivations()" [readonly]="!canEdit()" (toggle)="onToggle($event)" />
        }
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
    </div>

    @if (canEdit()) {
      <alerts-rule-history-modal [open]="historyOpen()" (close)="historyOpen.set(false)" />
      <alerts-new-rule-modal [open]="newRuleOpen()" (close)="newRuleOpen.set(false)" />
    }
  `,
})
export class AlertsPage {
  private readonly store = inject(RulesStore);
  private readonly auth = inject(AuthStore);

  protected readonly filter = signal<Filter>('todas');
  protected readonly historyOpen = signal<boolean>(false);
  protected readonly newRuleOpen = signal<boolean>(false);
  protected readonly stats = this.store.stats;
  protected readonly initialLoading = this.store.initialLoading;
  protected readonly page = signal<number>(0);
  protected readonly pageSize = signal<number>(10);

  protected readonly canEdit = computed(() => this.auth.user()?.roleCode === 'antifraude');

  protected readonly filtered = computed(() => {
    const list = this.store.rules();
    const f = this.filter();
    return f === 'todas' ? list : list.filter((r) => r.clasificacion === f);
  });

  protected readonly maxActivations = computed(() =>
    Math.max(1, ...this.store.rules().map((r) => r.activaciones30d)),
  );

  protected readonly paged = computed(() => {
    const list = this.filtered();
    const start = this.page() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  protected onPageSize(n: number): void {
    this.pageSize.set(n);
    this.page.set(0);
  }

  protected setFilter(f: Filter): void {
    this.filter.set(f);
    this.page.set(0);
  }

  protected onToggle(code: string): void {
    this.store.toggle(code);
  }
}
