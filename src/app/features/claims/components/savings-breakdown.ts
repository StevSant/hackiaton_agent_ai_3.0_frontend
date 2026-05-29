import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { SavingsEstimate } from '@shared/models';
import { formatMoney } from '@shared/utils/format-money';

/** Presentational — renders the two formula-breakdown lines for a SavingsEstimate. */
@Component({
  selector: 'claim-savings-breakdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2 text-[11.5px] text-ink-2">
      <!-- Valor en riesgo formula -->
      <div class="rounded-md bg-surface-2 px-3 py-2 font-mono text-[10.5px] leading-relaxed">
        <span class="text-ink-3">Valor en riesgo</span>
        {{ valorEnRiesgoFormula() }}
      </div>

      <!-- Ahorro potencial formula -->
      <div class="rounded-md bg-surface-2 px-3 py-2 font-mono text-[10.5px] leading-relaxed">
        <span class="text-ink-3">Ahorro potencial estimado</span>
        {{ ahorroFormula() }}
      </div>
    </div>
  `,
})
export class SavingsBreakdown {
  readonly est = input.required<SavingsEstimate>();
  readonly senalesCount = input<number>(0);
  readonly score = input<number | null>(null);

  protected readonly formatMoney = formatMoney;

  protected readonly valorEnRiesgoFormula = computed(() => {
    const e = this.est();
    return (
      ` ${formatMoney(e.valor_en_riesgo)} = ` +
      `mín(reclamado ${formatMoney(e.monto_reclamado)}, ` +
      `suma aseg. ${formatMoney(e.suma_asegurada)}) − ` +
      `pagado ${formatMoney(e.monto_pagado)} − ` +
      `deducible ${formatMoney(e.deducible)}`
    );
  });

  protected readonly ahorroFormula = computed(() => {
    const e = this.est();
    const pct = (e.prob_fraude_usada * 100).toLocaleString('es-EC', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const tasaPct = (e.tasa_recuperacion * 100).toLocaleString('es-EC', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const source = e.prob_source === 'ml' ? '(modelo ML)' : '(score del caso)';
    return (
      ` ${formatMoney(e.ahorro_potencial_estimado)} = ` +
      `exposición ${formatMoney(e.exposicion)} × ` +
      `probabilidad ${pct}% ${source} × ` +
      `tasa recuperación ${tasaPct}%`
    );
  });

  protected readonly rationaleText = computed(() => {
    const e = this.est();
    const pct = (e.prob_fraude_usada * 100).toLocaleString('es-EC', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const tasaPct = (e.tasa_recuperacion * 100).toLocaleString('es-EC', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const sc = this.score();
    const count = this.senalesCount();

    let intro: string;
    if (e.prob_source === 'ml') {
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
      `Aplicada sobre los ${formatMoney(e.valor_en_riesgo)} que la aseguradora aún puede evitar ` +
      `pagar y ajustada por una tasa de recuperación del ${tasaPct}%, ` +
      `resulta el ahorro potencial estimado.`
    );
  });
}
