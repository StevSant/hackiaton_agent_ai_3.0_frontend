import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Modal } from '@shared/ui/modal';

interface ColumnOpt {
  key: string;
  label: string;
  hint: string;
}

@Component({
  selector: 'audit-export-csv-modal',
  standalone: true,
  imports: [Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="open()"
      title="Exportar bitácora"
      subtitle="Genera un CSV con los eventos filtrados, listo para auditoría."
      size="md"
      (close)="close.emit()"
    >
      <div class="px-5 py-5 flex flex-col gap-5">
        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-2">Formato</label>
          <div class="grid grid-cols-3 gap-2">
            @for (f of formats; track f.value) {
              <button
                type="button"
                class="flex flex-col items-start gap-1 px-3 py-2.5 rounded-sm border text-left"
                [class]="format() === f.value ? 'bg-brand-soft border-brand-ink ring-2 ring-brand-soft' : 'bg-surface border-line hover:bg-hover'"
                (click)="format.set(f.value)"
              >
                <span class="flex items-center gap-1.5 text-[12.5px] font-medium">
                  <ui-icon [name]="f.icon" [size]="14" />
                  {{ f.label }}
                </span>
                <span class="text-[11px] text-ink-3">{{ f.hint }}</span>
              </button>
            }
          </div>
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-2">Columnas a incluir</label>
          <div class="grid grid-cols-2 gap-1.5">
            @for (c of columns; track c.key) {
              <label class="flex items-start gap-2 px-3 py-2 rounded-sm border border-line bg-surface cursor-pointer select-none hover:bg-hover">
                <input
                  type="checkbox"
                  class="accent-[var(--brand)] mt-0.5"
                  [checked]="selected().has(c.key)"
                  (change)="toggle(c.key)"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-[13px] font-medium">{{ c.label }}</div>
                  <div class="text-[11.5px] text-ink-3">{{ c.hint }}</div>
                </div>
              </label>
            }
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">Rango de fechas</label>
            <select
              class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
              [value]="range()"
              (change)="range.set($any($event.target).value)"
            >
              <option value="today">Hoy ({{ eventsToday() }})</option>
              <option value="7d">Últimos 7 días (~84)</option>
              <option value="30d">Últimos 30 días (~340)</option>
              <option value="all">Todo el histórico (1248)</option>
            </select>
          </div>
          <div>
            <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">Nombre del archivo</label>
            <input
              type="text"
              class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] font-mono focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
              [value]="filename()"
              (input)="filename.set($any($event.target).value)"
            />
          </div>
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">Vista previa</label>
          <div class="bg-soft border border-line rounded-sm overflow-hidden">
            <div class="font-mono text-[11.5px] text-ink-2 px-3 py-2 border-b border-line bg-canvas">
              <span class="text-ink-4">$</span> {{ filename() }}.{{ extension() }}
            </div>
            <pre class="font-mono text-[11px] text-ink-2 px-3 py-2.5 leading-relaxed overflow-x-auto m-0">{{ previewRows() }}</pre>
          </div>
        </div>

        <label class="flex items-center gap-2 text-[12.5px] text-ink-2 cursor-pointer select-none">
          <input type="checkbox" class="accent-[var(--brand)]" [checked]="includeHash()" (change)="includeHash.set($any($event.target).checked)" />
          Incluir hash SHA-256 de cada fila (recomendado para auditoría regulatoria)
        </label>
      </div>

      <footer footer class="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-line bg-soft">
        <p class="text-[11.5px] text-ink-3 m-0">
          La exportación queda registrada en la bitácora como un evento <span class="font-mono">export</span>.
        </p>
        <div class="flex gap-2">
          <ui-button (click)="close.emit()">Cancelar</ui-button>
          <ui-button variant="primary" (click)="onDownload()">
            <ui-icon name="download" [size]="14" />
            Descargar {{ selected().size }} columnas
          </ui-button>
        </div>
      </footer>
    </ui-modal>
  `,
})
export class ExportCsvModal {
  readonly open = input.required<boolean>();
  readonly close = output<void>();
  readonly download = output<void>();
  readonly eventsToday = input<number>(12);

  protected readonly formats: { value: 'csv' | 'xlsx' | 'json'; label: string; icon: string; hint: string }[] = [
    { value: 'csv', label: 'CSV', icon: 'table_chart', hint: 'Compatible con Excel y BI' },
    { value: 'xlsx', label: 'XLSX', icon: 'description', hint: 'Con metadatos y fórmulas' },
    { value: 'json', label: 'JSON', icon: 'data_object', hint: 'Para integración API' },
  ];

  protected readonly columns: ColumnOpt[] = [
    { key: 'ts', label: 'Timestamp', hint: 'Fecha y hora (ISO 8601)' },
    { key: 'actor', label: 'Actor', hint: 'Analista, IA o sistema' },
    { key: 'actorName', label: 'Nombre del actor', hint: 'Nombre completo o ID' },
    { key: 'action', label: 'Tipo de acción', hint: 'apertura, cierre, etc.' },
    { key: 'title', label: 'Título', hint: 'Descripción corta del evento' },
    { key: 'detail', label: 'Detalle', hint: 'Texto completo del evento' },
    { key: 'target', label: 'Recurso (ID)', hint: 'SIN-… o PRV-…' },
    { key: 'sucursal', label: 'Sucursal', hint: 'Sucursal del analista' },
  ];

  protected readonly format = signal<'csv' | 'xlsx' | 'json'>('csv');
  protected readonly range = signal<string>('7d');
  protected readonly filename = signal<string>('centinela-auditoria-2026-05-26');
  protected readonly includeHash = signal<boolean>(true);
  protected readonly selected = signal<Set<string>>(
    new Set(['ts', 'actor', 'actorName', 'action', 'title', 'target']),
  );

  protected readonly extension = computed(() => this.format());

  protected readonly previewRows = computed(() => {
    const headers = this.columns.filter((c) => this.selected().has(c.key)).map((c) => c.key);
    if (this.includeHash()) headers.push('sha256');
    const rows = [
      headers.join(','),
      '2026-05-26T14:42:00Z,analista,Lucía Vélez,escalamiento,Escaló SIN-2026-08412,SIN-2026-08412' + (this.includeHash() ? ',ab3f…' : ''),
      '2026-05-26T14:38:00Z,agente,Centinela IA,consulta_ia,Respondió consulta,SIN-2026-08412' + (this.includeHash() ? ',7c81…' : ''),
      '2026-05-26T13:55:00Z,sistema,Ingestor,apertura,Nuevo siniestro ingresado,SIN-2026-08412' + (this.includeHash() ? ',92de…' : ''),
    ];
    return rows.join('\n');
  });

  protected toggle(key: string): void {
    const next = new Set(this.selected());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.selected.set(next);
  }

  protected onDownload(): void {
    this.download.emit();
    this.close.emit();
  }
}
