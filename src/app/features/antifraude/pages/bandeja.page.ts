import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { Pagination } from '@shared/ui/pagination';
import { SegmentedTabs, type SegmentedTab } from '@shared/ui/segmented-tabs';
import type { Claim } from '../../claims/models';
import { ClaimsStore } from '../../claims/services/claims.store';
import { InboxTable } from '../components/inbox-table';

type TabKey = 'activos' | 'historico';

@Component({
  selector: 'page-antifraude-bandeja',
  standalone: true,
  imports: [Icon, KpiSmall, Pagination, SegmentedTabs, InboxTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">{{ greeting() }}</h1>
        <p class="text-ink-3 text-[13.5px] m-0">
          @if (kpis().porTomar > 0) {
            Tienes <b class="text-tier-red-ink">{{ kpis().porTomar }} caso{{ kpis().porTomar > 1 ? 's' : '' }}</b> esperando ser tomado{{ kpis().porTomar > 1 ? 's' : '' }}.
          } @else if (kpis().mineEnRevision > 0) {
            Estás trabajando en {{ kpis().mineEnRevision }} caso{{ kpis().mineEnRevision > 1 ? 's' : '' }} — emite dictamen cuando estés lista.
          } @else {
            Bandeja vacía. Te puedes enfocar en patrones o auditoría.
          }
        </p>
      </div>
      <div class="flex items-center gap-2 text-[12px] text-ink-3">
        <ui-icon name="info" [size]="14" />
        Ordenados por tier (rojo primero) y luego por FIFO de escalación.
      </div>
    </div>

    <div class="grid grid-cols-4 gap-3 mb-5">
      <ui-kpi-small label="Por tomar" [value]="kpis().porTomar" icon="hourglass_top" [tone]="kpis().porTomar > 0 ? 'red' : 'default'" />
      <ui-kpi-small label="En revisión (mías)" [value]="kpis().mineEnRevision" icon="visibility" tone="brand" />
      <ui-kpi-small label="Re-trabajos abiertos" [value]="kpis().reworks" icon="restart_alt" [tone]="kpis().reworks > 0 ? 'yellow' : 'default'" />
      <ui-kpi-small label="SLA promedio" value="4h 12m" icon="schedule" />
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div class="flex items-center gap-3.5">
          <h3 class="text-[13px] font-semibold m-0">Bandeja Antifraude</h3>
          <ui-segmented-tabs [tabs]="tabs()" [active]="tab()" (select)="onTab($any($event))" />
        </div>
      </div>
      @if (visible().length === 0) {
        <div class="px-5 py-12 text-center text-ink-3 text-[13px]">
          @if (tab() === 'activos') {
            La bandeja activa está vacía. Cuando un analista escale un caso, aparecerá aquí.
          } @else {
            Todavía no has emitido dictámenes.
          }
        </div>
      } @else {
        <antifraude-inbox-table [claims]="paged()" (open)="openCase($event)" />
        <ui-pagination
          [page]="page()"
          [pageSize]="pageSize()"
          [total]="visible().length"
          (pageChange)="page.set($event)"
          (pageSizeChange)="onPageSize($event)"
        />
      }
    </div>
  `,
})
export class BandejaPage {
  private readonly claimsStore = inject(ClaimsStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly tab = signal<TabKey>('activos');
  protected readonly page = signal<number>(0);
  protected readonly pageSize = signal<number>(10);

  protected readonly greeting = computed(() => {
    const name = this.auth.user()?.name?.split(' ')[0] ?? 'Antifraude';
    return `Hola, ${name}`;
  });

  protected readonly tabs = computed<SegmentedTab[]>(() => {
    const list = this.claimsStore.claims();
    const me = this.auth.user()?.id ?? '';
    const activos = list.filter(
      (c) => c.review.status === 'escalado' || c.review.status === 'en_revision',
    ).length;
    const hist = list.filter(
      (c) => c.review.status === 'dictaminado' && c.review.dictaminado_by === me,
    ).length;
    return [
      { key: 'activos', label: 'Activos', count: activos },
      { key: 'historico', label: 'Mi histórico', count: hist },
    ];
  });

  protected readonly kpis = computed(() => {
    const list = this.claimsStore.claims();
    const me = this.auth.user()?.id ?? '';
    const porTomar = list.filter((c) => c.review.status === 'escalado').length;
    const mineEnRevision = list.filter(
      (c) => c.review.status === 'en_revision' && c.review.assigned_to === me,
    ).length;
    const reworks = list.filter((c) => c.review.bounce_count > 0).length;
    return { porTomar, mineEnRevision, reworks };
  });

  protected readonly visible = computed<Claim[]>(() => {
    const list = this.claimsStore.claims();
    const me = this.auth.user()?.id ?? '';
    if (this.tab() === 'activos') {
      return list.filter(
        (c) => c.review.status === 'escalado' || c.review.status === 'en_revision',
      );
    }
    return list.filter(
      (c) => c.review.status === 'dictaminado' && c.review.dictaminado_by === me,
    );
  });

  protected readonly paged = computed(() => {
    const list = this.visible();
    const start = this.page() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  protected onTab(key: string): void {
    this.tab.set(key as TabKey);
    this.page.set(0);
  }

  protected onPageSize(n: number): void {
    this.pageSize.set(n);
    this.page.set(0);
  }

  protected openCase(id: string): void {
    void this.router.navigate(['/claims', id]);
  }
}
