import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { formatMoney } from '../../../shared/utils';
import type { Claim } from '../models';

@Component({
  selector: 'claim-meta-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <h3 class="text-[13px] font-semibold m-0">Datos del caso</h3>
      </div>
      <div class="grid grid-cols-2 gap-y-3.5 gap-x-6 px-5 py-4.5">
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Póliza</div>
          <div class="text-[13.5px] font-medium font-mono">{{ claim().poliza }}</div>
        </div>
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Asegurado</div>
          <div class="text-[13.5px] font-medium font-mono">{{ claim().asegurado_id }}</div>
        </div>
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Suma asegurada</div>
          <div class="text-[13.5px] font-medium tabular-nums">{{ money(claim().suma_asegurada) }}</div>
        </div>
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Monto reclamado</div>
          <div class="text-[13.5px] font-medium tabular-nums">{{ money(claim().monto_reclamado) }}</div>
        </div>
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Sucursal</div>
          <div class="text-[13.5px] font-medium">{{ claim().sucursal }}</div>
        </div>
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Ciudad</div>
          <div class="text-[13.5px] font-medium">{{ claim().ciudad }}</div>
        </div>
      </div>
    </div>
  `,
})
export class CaseMetaCard {
  readonly claim = input.required<Claim>();
  protected readonly money = formatMoney;
}
