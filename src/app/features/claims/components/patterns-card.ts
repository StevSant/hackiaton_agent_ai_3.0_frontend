import { ChangeDetectionStrategy, Component } from '@angular/core';

interface PatternRow {
  name: string;
  code: string;
  value: number;
  n: number;
}

@Component({
  selector: 'claims-patterns-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 h-full">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div>
          <h3 class="text-[13px] font-semibold m-0">Patrones detectados</h3>
          <div class="text-[12px] text-ink-3 mt-0.5">Reglas activadas con más frecuencia</div>
        </div>
      </div>
      @for (p of patterns; track p.code) {
        <div class="grid grid-cols-[120px_1fr_40px] gap-3 items-center px-5 py-2.5 border-t border-line first:border-t-0">
          <div>
            <div class="text-[13px]">{{ p.name }}</div>
            <div class="text-[11.5px] text-ink-3 font-mono">{{ p.code }}</div>
          </div>
          <div class="h-2 bg-soft rounded-full relative overflow-hidden">
            <div class="bar-fill h-full rounded-full" [style.width.%]="p.value" style="background: var(--brand)"></div>
          </div>
          <div class="text-[12.5px] tabular-nums text-ink-2 text-right">{{ p.n }}</div>
        </div>
      }
    </div>
  `,
})
export class PatternsCard {
  protected readonly patterns: PatternRow[] = [
    { name: 'Proveedor recurrente', code: 'RF03', value: 78, n: 14 },
    { name: 'Frecuencia asegurado', code: 'AF01', value: 64, n: 11 },
    { name: 'Reporte tardío', code: 'AF03', value: 51, n: 9 },
    { name: 'Borde de vigencia', code: 'RF05', value: 44, n: 8 },
    { name: 'Documentos faltantes', code: 'AF02', value: 39, n: 7 },
    { name: 'Narrativa similar', code: 'RF07', value: 32, n: 6 },
  ];
}
