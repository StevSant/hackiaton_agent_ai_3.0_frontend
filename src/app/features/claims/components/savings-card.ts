import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import type { SavingsEstimate } from '@shared/models';
import { formatMoney } from '@shared/utils/format-money';
import { SavingsBreakdown } from './savings-breakdown';

@Component({
  selector: 'claim-savings-card',
  standalone: true,
  imports: [SavingsBreakdown, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (estimate(); as est) {
      <div class="bg-surface border border-line rounded-lg px-5 py-4 shadow-1 flex flex-col gap-3.5">
        <div class="flex items-center gap-2">
          <span class="grid place-items-center w-7 h-7 rounded-md bg-tier-green-soft text-tier-green-ink shrink-0">
            <ui-icon name="savings" [size]="16" />
          </span>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium">
            Estimación de ahorro potencial
          </div>
        </div>

        <!-- Headline figures — two tinted stat tiles, exposure → potential saving -->
        <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch gap-3">
          <div class="rounded-lg border border-tier-red-ink/15 bg-tier-red-soft/40 px-3.5 py-3 flex flex-col gap-1">
            <span class="inline-flex items-center gap-1.5 text-[11px] font-medium text-tier-red-ink">
              <ui-icon name="warning" [size]="13" />
              Valor en riesgo
            </span>
            <span class="font-serif text-[24px] leading-none tabular-nums text-tier-red-ink">
              {{ formatMoney(est.valor_en_riesgo) }}
            </span>
            <span class="text-[10.5px] text-ink-3">Exposición que aún se puede evitar pagar</span>
          </div>

          <div class="hidden sm:grid place-items-center text-ink-4" aria-hidden="true">
            <ui-icon name="arrow_forward" [size]="18" />
          </div>

          <div class="rounded-lg border border-tier-green-ink/25 bg-tier-green-soft/50 px-3.5 py-3 flex flex-col gap-1">
            <span class="inline-flex items-center gap-1.5 text-[11px] font-medium text-tier-green-ink">
              <ui-icon name="trending_down" [size]="13" />
              Ahorro potencial estimado
            </span>
            <span class="font-serif text-[26px] font-medium leading-none tabular-nums text-tier-green-ink">
              {{ formatMoney(est.ahorro_potencial_estimado) }}
            </span>
            <span class="text-[10.5px] text-ink-3">Si la revisión confirma la sospecha</span>
          </div>
        </div>

        <!-- Expandable breakdown -->
        <div>
          <button
            type="button"
            class="flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink transition-colors cursor-pointer"
            (click)="toggleBreakdown()"
            [attr.aria-expanded]="showBreakdown()"
          >
            <span
              class="inline-block transition-transform duration-150"
              [class.rotate-90]="showBreakdown()"
              aria-hidden="true"
              >▶</span
            >
            ¿Cómo se calcula?
          </button>

          @if (showBreakdown()) {
            <div class="mt-2 flex flex-col gap-2">
              <claim-savings-breakdown
                [est]="est"
                [score]="score()"
                [senalesCount]="senalesCount()"
              />
              <!-- Rationale rendered inline via the breakdown's computed — reuse the component's signal -->
              <p class="text-[11px] text-ink-2 m-0 leading-relaxed italic">
                {{ rationaleFor(est) }}
              </p>
            </div>
          }
        </div>

        <!-- Ethics disclaimer -->
        <p
          class="flex items-start gap-1.5 text-[11px] text-ink-3 m-0 leading-relaxed pt-2.5 border-t border-line"
        >
          <ui-icon name="info" [size]="13" class="mt-0.5 shrink-0" />
          <span>
            Estimación basada en señales de riesgo, sujeta a revisión humana. No representa posible
            fraude confirmado.
          </span>
        </p>
      </div>
    } @else {
      <div class="bg-surface border border-line rounded-lg px-5 py-4 shadow-1 flex flex-col gap-1.5">
        <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium">
          Estimación de ahorro potencial
        </div>
        <p class="text-[12.5px] text-ink-2 m-0 leading-relaxed">{{ unavailableReason() }}</p>
      </div>
    }
  `,
})
export class SavingsCard {
  readonly ahorro = input.required<SavingsEstimate | null | undefined>();
  readonly score = input<number | null>(null);
  readonly senalesCount = input<number>(0);
  // Claim amounts — used to explain WHY there's no estimate when ahorro is null.
  readonly montoReclamado = input<number | null>(null);
  readonly sumaAsegurada = input<number | null>(null);

  protected readonly showBreakdown = signal(false);
  protected readonly formatMoney = formatMoney;

  /** A MEANINGFUL estimate — only when there's real exposure (valor en riesgo > 0).
   * A $0 estimate (no amounts / nothing left to pay) shows the reason instead. */
  protected readonly estimate = computed(() => {
    const a = this.ahorro();
    return a && a.valor_en_riesgo > 0 ? a : null;
  });

  /** When there's no meaningful estimate, say WHY — exposure can't be computed. */
  protected readonly unavailableReason = computed(() => {
    const a = this.ahorro();
    const monto = a ? a.monto_reclamado : this.montoReclamado();
    const suma = a ? a.suma_asegurada : this.sumaAsegurada();
    if (monto != null && monto <= 0) {
      return 'No se puede estimar el ahorro: el siniestro no registra monto reclamado ($0). Sin monto reclamado no hay exposición que la aseguradora pueda evitar pagar.';
    }
    if (suma != null && suma <= 0) {
      return 'No se puede estimar el ahorro: la póliza no registra suma asegurada ($0), necesaria para acotar la exposición del caso.';
    }
    if (a) {
      // amounts present but exposure is 0 → already paid or covered by the deductible
      return 'No queda exposición pendiente: el monto a riesgo es $0 (el caso ya fue liquidado o está cubierto por el deducible), por eso no hay ahorro que estimar.';
    }
    return 'La estimación de ahorro aún no se ha calculado para este caso. Pulsá «Re-analizar caso» para generarla.';
  });

  protected toggleBreakdown(): void {
    this.showBreakdown.update((v) => !v);
  }

  /** Rationale sentence — computed inline to avoid a second breakdown component instance. */
  protected rationaleFor(est: SavingsEstimate): string {
    const pct = (est.prob_fraude_usada * 100).toLocaleString('es-EC', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const tasaPct = (est.tasa_recuperacion * 100).toLocaleString('es-EC', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const sc = this.score();
    const count = this.senalesCount();

    let intro: string;
    if (est.prob_source === 'ml') {
      const signals =
        count > 0
          ? ` (${count} ${count === 1 ? 'señal activada' : 'señales activadas'}, score ${sc ?? '—'}/100)`
          : sc != null
            ? ` (score ${sc}/100)`
            : '';
      intro = `El modelo asigna ${pct}% de probabilidad de posible fraude a este caso${signals}.`;
    } else {
      const signals =
        count > 0 ? ` (${count} ${count === 1 ? 'señal activada' : 'señales activadas'})` : '';
      intro = `Según el score de riesgo del caso${signals}, se estima una probabilidad del ${pct}%.`;
    }

    return (
      `${intro} ` +
      `Aplicada sobre los ${formatMoney(est.valor_en_riesgo)} que la aseguradora aún puede evitar ` +
      `pagar y ajustada por una tasa de recuperación del ${tasaPct}%, ` +
      `resulta el ahorro potencial estimado.`
    );
  }
}
