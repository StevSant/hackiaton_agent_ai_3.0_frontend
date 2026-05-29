import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import { Button } from './button';
import { Icon } from './icon';
import { Modal } from './modal';

export type ExportFormat = 'csv' | 'xlsx' | 'json';

export interface ExportColumnOption {
  key: string;
  label: string;
  hint?: string;
  defaultSelected?: boolean;
}

export interface ExportRequest {
  format: ExportFormat;
  filename: string;
  columns: string[];
  range?: string;
  extra?: Record<string, boolean>;
}

export interface ExportRangeOption {
  value: string;
  label: string;
}

export interface ExportExtraToggle {
  key: string;
  label: string;
  defaultOn?: boolean;
}

interface FormatOption {
  value: ExportFormat;
  label: string;
  icon: string;
  hint: string;
}

const ALL_FORMATS: readonly FormatOption[] = [
  { value: 'csv', label: 'CSV', icon: 'table_chart', hint: 'Compatible con Excel y BI' },
  { value: 'xlsx', label: 'XLSX', icon: 'description', hint: 'Excel abre el archivo directamente' },
  { value: 'json', label: 'JSON', icon: 'data_object', hint: 'Para integración API' },
];

@Component({
  selector: 'ui-export-modal',
  standalone: true,
  imports: [Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="open()"
      [title]="title()"
      [subtitle]="subtitle()"
      size="md"
      (close)="close.emit()"
    >
      <div class="px-5 py-5 flex flex-col gap-5">
        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-2">
            Formato
          </label>
          <div class="grid grid-cols-3 gap-2">
            @for (f of availableFormats(); track f.value) {
              <button
                type="button"
                class="flex flex-col items-start gap-1 px-3 py-2.5 rounded-sm border text-left"
                [class]="
                  format() === f.value
                    ? 'bg-brand-soft border-brand-ink ring-2 ring-brand-soft'
                    : 'bg-surface border-line hover:bg-hover'
                "
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
          <div class="flex items-center justify-between mb-2">
            <label class="text-[11.5px] text-ink-3 uppercase tracking-wider font-medium">
              Columnas a incluir
            </label>
            <div class="flex items-center gap-3 text-[11.5px] text-ink-3">
              <button
                type="button"
                class="hover:text-ink underline-offset-2 hover:underline"
                (click)="selectAll()"
              >
                Seleccionar todo
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                class="hover:text-ink underline-offset-2 hover:underline"
                (click)="selectNone()"
              >
                Quitar todo
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            @for (c of columns(); track c.key) {
              <label
                class="flex items-start gap-2 px-3 py-2 rounded-sm border border-line bg-surface cursor-pointer select-none hover:bg-hover"
              >
                <input
                  type="checkbox"
                  class="accent-[var(--brand)] mt-0.5"
                  [checked]="selected().has(c.key)"
                  (change)="toggle(c.key)"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-[13px] font-medium">{{ c.label }}</div>
                  @if (c.hint) {
                    <div class="text-[11.5px] text-ink-3">{{ c.hint }}</div>
                  }
                </div>
              </label>
            }
          </div>
        </div>

        <div class="grid gap-3" [class]="rangeOptions().length > 0 ? 'grid-cols-2' : 'grid-cols-1'">
          @if (rangeOptions().length > 0) {
            <div>
              <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
                Rango de fechas
              </label>
              <select
                class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
                [value]="range()"
                (change)="range.set($any($event.target).value)"
              >
                @for (r of rangeOptions(); track r.value) {
                  <option [value]="r.value">{{ r.label }}</option>
                }
              </select>
            </div>
          }
          <div>
            <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
              Nombre del archivo
            </label>
            <input
              type="text"
              class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] font-mono focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
              [value]="filename()"
              (input)="filename.set($any($event.target).value)"
            />
          </div>
        </div>

        @if (extraToggle(); as toggle) {
          <label class="flex items-center gap-2 text-[12.5px] text-ink-2 cursor-pointer select-none">
            <input
              type="checkbox"
              class="accent-[var(--brand)]"
              [checked]="extraOn()"
              (change)="extraOn.set($any($event.target).checked)"
            />
            {{ toggle.label }}
          </label>
        }

        @if (previewRows().length > 0 && selected().size > 0) {
          <div>
            <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
              Vista previa
            </label>
            <div class="bg-soft border border-line rounded-sm overflow-hidden">
              <div
                class="font-mono text-[11.5px] text-ink-2 px-3 py-2 border-b border-line bg-canvas"
              >
                <span class="text-ink-4">$</span> {{ filename() }}.{{ format() }}
              </div>
              <pre
                class="font-mono text-[11px] text-ink-2 px-3 py-2.5 leading-relaxed overflow-x-auto m-0"
              >{{ previewText() }}</pre>
            </div>
          </div>
        }
      </div>

      <footer footer class="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-line bg-soft">
        <p class="text-[11.5px] text-ink-3 m-0">
          {{ summary() }}
        </p>
        <div class="flex gap-2">
          <ui-button (click)="close.emit()">Cancelar</ui-button>
          <ui-button variant="primary" [disabled]="!canDownload()" (click)="onDownload()">
            <ui-icon name="download" [size]="14" />
            {{ downloadLabel() }}
          </ui-button>
        </div>
      </footer>
    </ui-modal>
  `,
})
export class ExportModal {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly columns = input.required<readonly ExportColumnOption[]>();
  readonly defaultFilename = input.required<string>();
  readonly totalRows = input<number>(0);
  readonly previewRows = input<readonly Record<string, unknown>[]>([]);
  readonly formats = input<readonly ExportFormat[]>(['csv', 'xlsx', 'json']);
  readonly rangeOptions = input<readonly ExportRangeOption[]>([]);
  readonly extraToggle = input<ExportExtraToggle | null>(null);
  readonly close = output<void>();
  readonly download = output<ExportRequest>();

  protected readonly format = signal<ExportFormat>('csv');
  protected readonly filename = signal<string>('');
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly range = signal<string>('');
  protected readonly extraOn = signal<boolean>(false);

  protected readonly availableFormats = computed<readonly FormatOption[]>(() => {
    const allowed = new Set(this.formats());
    return ALL_FORMATS.filter((f) => allowed.has(f.value));
  });

  protected readonly canDownload = computed(
    () => this.selected().size > 0 && this.filename().trim().length > 0,
  );

  protected readonly downloadLabel = computed(() => {
    const cols = this.selected().size;
    if (cols === 0) return 'Selecciona al menos una columna';
    return `Descargar (${cols} columna${cols === 1 ? '' : 's'})`;
  });

  protected readonly summary = computed(() => {
    const rows = this.totalRows();
    if (rows === 0) return 'No hay filas para exportar.';
    return `${rows} ${rows === 1 ? 'fila' : 'filas'} se incluirán en el archivo.`;
  });

  protected readonly previewText = computed(() => {
    const cols = this.columns().filter((c) => this.selected().has(c.key));
    if (cols.length === 0) return '';

    if (this.format() === 'json') {
      const rows = this.previewRows()
        .slice(0, 3)
        .map((r) => {
          const projected: Record<string, unknown> = {};
          for (const c of cols) projected[c.key] = r[c.key] ?? '';
          return projected;
        });
      return JSON.stringify(rows, null, 2);
    }

    const lines: string[] = [];
    lines.push(cols.map((c) => c.label).join(','));
    for (const row of this.previewRows().slice(0, 3)) {
      lines.push(cols.map((c) => previewCell(row[c.key])).join(','));
    }
    return lines.join('\n');
  });

  constructor() {
    // Reset filename and selection when the modal opens or its inputs change.
    effect(() => {
      if (!this.open()) return;
      this.filename.set(this.defaultFilename());
      const cols = this.columns();
      const next = new Set<string>(
        cols.filter((c) => c.defaultSelected !== false).map((c) => c.key),
      );
      this.selected.set(next);
      const allowed = this.formats();
      if (!allowed.includes(this.format())) {
        this.format.set(allowed[0] ?? 'csv');
      }
      const ranges = this.rangeOptions();
      if (ranges.length > 0 && !ranges.some((r) => r.value === this.range())) {
        this.range.set(ranges[0].value);
      }
      const toggle = this.extraToggle();
      this.extraOn.set(toggle?.defaultOn ?? false);
    });
  }

  protected toggle(key: string): void {
    const next = new Set(this.selected());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.selected.set(next);
  }

  protected selectAll(): void {
    this.selected.set(new Set(this.columns().map((c) => c.key)));
  }

  protected selectNone(): void {
    this.selected.set(new Set());
  }

  protected onDownload(): void {
    if (!this.canDownload()) return;
    const orderedColumns = this.columns()
      .filter((c) => this.selected().has(c.key))
      .map((c) => c.key);
    const toggle = this.extraToggle();
    this.download.emit({
      format: this.format(),
      filename: this.filename().trim(),
      columns: orderedColumns,
      range: this.rangeOptions().length > 0 ? this.range() : undefined,
      extra: toggle ? { [toggle.key]: this.extraOn() } : undefined,
    });
    this.close.emit();
  }
}

function previewCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.length > 24) return `${s.slice(0, 23)}…`;
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
