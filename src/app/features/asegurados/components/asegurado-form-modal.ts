import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import type { Asegurado } from '@shared/models';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Modal } from '@shared/ui/modal';

export interface AseguradoFormValue {
  nombre: string;
  segmento: string;
  ciudad: string;
  antiguedad: number | null;
  num_polizas: number;
  reclamos_ultimos_12_meses: number;
  mora_actual: boolean;
  score_cliente_simulado: number | null;
}

@Component({
  selector: 'asegurado-form-modal',
  standalone: true,
  imports: [Modal, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal [open]="open()" [title]="title()" [subtitle]="subtitle()" size="md" (close)="close.emit()">
      <div class="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
            Nombre
          </label>
          <input
            type="text"
            class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
            placeholder="Nombre del asegurado"
            [value]="nombre()"
            (input)="nombre.set($any($event.target).value)"
          />
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
            Segmento
          </label>
          <input
            type="text"
            class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
            placeholder="Masivo / Preferente / Corporativo"
            [value]="segmento()"
            (input)="segmento.set($any($event.target).value)"
          />
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
            Ciudad <span class="text-tier-red-ink">*</span>
          </label>
          <input
            type="text"
            class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
            placeholder="Quito"
            [value]="ciudad()"
            (input)="ciudad.set($any($event.target).value)"
          />
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
            Antigüedad (años)
          </label>
          <input
            type="number"
            min="0"
            class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
            [value]="antiguedad() ?? ''"
            (input)="antiguedad.set(parseNum($any($event.target).value))"
          />
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
            Pólizas activas
          </label>
          <input
            type="number"
            min="0"
            class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
            [value]="numPolizas()"
            (input)="numPolizas.set(parseNum($any($event.target).value) ?? 0)"
          />
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
            Reclamos (12 m)
          </label>
          <input
            type="number"
            min="0"
            class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
            [value]="reclamos()"
            (input)="reclamos.set(parseNum($any($event.target).value) ?? 0)"
          />
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
            Score cliente (0-100)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
            [value]="score() ?? ''"
            (input)="score.set(parseNum($any($event.target).value))"
          />
        </div>

        <label
          class="flex items-center gap-2 px-3 py-2 rounded-sm border border-line bg-surface cursor-pointer select-none self-end"
        >
          <input
            type="checkbox"
            class="accent-[var(--brand)]"
            [checked]="moraActual()"
            (change)="moraActual.set($any($event.target).checked)"
          />
          <span class="text-[13px] font-medium">En mora</span>
        </label>
      </div>

      <footer footer class="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-line bg-soft">
        <ui-button (click)="close.emit()">Cancelar</ui-button>
        <ui-button variant="primary" [disabled]="!canSave()" (click)="onSubmit()">
          <ui-icon name="save" [size]="14" />
          Guardar
        </ui-button>
      </footer>
    </ui-modal>
  `,
})
export class AseguradoFormModal {
  readonly open = input.required<boolean>();
  readonly mode = input<'create' | 'edit'>('create');
  readonly value = input<Asegurado | null>(null);
  readonly save = output<AseguradoFormValue>();
  readonly close = output<void>();

  protected readonly nombre = signal<string>('');
  protected readonly segmento = signal<string>('');
  protected readonly ciudad = signal<string>('');
  protected readonly antiguedad = signal<number | null>(null);
  protected readonly numPolizas = signal<number>(0);
  protected readonly reclamos = signal<number>(0);
  protected readonly moraActual = signal<boolean>(false);
  protected readonly score = signal<number | null>(null);

  protected readonly title = computed(() =>
    this.mode() === 'edit' ? 'Editar asegurado' : 'Agregar asegurado',
  );
  protected readonly subtitle = computed(() =>
    this.mode() === 'edit'
      ? 'Actualiza los datos de la persona asegurada.'
      : 'Registra una persona asegurada manualmente.',
  );
  protected readonly canSave = computed(() => this.ciudad().trim().length > 0);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const v = this.value();
      this.nombre.set(v?.nombre ?? '');
      this.segmento.set(v?.segmento ?? '');
      this.ciudad.set(v?.ciudad ?? '');
      this.antiguedad.set(v?.antiguedad ?? null);
      this.numPolizas.set(v?.num_polizas ?? 0);
      this.reclamos.set(v?.reclamos_ultimos_12_meses ?? 0);
      this.moraActual.set(v?.mora_actual ?? false);
      this.score.set(v?.score_cliente_simulado ?? null);
    });
  }

  protected onSubmit(): void {
    if (!this.canSave()) return;
    this.save.emit({
      nombre: this.nombre().trim(),
      segmento: this.segmento().trim(),
      ciudad: this.ciudad().trim(),
      antiguedad: this.antiguedad(),
      num_polizas: this.numPolizas(),
      reclamos_ultimos_12_meses: this.reclamos(),
      mora_actual: this.moraActual(),
      score_cliente_simulado: this.score(),
    });
  }

  protected parseNum(value: string): number | null {
    const n = Number(value);
    return value.trim() === '' || Number.isNaN(n) ? null : n;
  }
}
