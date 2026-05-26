import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';
import { Modal } from '../../../shared/ui/modal';
import type { RiskTier } from '../../../shared/utils';

@Component({
  selector: 'alerts-new-rule-modal',
  standalone: true,
  imports: [Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="open()"
      title="Nueva regla de detección"
      subtitle="Define una nueva señal de posible fraude. Centinela la evaluará en el próximo lote."
      size="md"
      (close)="onClose()"
    >
      <form class="px-5 py-5 flex flex-col gap-4" (submit)="onSubmit($event)">
        <div class="grid grid-cols-[140px_1fr] gap-3">
          <div>
            <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">Código</label>
            <input
              class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] font-mono focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
              placeholder="FS-15"
              [value]="code()"
              (input)="code.set($any($event.target).value)"
            />
          </div>
          <div>
            <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">Nombre de la regla</label>
            <input
              class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
              placeholder="Reclamo en feriado nacional"
              [value]="name()"
              (input)="name.set($any($event.target).value)"
            />
          </div>
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">Descripción</label>
          <textarea
            rows="3"
            class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none resize-none"
            placeholder="Describe el patrón que activa la regla y por qué importa para la revisión antifraude."
            [value]="description()"
            (input)="description.set($any($event.target).value)"
          ></textarea>
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">Clasificación</label>
          <div class="grid grid-cols-3 gap-2">
            @for (t of tiers; track t.value) {
              <button
                type="button"
                class="flex flex-col items-start gap-1 px-3 py-2.5 rounded-sm border text-left"
                [class]="tierBtnClass(t.value)"
                (click)="tier.set(t.value)"
              >
                <span class="inline-flex items-center gap-1.5 text-[12.5px] font-medium">
                  <span class="tier-dot" [class]="t.dot" style="box-shadow: none"></span>
                  {{ t.label }}
                </span>
                <span class="text-[11px] text-ink-3">{{ t.hint }}</span>
              </button>
            }
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">Puntaje máximo</label>
            <div class="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                class="flex-1 accent-[var(--brand)]"
                [value]="maxPts()"
                (input)="maxPts.set(+$any($event.target).value)"
              />
              <span class="font-mono tabular-nums w-10 text-right text-[13px]">+{{ maxPts() }}</span>
            </div>
          </div>
          <div>
            <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-1.5">Categoría</label>
            <select
              class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
              [value]="kind()"
              (change)="kind.set($any($event.target).value)"
            >
              <option value="scored">Aditiva (FS) — suma al score</option>
              <option value="amarilla">Amarilla — sube a tier 🟡</option>
              <option value="critica">Crítica (RF) — sube a tier 🔴</option>
            </select>
          </div>
        </div>

        <div class="bg-soft border border-line rounded-sm px-3.5 py-3 flex items-start gap-3">
          <ui-icon name="info" [size]="16" />
          <div class="flex-1 text-[12px] text-ink-3 leading-relaxed">
            La regla pasará a un <b class="text-ink-2">modo observación</b> durante 7 días antes de afectar el score real.
            Durante ese período podrás revisar sus activaciones y descartar falsos positivos.
          </div>
        </div>
      </form>

      <footer footer class="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-line bg-soft">
        <p class="text-[11.5px] text-ink-3 m-0">
          Recuerda: estas reglas surfacean casos para revisión humana. Nunca acusan.
        </p>
        <div class="flex gap-2">
          <ui-button (click)="onClose()">Cancelar</ui-button>
          <ui-button variant="primary" [disabled]="!canSubmit()" (click)="onSubmit($event)">
            <ui-icon name="add" [size]="14" />
            Crear regla
          </ui-button>
        </div>
      </footer>
    </ui-modal>
  `,
})
export class NewRuleModal {
  readonly open = input.required<boolean>();
  readonly close = output<void>();
  readonly save = output<void>();

  protected readonly code = signal<string>('FS-15');
  protected readonly name = signal<string>('');
  protected readonly description = signal<string>('');
  protected readonly tier = signal<RiskTier>('amarillo');
  protected readonly maxPts = signal<number>(5);
  protected readonly kind = signal<'critica' | 'amarilla' | 'scored'>('scored');

  protected readonly tiers: { value: RiskTier; label: string; dot: string; hint: string }[] = [
    { value: 'verde', label: 'Verde', dot: 'tier-dot-g', hint: 'Observación · no escala' },
    { value: 'amarillo', label: 'Amarillo', dot: 'tier-dot-y', hint: 'Revisión documental' },
    { value: 'rojo', label: 'Rojo', dot: 'tier-dot-r', hint: 'Escalamiento crítico' },
  ];

  protected readonly canSubmit = computed(() => this.code().trim().length >= 4 && this.name().trim().length >= 4);

  protected tierBtnClass(t: RiskTier): string {
    const active = this.tier() === t;
    if (active) {
      return t === 'rojo'
        ? 'bg-tier-red-soft border-tier-red-ink ring-2 ring-tier-red-soft'
        : t === 'amarillo'
          ? 'bg-tier-yellow-soft border-tier-yellow-ink ring-2 ring-tier-yellow-soft'
          : 'bg-tier-green-soft border-tier-green-ink ring-2 ring-tier-green-soft';
    }
    return 'bg-surface border-line hover:bg-hover';
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected onSubmit(e: Event): void {
    e.preventDefault();
    if (!this.canSubmit()) return;
    this.save.emit();
    this.close.emit();
  }
}
