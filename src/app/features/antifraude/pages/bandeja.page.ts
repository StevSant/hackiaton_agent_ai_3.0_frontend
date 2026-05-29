import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import type { ClaimSummaryDto, InboxRowDto } from '@core/api/clients/claim.dto';
import { AuthStore } from '@core/auth/auth.store';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { PageHeader } from '@shared/ui/page-header';
import { Pagination } from '@shared/ui/pagination';
import { SegmentedTabs, type SegmentedTab } from '@shared/ui/segmented-tabs';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { formatDateTime, ramoIcon, ramoLabel } from '@shared/utils';
import { AntifraudeInboxStore } from '../services/antifraude-inbox.store';
import { InboxTable } from '../components/inbox-table';

type TabKey = 'activos' | 'historico';

@Component({
  selector: 'page-antifraude-bandeja',
  standalone: true,
  imports: [Button, Icon, KpiSmall, PageHeader, Pagination, SegmentedTabs, SkeletonTable, InboxTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="centinela-viewport-page">
      <ui-page-header eyebrow="Antifraude" [title]="greeting()" [compact]="true">
        <p class="centinela-page-header__desc" ngProjectAs="[description]">
          @if (store.loading()) {
            Cargando bandeja…
          } @else if (kpis().porTomar > 0) {
            Tienes <b class="text-tier-red-ink">{{ kpis().porTomar }} caso{{ kpis().porTomar > 1 ? 's' : '' }}</b> esperando ser tomado{{ kpis().porTomar > 1 ? 's' : '' }}.
          } @else if (kpis().mineEnRevision > 0) {
            Estás trabajando en {{ kpis().mineEnRevision }} caso{{ kpis().mineEnRevision > 1 ? 's' : '' }} — emite dictamen cuando estés lista.
          } @else {
            Bandeja vacía. Te puedes enfocar en patrones o auditoría.
          }
        </p>
        <div actions class="hidden lg:flex items-center gap-2 text-[12px] text-ink-3 max-w-[220px] text-right leading-snug" ngProjectAs="[actions]">
          <ui-icon name="info" [size]="14" class="shrink-0" />
          Ordenados por tier (rojo primero) y luego por FIFO de escalación.
        </div>
      </ui-page-header>

      @if (store.error(); as err) {
        <div class="bg-tier-red-soft border border-line rounded-lg shadow-1 p-3 flex items-center justify-between gap-4 shrink-0">
          <div class="flex items-start gap-2 text-tier-red-ink">
            <ui-icon name="error_outline" [size]="18" class="mt-0.5 shrink-0" />
            <div class="text-[13px]">
              <div class="font-medium">No pudimos cargar la bandeja antifraude.</div>
              <div class="text-[12px] opacity-80">{{ err.message }}</div>
            </div>
          </div>
          <ui-button variant="secondary" (click)="reload()">
            <ui-icon name="refresh" [size]="14" />
            Reintentar
          </ui-button>
        </div>
      }

      <div class="centinela-kpi-row">
        <ui-kpi-small label="Por tomar" [value]="kpis().porTomar" icon="hourglass_top" [tone]="kpis().porTomar > 0 ? 'red' : 'default'" />
        <ui-kpi-small label="En revisión (mías)" [value]="kpis().mineEnRevision" icon="visibility" tone="brand" />
        <ui-kpi-small label="Re-trabajos abiertos" [value]="kpis().reworks" icon="restart_alt" [tone]="kpis().reworks > 0 ? 'yellow' : 'default'" />
        <ui-kpi-small label="SLA promedio" value="4h 12m" icon="schedule" />
      </div>

      <div class="centinela-panel centinela-panel--fill">
        <div class="centinela-panel__head">
          <div class="flex items-center gap-3.5 flex-wrap">
            <h2 class="centinela-panel__title">Bandeja Antifraude</h2>
            <ui-segmented-tabs [tabs]="tabs()" [active]="tab()" (select)="onTab($any($event))" />
          </div>
        </div>

        @if (tab() === 'activos') {
          @if (store.loading()) {
            <div class="centinela-panel__scroll">
              <ui-skeleton-table [rows]="6" [cols]="6" />
            </div>
          } @else if (activeRows().length === 0) {
            <div class="centinela-panel__scroll">
              <div class="centinela-empty centinela-empty--compact">
                <div class="centinela-empty__icon">
                  <ui-icon name="shield_person" [size]="22" />
                </div>
                La bandeja activa está vacía. Cuando un analista escale un caso, aparecerá aquí.
              </div>
            </div>
          } @else {
            <div class="centinela-panel__scroll">
              <antifraude-inbox-table [rows]="activePage()" (open)="openCase($event)" />
            </div>
            <ui-pagination
              [page]="page()"
              [pageSize]="pageSize()"
              [total]="activeRows().length"
              (pageChange)="page.set($event)"
              (pageSizeChange)="onPageSize($event)"
            />
          }
        } @else {
          @if (store.historicoLoading()) {
            <div class="centinela-panel__scroll">
              <ui-skeleton-table [rows]="6" [cols]="6" />
            </div>
          } @else if (historicoRows().length === 0) {
            <div class="centinela-panel__scroll">
              <div class="centinela-empty centinela-empty--compact">
                <div class="centinela-empty__icon">
                  <ui-icon name="history" [size]="22" />
                </div>
                Todavía no has emitido dictámenes.
              </div>
            </div>
          } @else {
            <div class="centinela-panel__scroll">
              <div class="centinela-table-wrap">
                <table class="centinela-table">
                  <thead>
                    <tr>
                      <th>Siniestro</th>
                      <th>Asegurado</th>
                      <th>Ciudad</th>
                      <th class="text-right">Score</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (h of historicoPage(); track h.id) {
                      <tr (click)="openCase(h.id)">
                        <td>
                          <div class="flex items-center gap-2">
                            <ui-icon [name]="ramoIcon(h.ramo)" [size]="16" />
                            <div class="font-mono text-[12px] text-ink-2">{{ h.id }}</div>
                          </div>
                        </td>
                        <td>{{ h.asegurado }}</td>
                        <td class="text-[12.5px]">{{ h.ciudad }}</td>
                        <td class="text-right tabular-nums">{{ h.score }}</td>
                        <td class="text-[12px] text-ink-3 tabular-nums">{{ formatDateTime(h.fecha_ocurrencia) ?? '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
            <ui-pagination
              [page]="page()"
              [pageSize]="pageSize()"
              [total]="historicoRows().length"
              (pageChange)="page.set($event)"
              (pageSizeChange)="onPageSize($event)"
            />
          }
        }
      </div>
    </div>
  `,
})
export class BandejaPage {
  protected readonly store = inject(AntifraudeInboxStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly tab = signal<TabKey>('activos');
  protected readonly page = signal<number>(0);
  protected readonly pageSize = signal<number>(10);

  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;
  protected readonly formatDateTime = formatDateTime;

  protected readonly greeting = computed(() => {
    const name = this.auth.user()?.name?.split(' ')[0] ?? 'Antifraude';
    return `Hola, ${name}`;
  });

  protected readonly kpis = this.store.kpis;

  protected readonly activeRows = computed<InboxRowDto[]>(() => this.store.items());

  protected readonly historicoRows = computed<ClaimSummaryDto[]>(() => this.store.historico());

  protected readonly tabs = computed<SegmentedTab[]>(() => [
    { key: 'activos', label: 'Activos', count: this.activeRows().length },
    { key: 'historico', label: 'Mi histórico', count: this.historicoRows().length },
  ]);

  protected readonly activePage = computed(() => {
    const list = this.activeRows();
    const start = this.page() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  protected readonly historicoPage = computed(() => {
    const list = this.historicoRows();
    const start = this.page() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  constructor() {
    effect(() => {
      // Lazy-load the historico tab on first activation only.
      // Without the `historicoLoaded` gate the effect would re-fire after every
      // load attempt that returned zero rows — looping the GET indefinitely.
      if (
        this.tab() === 'historico' &&
        !this.store.historicoLoaded() &&
        !this.store.historicoLoading()
      ) {
        void this.store.loadHistorico();
      }
    });
  }

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

  protected reload(): void {
    void this.store.loadInbox();
    if (this.tab() === 'historico') {
      void this.store.loadHistorico();
    }
  }
}
