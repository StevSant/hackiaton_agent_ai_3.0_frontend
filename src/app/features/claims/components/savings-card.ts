import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import type { SavingsEstimate } from '@shared/models';
import { formatMoney } from '@shared/utils/format-money';
import { SavingsBreakdown } from './savings-breakdown';

@Component({
  selector: 'claim-savings-card',
  standalone: true,
  imports: [SavingsBreakdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ahorro(); as est) {
      <div class="bg-surface border border-line rounded-lg px-5 py-4 shadow-1 flex flex-col gap-3">
        <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium">
          Estimación de ahorro potencial
        </div>

        <!-- Headline figures — always visible -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">Valor en riesgo</span>
            <span class="font-serif text-[22px] leading-none tabular-nums text-tier-red-ink">
              {{ formatMoney(est.valor_en_riesgo) }}
            </span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">Ahorro potencial estimado</span>
            <span class="font-serif text-[22px] leading-none tabular-nums text-tier-green-ink">
              {{ formatMoney(est.ahorro_potencial_estimado) }}
            </span>
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
          class="text-[11px] text-ink-3 m-0 leading-relaxed"
          title="Estimación basada en señales de riesgo, sujeta a revisión humana. No representa posible fraude confirmado."
        >
          Estimación basada en señales de riesgo, sujeta a revisión humana. No representa posible
          fraude confirmado.
        </p>
      </div>
    } @else {
      <div class="bg-surface border border-line rounded-lg px-5 py-4 shadow-1">
        <p class="text-[12.5px] text-ink-3 m-0">Sin estimación de ahorro disponible.</p>
      </div>
    }
  `,
})
export class SavingsCard {
  readonly ahorro = input.required<SavingsEstimate | null | undefined>();
  readonly score = input<number | null>(null);
  readonly senalesCount = input<number>(0);

  protected readonly showBreakdown = signal(false);
  protected readonly formatMoney = formatMoney;

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
