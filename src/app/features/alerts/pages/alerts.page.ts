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
import { RuleThresholdModal } from '../components/rule-threshold-modal';
import { RulesStore } from '@core/state/rules.store';
import type { FraudRule } from '@shared/models';
import type { RiskTier } from '@shared/utils';

type Filter = 'todas' | RiskTier;

@Component({
  selector: 'page-alerts',
  standalone: true,
  imports: [Button, Chip, Icon, KpiSmall, PageHeader, Pagination, SkeletonTable, NewRuleModal, RuleHistoryModal, RuleThresholdModal, RuleRow],
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
          <ui-button
            variant="primary"
            [disabled]="rescoring() || saving() !== null"
            (click)="onRescore()"
          >
            <ui-icon name="refresh" [size]="14" />
            Recalcular scores
            @if (pendingChanges() > 0) {
              <span class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-tier-yellow-soft text-tier-yellow-ink text-[10.5px] font-semibold tabular-nums">{{ pendingChanges() }}</span>
            }
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

    @if (storeError(); as e) {
      <div class="flex items-center gap-2 px-4 py-3 mb-4 rounded-lg border border-[var(--tier-red)] bg-tier-red-soft text-tier-red-ink text-[12.5px]">
        <ui-icon name="error" [size]="15" />
        <span class="flex-1">Algo falló al guardar o recalcular. Intenta de nuevo.</span>
        <button type="button" class="underline" (click)="onRetryLoad()">Recargar</button>
      </div>
    }
    @if (rescoring()) {
      <div class="px-4 py-3 mb-4 rounded-lg border border-line bg-soft text-ink-2 text-[12.5px]">
        <div class="flex items-center gap-2 mb-2">
          <ui-icon name="autorenew" [size]="15" class="animate-spin" />
          <span class="flex-1">
            Recalculando scores con las reglas actuales…
            @if (rescoreProgress(); as p) {
              @if (p.total > 0) {
                <span class="font-medium tabular-nums">{{ p.processed }}/{{ p.total }} siniestros · {{ p.changed }} cambiaron</span>
              } @else {
                <span>preparando el índice de narrativas…</span>
              }
            } @else {
              <span>preparando el índice de narrativas…</span>
            }
          </span>
          <span class="font-semibold tabular-nums">{{ rescorePct() }}%</span>
        </div>
        <div class="h-1.5 bg-surface border border-line rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-300" [style.width.%]="rescorePct()" style="background: var(--brand)"></div>
        </div>
      </div>
    } @else if (lastRescore(); as r) {
      <div class="flex items-center gap-2 px-4 py-3 mb-4 rounded-lg border border-line bg-tier-green-soft text-tier-green-ink text-[12.5px]">
        <ui-icon name="check_circle" [size]="15" />
        Scores actualizados: {{ r.processed }} siniestros reevaluados · {{ r.changed }} cambiaron de score o nivel.
      </div>
    } @else if (pendingChanges() > 0 && canEdit()) {
      <div class="flex items-center gap-2 px-4 py-3 mb-4 rounded-lg border border-[var(--tier-yellow)] bg-tier-yellow-soft text-tier-yellow-ink text-[12.5px]">
        <ui-icon name="pending_actions" [size]="15" />
        <span class="flex-1">
          {{ pendingChanges() }} {{ pendingChanges() === 1 ? 'cambio de regla guardado' : 'cambios de reglas guardados' }}
          sin aplicar a los scores existentes. Los nuevos siniestros ya usan la configuración actual.
        </span>
        <button type="button" class="underline font-medium" [disabled]="saving() !== null" (click)="onRescore()">
          Recalcular ahora
        </button>
      </div>
    }

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
        <div class="min-w-[720px]">
      <div class="grid grid-cols-[96px_1fr_120px_72px_120px_150px] gap-4 px-5 py-2.5 bg-soft border-b border-line text-[11.5px] text-ink-3 font-medium tracking-wide">
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
          <alerts-rule-row
            [rule]="r"
            [maxActivations]="maxActivations()"
            [readonly]="!canEdit()"
            [busy]="saving() === r.code"
            (toggle)="onToggle($event)"
            (edit)="onEdit($event)"
          />
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
      <alerts-rule-threshold-modal
        [open]="editing() !== null"
        [rule]="editing()"
        [saving]="saving() !== null"
        (close)="editing.set(null)"
        (save)="onSaveThresholds($event)"
      />
    }
  `,
})
export class AlertsPage {
  private readonly store = inject(RulesStore);
  private readonly auth = inject(AuthStore);

  protected readonly filter = signal<Filter>('todas');
  protected readonly historyOpen = signal<boolean>(false);
  protected readonly newRuleOpen = signal<boolean>(false);
  protected readonly editing = signal<FraudRule | null>(null);
  protected readonly saving = this.store.saving;
  protected readonly stats = this.store.stats;
  protected readonly storeError = this.store.error;
  protected readonly initialLoading = this.store.initialLoading;
  protected readonly pendingChanges = this.store.pendingChanges;
  protected readonly rescoring = this.store.rescoring;
  protected readonly rescoreProgress = this.store.rescoreProgress;
  protected readonly lastRescore = this.store.lastRescore;

  protected readonly rescorePct = computed(() => {
    const p = this.store.rescoreProgress();
    if (!p || p.total === 0) return 0;
    return Math.round((p.processed / p.total) * 100);
  });
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
    void this.store.toggle(code);
  }

  protected onRetryLoad(): void {
    void this.store.loadList();
  }

  protected onRescore(): void {
    void this.store.rescore();
  }

  protected onEdit(code: string): void {
    this.editing.set(this.store.rules().find((r) => r.code === code) ?? null);
  }

  protected onSaveThresholds(thresholds: Record<string, number>): void {
    const code = this.editing()?.code;
    if (code) void this.store.updateThresholds(code, thresholds);
  }
}
