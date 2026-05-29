import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import type { FraudRule } from '../models';

@Component({
  selector: 'alerts-rule-row',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-[96px_1fr_120px_72px_120px_150px] gap-4 items-center px-5 py-3.5 border-t border-line first:border-t-0">
      <span class="font-mono text-[12px] px-2 py-0.5 rounded" [class]="codeChipClass()">{{ rule().code }}</span>

      <div class="min-w-0">
        <div class="font-medium text-[13.5px]">{{ rule().titulo }}</div>
        <div class="text-[12px] text-ink-3 mt-0.5">{{ rule().descripcion }}</div>
      </div>

      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] w-fit" [class]="tierChipClass()">
        <span class="tier-dot" [class]="tierDotClass()" style="box-shadow: none"></span>
        {{ tierLabel() }}
      </span>

      <span class="font-mono tabular-nums text-[12.5px] text-right">+{{ rule().maxPts }}</span>

      <div class="flex items-center gap-2">
        <div class="flex-1 h-1.5 bg-soft rounded-full overflow-hidden">
          <div class="bar-fill h-full" [style.width.%]="activationPct()" style="background: var(--brand)"></div>
        </div>
        <span class="font-mono tabular-nums text-[12px] text-ink-2 min-w-[20px] text-right">{{ rule().activaciones30d }}</span>
      </div>

      @if (readonly()) {
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[12px] border" [class]="toggleClass()">
          <ui-icon [name]="rule().enabled ? 'toggle_on' : 'toggle_off'" [size]="16" [fill]="rule().enabled" />
          {{ rule().enabled ? 'Activa' : 'Pausada' }}
        </span>
      } @else {
        <div class="flex items-center justify-end gap-1.5">
          @if (hasThresholds()) {
            <button
              type="button"
              title="Editar umbrales"
              class="inline-flex items-center justify-center w-7 h-7 rounded-sm border border-line text-ink-3 hover:bg-hover disabled:opacity-50"
              [disabled]="busy()"
              (click)="edit.emit(rule().code)"
            >
              <ui-icon name="tune" [size]="15" />
            </button>
          }
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[12px] border disabled:opacity-50"
            [class]="toggleClass()"
            [disabled]="busy()"
            (click)="toggle.emit(rule().code)"
          >
            <ui-icon [name]="rule().enabled ? 'toggle_on' : 'toggle_off'" [size]="16" [fill]="rule().enabled" />
            {{ rule().enabled ? 'Activa' : 'Pausada' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class RuleRow {
  readonly rule = input.required<FraudRule>();
  readonly toggle = output<string>();
  readonly edit = output<string>();
  readonly maxActivations = input<number>(20);
  readonly readonly = input<boolean>(false);
  readonly busy = input<boolean>(false);

  protected readonly hasThresholds = computed(
    () => Object.keys(this.rule().thresholds ?? {}).length > 0,
  );

  protected readonly activationPct = computed(() =>
    Math.min(100, Math.round((this.rule().activaciones30d / this.maxActivations()) * 100)),
  );

  protected readonly codeChipClass = computed(() => {
    const k = this.rule().kind;
    return k === 'critica'
      ? 'bg-tier-red-soft text-tier-red-ink'
      : k === 'amarilla'
        ? 'bg-tier-yellow-soft text-tier-yellow-ink'
        : 'bg-soft text-ink-2';
  });

  protected readonly tierChipClass = computed(() => {
    const t = this.rule().clasificacion;
    return t === 'rojo'
      ? 'bg-tier-red-soft text-tier-red-ink'
      : t === 'amarillo'
        ? 'bg-tier-yellow-soft text-tier-yellow-ink'
        : 'bg-tier-green-soft text-tier-green-ink';
  });

  protected readonly tierDotClass = computed(() => {
    const t = this.rule().clasificacion;
    return t === 'rojo' ? 'tier-dot-r' : t === 'amarillo' ? 'tier-dot-y' : 'tier-dot-g';
  });

  protected readonly tierLabel = computed(() => {
    const t = this.rule().clasificacion;
    return t === 'rojo' ? 'Crítico' : t === 'amarillo' ? 'Medio' : 'Observación';
  });

  protected readonly toggleClass = computed(() =>
    this.rule().enabled
      ? 'bg-tier-green-soft text-tier-green-ink border-transparent hover:opacity-80'
      : 'bg-soft text-ink-3 border-line hover:bg-hover',
  );
}
