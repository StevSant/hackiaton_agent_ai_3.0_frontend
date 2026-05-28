import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import type { Provider } from '@shared/models';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Modal } from '@shared/ui/modal';

export interface ProviderFormValue {
  nombre: string;
  tipo: string;
  ciudad: string;
  antiguedad: number | null;
  listaRestrictiva: boolean;
}

@Component({
  selector: 'provider-form-modal',
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
            placeholder="Taller, clínica o beneficiario"
            [value]="nombre()"
            (input)="nombre.set($any($event.target).value)"
          />
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
            Tipo <span class="text-tier-red-ink">*</span>
          </label>
          <input
            type="text"
            class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
            placeholder="Taller / Clínica / Beneficiario"
            [value]="tipo()"
            (input)="tipo.set($any($event.target).value)"
          />
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
            Ciudad <span class="text-tier-red-ink">*</span>
          </label>
          <input
            type="text"
            class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
            placeholder="Guayaquil"
            [value]="ciudad()"
            (input)="ciudad.set($any($event.target).value)"
          />
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">
            Antigüedad (meses)
          </label>
          <input
            type="number"
            min="0"
            class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
            [value]="antiguedad() ?? ''"
            (input)="antiguedad.set(parseNum($any($event.target).value))"
          />
        </div>

        <label
          class="flex items-center gap-2 px-3 py-2 rounded-sm border border-line bg-surface cursor-pointer select-none self-end"
        >
          <input
            type="checkbox"
            class="accent-[var(--brand)]"
            [checked]="listaRestrictiva()"
            (change)="listaRestrictiva.set($any($event.target).checked)"
          />
          <span class="text-[13px] font-medium">En lista restrictiva</span>
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
export class ProviderFormModal {
  readonly open = input.required<boolean>();
  readonly mode = input<'create' | 'edit'>('create');
  readonly value = input<Provider | null>(null);
  readonly save = output<ProviderFormValue>();
  readonly close = output<void>();

  protected readonly nombre = signal<string>('');
  protected readonly tipo = signal<string>('');
  protected readonly ciudad = signal<string>('');
  protected readonly antiguedad = signal<number | null>(null);
  protected readonly listaRestrictiva = signal<boolean>(false);

  protected readonly title = computed(() =>
    this.mode() === 'edit' ? 'Editar proveedor' : 'Agregar proveedor',
  );
  protected readonly subtitle = computed(() =>
    this.mode() === 'edit'
      ? 'Actualiza los datos del proveedor o beneficiario.'
      : 'Registra un proveedor o beneficiario manualmente.',
  );
  protected readonly canSave = computed(
    () => this.tipo().trim().length > 0 && this.ciudad().trim().length > 0,
  );

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const v = this.value();
      this.nombre.set(v?.nombre ?? '');
      this.tipo.set(v?.tipo ?? '');
      this.ciudad.set(v?.ciudad ?? '');
      this.antiguedad.set(null);
      this.listaRestrictiva.set(v?.listaRestrictiva ?? false);
    });
  }

  protected onSubmit(): void {
    if (!this.canSave()) return;
    this.save.emit({
      nombre: this.nombre().trim(),
      tipo: this.tipo().trim(),
      ciudad: this.ciudad().trim(),
      antiguedad: this.antiguedad(),
      listaRestrictiva: this.listaRestrictiva(),
    });
  }

  protected parseNum(value: string): number | null {
    const n = Number(value);
    return value.trim() === '' || Number.isNaN(n) ? null : n;
  }
}
