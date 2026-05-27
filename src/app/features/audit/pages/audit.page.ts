import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '@shared/ui/button';
import { Chip } from '@shared/ui/chip';
import { Icon } from '@shared/ui/icon';
import { KpiSmall } from '@shared/ui/kpi-small';
import { AdvancedFiltersModal } from '../components/advanced-filters-modal';
import { AuditRow } from '../components/audit-row';
import { ExportCsvModal } from '../components/export-csv-modal';
import { AuditStore } from '../services/audit.store';
import type { AuditActor } from '../models';

type Filter = 'todos' | AuditActor;

@Component({
  selector: 'page-audit',
  standalone: true,
  imports: [AdvancedFiltersModal, AuditRow, Button, Chip, ExportCsvModal, Icon, KpiSmall],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Auditoría</h1>
        <p class="text-ink-3 text-[13.5px] m-0">
          Rastrea cada decisión: qué reglas se activaron, qué analista revisó el caso y qué citó la IA.
        </p>
      </div>
      <div class="flex gap-2">
        <ui-button (click)="filtersOpen.set(true)">
          <ui-icon name="filter_alt" [size]="14" />
          Filtros avanzados
        </ui-button>
        <ui-button (click)="exportOpen.set(true)">
          <ui-icon name="download" [size]="14" />
          Exportar CSV
        </ui-button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-3 mb-5">
      <ui-kpi-small label="Eventos hoy" [value]="stats().hoy" icon="bolt" tone="brand" />
      <ui-kpi-small label="Escalamientos" [value]="stats().escalamientos" icon="flag" tone="red" />
      <ui-kpi-small label="Consultas a la IA" [value]="stats().consultas" icon="auto_awesome" tone="yellow" />
      <ui-kpi-small label="Acciones manuales" [value]="stats().manuales" icon="person" />
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div class="flex items-center gap-3.5">
          <h3 class="text-[13px] font-semibold m-0">Bitácora de eventos</h3>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line">{{ filtered().length }} eventos</span>
        </div>
        <div class="flex items-center gap-1.5">
          <ui-chip [active]="filter() === 'todos'" (click)="filter.set('todos')">Todos</ui-chip>
          <ui-chip [active]="filter() === 'analista'" (click)="filter.set('analista')">
            <ui-icon name="person" [size]="11" />
            Analistas
          </ui-chip>
          <ui-chip [active]="filter() === 'agente'" (click)="filter.set('agente')">
            <ui-icon name="auto_awesome" [size]="11" />
            Agente IA
          </ui-chip>
          <ui-chip [active]="filter() === 'sistema'" (click)="filter.set('sistema')">
            <ui-icon name="memory" [size]="11" />
            Sistema
          </ui-chip>
        </div>
      </div>

      @for (e of filtered(); track e.id) {
        <audit-row [event]="e" (openTarget)="onOpenTarget($event)" />
      }
    </div>

    <p class="text-[11.5px] text-ink-3 mt-3">
      Log inmutable conservado por 12 meses · cada entrada incluye actor, timestamp, recurso y diff. Cumple con
      <span class="font-medium">SBS-OS-2024-001</span>.
    </p>

    <audit-advanced-filters-modal [open]="filtersOpen()" (close)="filtersOpen.set(false)" />
    <audit-export-csv-modal [open]="exportOpen()" [eventsToday]="stats().hoy" (close)="exportOpen.set(false)" />
  `,
})
export class AuditPage {
  private readonly store = inject(AuditStore);
  private readonly router = inject(Router);

  protected readonly filter = signal<Filter>('todos');
  protected readonly filtersOpen = signal<boolean>(false);
  protected readonly exportOpen = signal<boolean>(false);
  protected readonly stats = this.store.stats;

  protected readonly filtered = computed(() => {
    const list = this.store.events();
    const f = this.filter();
    return f === 'todos' ? list : list.filter((e) => e.actor === f);
  });

  protected onOpenTarget(target: string): void {
    if (target.startsWith('SIN-')) {
      void this.router.navigate(['/claims', target]);
    } else if (target.startsWith('PRV-')) {
      void this.router.navigate(['/network']);
    }
  }
}
