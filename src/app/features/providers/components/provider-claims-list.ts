import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { RiskRing } from '@shared/ui/risk-ring';
import { formatMoney, ramoIcon, ramoLabel } from '@shared/utils';
import type { Claim } from '@shared/models';

@Component({
  selector: 'provider-claims-list',
  standalone: true,
  imports: [Icon, RiskRing],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-[13px] border-collapse">
          <thead>
            <tr class="bg-soft">
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line w-16">Riesgo</th>
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Siniestro</th>
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Asegurado</th>
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Cobertura</th>
              <th class="text-right font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Monto</th>
              <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Estado</th>
              <th class="border-b border-line w-9"></th>
            </tr>
          </thead>
          <tbody>
            @for (c of claims(); track c.id) {
              <tr class="cursor-pointer hover:bg-soft transition-colors" (click)="open.emit(c.id)">
                <td class="px-3 py-3 border-b border-line align-middle">
                  <ui-risk-ring [score]="c.score" [size]="38" [stroke]="4" />
                </td>
                <td class="px-3 py-3 border-b border-line align-middle">
                  <div class="flex items-center gap-2">
                    <ui-icon [name]="ramoIcon(c.ramo)" [cacheKey]="c.id" [size]="16" />
                    <div>
                      <div class="font-mono text-[12px] text-ink-2">{{ c.id }}</div>
                      <div class="text-[11.5px] text-ink-3">{{ ramoLabel(c.ramo) }} · {{ c.fecha_ocurrencia }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3 border-b border-line align-middle">
                  <div class="font-medium">{{ c.asegurado }}</div>
                  <div class="text-[11.5px] text-ink-3 font-mono">{{ c.asegurado_id }}</div>
                </td>
                <td class="px-3 py-3 border-b border-line align-middle">{{ c.cobertura }}</td>
                <td class="px-3 py-3 border-b border-line align-middle text-right tabular-nums font-medium">{{ money(c.monto_reclamado) }}</td>
                <td class="px-3 py-3 border-b border-line align-middle">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line">{{ c.estado }}</span>
                </td>
                <td class="px-3 py-3 border-b border-line align-middle text-ink-4">
                  <ui-icon name="chevron_right" [size]="16" />
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ProviderClaimsList {
  readonly claims = input.required<readonly Claim[]>();
  readonly open = output<string>();

  protected readonly money = formatMoney;
  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;
}
