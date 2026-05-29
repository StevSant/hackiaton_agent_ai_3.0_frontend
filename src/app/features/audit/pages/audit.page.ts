import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ExportButton } from '@shared/ui/export-button';
import {
  ExportModal,
  type ExportColumnOption,
  type ExportRequest,
} from '@shared/ui/export-modal';
import { FilterBar, type FilterControl, type FilterValue } from '@shared/ui/filter-bar';
import { KpiSmall } from '@shared/ui/kpi-small';
import { AuditRow } from '../components/audit-row';
import { AuditStore } from '../services/audit.store';
import { exportAuditEvents } from '../utils/export-audit';

@Component({
  selector: 'page-audit',
  standalone: true,
  imports: [AuditRow, ExportButton, ExportModal, FilterBar, KpiSmall],
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
        <ui-export-button
          label="Exportar CSV"
          [disabled]="filtered().length === 0"
          (trigger)="exportOpen.set(true)"
        />
      </div>
    </div>

    <div class="grid grid-cols-4 gap-3 mb-5">
      <ui-kpi-small label="Eventos hoy" [value]="stats().hoy" icon="bolt" tone="brand" />
      <ui-kpi-small label="Escalamientos" [value]="stats().escalamientos" icon="flag" tone="red" />
      <ui-kpi-small label="Consultas a la IA" [value]="stats().consultas" icon="auto_awesome" tone="yellow" />
      <ui-kpi-small label="Acciones manuales" [value]="stats().manuales" icon="person" />
    </div>

    <ui-filter-bar
      [controls]="filterControls"
      [value]="filters()"
      (valueChange)="filters.set($event)"
    />

    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center gap-3.5 px-5 py-3.5 border-b border-line">
        <h3 class="text-[13px] font-semibold m-0">Bitácora de eventos</h3>
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line">{{ filtered().length }} eventos</span>
      </div>

      @for (e of filtered(); track e.id) {
        <audit-row [event]="e" (openTarget)="onOpenTarget($event)" />
      }
    </div>

    <p class="text-[11.5px] text-ink-3 mt-3">
      Log inmutable conservado por 12 meses · cada entrada incluye actor, timestamp, recurso y diff. Cumple con
      <span class="font-medium">SBS-OS-2024-001</span>.
    </p>

    <ui-export-modal
      [open]="exportOpen()"
      title="Exportar bitácora"
      subtitle="Genera un archivo con los eventos filtrados, listo para auditoría."
      [columns]="auditColumns"
      [defaultFilename]="exportFilename()"
      [totalRows]="filtered().length"
      [previewRows]="previewRows()"
      [rangeOptions]="rangeOptions"
      [extraToggle]="hashToggle"
      (close)="exportOpen.set(false)"
      (download)="onExport($event)"
    />
  `,
})
export class AuditPage {
  private readonly store = inject(AuditStore);
  private readonly router = inject(Router);

  protected readonly stats = this.store.stats;

  protected readonly filters = signal<FilterValue>({
    search: '',
    actor: 'todos',
    dateFrom: '',
  });

  protected readonly filterControls: FilterControl[] = [
    { type: 'search', key: 'search', placeholder: 'Buscar por recurso, actor o título…' },
    {
      type: 'chips',
      key: 'actor',
      emptyValue: 'todos',
      options: [
        { value: 'todos', label: 'Todos' },
        { value: 'analista', label: 'Analistas', icon: 'person' },
        { value: 'agente', label: 'Agente IA', icon: 'auto_awesome' },
        { value: 'sistema', label: 'Sistema', icon: 'memory' },
      ],
    },
    { type: 'date', key: 'dateFrom', label: 'Desde' },
  ];

  protected readonly filtered = computed(() => {
    const list = this.store.events();
    const f = this.filters();
    const term = (f['search'] ?? '').trim().toLowerCase();
    const actor = f['actor'] ?? 'todos';
    const dateFrom = f['dateFrom'] ?? '';
    return list.filter((e) => {
      if (actor !== 'todos' && e.actor !== actor) return false;
      if (dateFrom && e.ts.slice(0, 10) < dateFrom) return false;
      if (!term) return true;
      const hay = `${e.target ?? ''} ${e.actorName} ${e.title}`.toLowerCase();
      return hay.includes(term);
    });
  });

  protected readonly auditColumns: ExportColumnOption[] = [
    { key: 'ts', label: 'Timestamp', hint: 'Fecha y hora (ISO 8601)' },
    { key: 'actor', label: 'Actor', hint: 'Analista, IA o sistema' },
    { key: 'actorName', label: 'Nombre del actor', hint: 'Nombre completo o ID' },
    { key: 'action', label: 'Tipo de acción', hint: 'apertura, cierre, etc.' },
    { key: 'title', label: 'Título', hint: 'Descripción corta del evento' },
    { key: 'detail', label: 'Detalle', hint: 'Texto completo del evento', defaultSelected: false },
    { key: 'target', label: 'Recurso (ID)', hint: 'SIN-… o PRV-…' },
    { key: 'sucursal', label: 'Sucursal', hint: 'Sucursal del analista', defaultSelected: false },
  ];

  protected readonly rangeOptions = [
    { value: 'today', label: 'Hoy' },
    { value: '7d', label: 'Últimos 7 días' },
    { value: '30d', label: 'Últimos 30 días' },
    { value: 'all', label: 'Todo el histórico' },
  ];

  protected readonly hashToggle = {
    key: 'includeHash',
    label: 'Incluir hash SHA-256 de cada fila (recomendado para auditoría regulatoria)',
    defaultOn: true,
  };

  protected readonly exportOpen = signal<boolean>(false);

  protected readonly exportFilename = computed(() => `centinela-auditoria-${todayStamp()}`);

  protected readonly previewRows = computed(() =>
    this.filtered().slice(0, 3).map((e) => ({ ...e })) as unknown as Record<string, unknown>[],
  );

  protected onOpenTarget(target: string): void {
    if (target.startsWith('SIN-')) {
      void this.router.navigate(['/claims', target]);
    } else if (target.startsWith('PRV-')) {
      void this.router.navigate(['/network']);
    }
  }

  protected async onExport(req: ExportRequest): Promise<void> {
    await exportAuditEvents({
      format: req.format,
      filename: req.filename,
      columns: req.columns,
      includeHash: req.extra?.['includeHash'] ?? false,
      events: this.filtered(),
    });
  }
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
