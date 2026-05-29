import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { NgClass, TitleCasePipe } from '@angular/common';

import type { TableRow } from '../models';

/** Preferred column order when rendering claim-shaped rows. */
const PREFERRED_COLS = [
  'id',
  'id_siniestro',
  'asegurado',
  'nombre',
  'ramo',
  'cobertura',
  'ciudad',
  'monto_reclamado',
  'monto',
  'score',
  'nivel',
  'nivel_riesgo',
  'estado',
];

/** Columns that should never be shown (internal IDs, raw flags, etc.). */
const HIDDEN_COLS = new Set([
  'id_poliza',
  'id_asegurado',
  'id_proveedor',
  'etiqueta_fraude_simulada',
  'documentos_completos',
]);

const MAX_COLS = 8;
const MAX_ROWS = 50;

const CLAIM_ID_RE = /^(SIN|IMP|CL)-/i;

/** Tier badge colors for `nivel` / `nivel_riesgo` values. */
const TIER_CLASSES: Record<string, string> = {
  verde:    'bg-tier-green-soft text-tier-green-ink',
  amarillo: 'bg-tier-yellow-soft text-tier-yellow-ink',
  rojo:     'bg-tier-red-soft text-tier-red-ink',
};

function tierClass(value: string): string {
  return TIER_CLASSES[value.toLowerCase()] ?? 'bg-soft text-ink-2';
}

function isTierCol(col: string): boolean {
  return col === 'nivel' || col === 'nivel_riesgo';
}

function isClaimId(value: string): boolean {
  return CLAIM_ID_RE.test(value);
}

function selectColumns(rows: TableRow[]): string[] {
  if (rows.length === 0) return [];
  const allKeys = Object.keys(rows[0]);

  // Sort: preferred first (in order), then remaining alphabetically.
  const preferred = PREFERRED_COLS.filter((c) => allKeys.includes(c) && !HIDDEN_COLS.has(c));
  const rest = allKeys
    .filter((c) => !PREFERRED_COLS.includes(c) && !HIDDEN_COLS.has(c))
    .sort();

  return [...preferred, ...rest].slice(0, MAX_COLS);
}

function headerLabel(col: string): string {
  const labels: Record<string, string> = {
    id: 'ID',
    id_siniestro: 'ID Siniestro',
    asegurado: 'Asegurado',
    nombre: 'Nombre',
    ramo: 'Ramo',
    cobertura: 'Cobertura',
    ciudad: 'Ciudad',
    monto_reclamado: 'Monto',
    monto: 'Monto',
    score: 'Score',
    nivel: 'Nivel',
    nivel_riesgo: 'Nivel',
    estado: 'Estado',
    tipo: 'Tipo',
    alertas: 'Alertas',
    casos: 'Casos',
  };
  return labels[col] ?? col.replace(/_/g, ' ');
}

function formatCell(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') {
    // Format large numbers as money if they look like amounts.
    if (value > 1000 && Number.isFinite(value) && !Number.isInteger(value)) {
      return new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    }
    return String(value);
  }
  return String(value);
}

/** Extracts the row's primary ID for navigation (first claim-shaped ID found). */
function rowClaimId(row: TableRow, cols: string[]): string | null {
  for (const col of cols) {
    const val = row[col];
    if (typeof val === 'string' && isClaimId(val)) return val;
  }
  return null;
}

/**
 * Renders a list of row objects (from a tool result) as a responsive Tailwind
 * table. Clickable rows with a claim ID emit `openCase`.
 */
@Component({
  selector: 'agent-table',
  standalone: true,
  imports: [NgClass, TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-line bg-surface mt-1 w-full max-w-[720px] overflow-hidden">
      @if (title()) {
        <div class="px-3.5 py-2.5 border-b border-line flex items-center gap-2">
          <span class="text-[12.5px] font-semibold text-ink">{{ title() }}</span>
          <span class="text-[11px] text-ink-3 ml-auto">{{ visibleRows().length }} resultado{{ visibleRows().length === 1 ? '' : 's' }}</span>
        </div>
      }

      <div class="overflow-x-auto">
        <table class="w-full text-[12.5px] border-collapse">
          <thead>
            <tr class="border-b border-line bg-soft">
              @for (col of columns(); track col) {
                <th class="px-3 py-2 text-left font-semibold text-ink-2 whitespace-nowrap first:pl-3.5 last:pr-3.5">
                  {{ headerLabel(col) }}
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of visibleRows(); track $index; let odd = $odd) {
              <tr
                class="border-b border-line last:border-0 transition-colors"
                [class.bg-soft]="odd"
                [class.cursor-pointer]="!!rowClaimId(row)"
                [ngClass]="rowClaimId(row) ? 'hover:bg-hover' : ''"
                (click)="onRowClick(row)"
              >
                @for (col of columns(); track col) {
                  <td class="px-3 py-2 whitespace-nowrap first:pl-3.5 last:pr-3.5 text-ink">
                    @if (isTierCol(col) && asString(row[col]); as tierVal) {
                      <span
                        class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10.5px] font-medium"
                        [ngClass]="tierClass(tierVal)"
                      >
                        {{ tierVal | titlecase }}
                      </span>
                    } @else {
                      {{ formatCell(row[col]) }}
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (rows().length > MAX_ROWS) {
        <div class="px-3.5 py-2 border-t border-line text-[11.5px] text-ink-3">
          Mostrando los primeros {{ MAX_ROWS }} de {{ rows().length }} resultados.
        </div>
      }
    </div>
  `,
})
export class AgentTable {
  readonly rows = input.required<TableRow[]>();
  readonly title = input<string>('');

  readonly openCase = output<string>();

  protected readonly MAX_ROWS = MAX_ROWS;

  protected readonly columns = computed(() => selectColumns(this.rows()));
  protected readonly visibleRows = computed(() => this.rows().slice(0, MAX_ROWS));

  protected readonly headerLabel = headerLabel;
  protected readonly isTierCol = isTierCol;
  protected readonly tierClass = tierClass;
  protected readonly formatCell = formatCell;
  protected readonly rowClaimId = (row: TableRow) => rowClaimId(row, this.columns());

  protected asString(value: string | number | boolean | null): string {
    return typeof value === 'string' ? value : '';
  }

  protected onRowClick(row: TableRow): void {
    const id = rowClaimId(row, this.columns());
    if (id) this.openCase.emit(id);
  }
}
