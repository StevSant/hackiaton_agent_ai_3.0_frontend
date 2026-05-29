import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Modal } from '@shared/ui/modal';
import type { FraudRule } from '@shared/models';

/**
 * Edits the numeric thresholds of an existing rule. Renders one number input per
 * key in the rule's `thresholds` map (no hardcoded field list — the backend is
 * the source of truth for which thresholds a rule exposes). Emits the full
 * threshold map on save; the parent PATCHes it.
 */
@Component({
  selector: 'alerts-rule-threshold-modal',
  standalone: true,
  imports: [Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="open()"
      [title]="'Editar umbrales · ' + (rule()?.code ?? '')"
      subtitle="Ajusta los umbrales de la regla. Al guardar, Centinela recalcula el score de todos los siniestros."
      size="md"
      (close)="onClose()"
    >
      <form class="px-5 py-5 flex flex-col gap-4" (submit)="onSubmit($event)">
        @if (keys().length === 0) {
          <p class="text-[13px] text-ink-3 m-0">Esta regla no tiene umbrales configurables.</p>
        } @else {
          <div class="flex flex-col gap-3">
            @for (k of keys(); track k) {
              <div class="grid grid-cols-[1fr_140px] gap-3 items-center">
                <label class="text-[13px] font-mono text-ink-2">{{ k }}</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  class="w-full bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] font-mono tabular-nums focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
                  [value]="values()[k]"
                  (input)="setValue(k, $any($event.target).value)"
                />
              </div>
            }
          </div>
        }
      </form>

      <footer footer class="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-line bg-soft">
        <p class="text-[11.5px] text-ink-3 m-0">Las reglas surfacean casos para revisión humana. Nunca acusan.</p>
        <div class="flex gap-2">
          <ui-button (click)="onClose()">Cancelar</ui-button>
          <ui-button variant="primary" [disabled]="!canSubmit()" (click)="onSubmit($event)">
            <ui-icon name="save" [size]="14" />
            Guardar y recalcular
          </ui-button>
        </div>
      </footer>
    </ui-modal>
  `,
})
export class RuleThresholdModal {
  readonly open = input.required<boolean>();
  readonly rule = input<FraudRule | null>(null);
  readonly saving = input<boolean>(false);
  readonly close = output<void>();
  readonly save = output<Record<string, number>>();

  // Local editable copy, seeded from the rule's current thresholds.
  protected readonly values = signal<Record<string, number>>({});

  constructor() {
    // Re-seed the editable copy whenever the bound rule changes (e.g. on open).
    effect(() => {
      const r = this.rule();
      this.values.set(r ? { ...r.thresholds } : {});
    });
  }

  protected readonly keys = computed(() => Object.keys(this.rule()?.thresholds ?? {}).sort());

  protected readonly canSubmit = computed(() => !this.saving() && this.keys().length > 0);

  protected setValue(key: string, raw: string): void {
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    this.values.update((v) => ({ ...v, [key]: n }));
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected onSubmit(e: Event): void {
    e.preventDefault();
    if (!this.canSubmit()) return;
    // Merge edited values over the originals so untouched keys are still sent.
    this.save.emit({ ...(this.rule()?.thresholds ?? {}), ...this.values() });
    this.close.emit();
  }
}
