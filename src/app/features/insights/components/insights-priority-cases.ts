import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { RiskRing } from '@shared/ui/risk-ring';
import type { Claim } from '@shared/models';
import { formatMoney, ramoIcon, ramoLabel } from '@shared/utils';

@Component({
  selector: 'insights-priority-cases',
  standalone: true,
  imports: [Icon, RiskRing],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="centinela-table-wrap" [class.insights-priority-cases--compact]="compact()">
      <table class="centinela-table">
        <thead>
          <tr>
            <th [class]="compact() ? 'w-12' : 'w-16'">Riesgo</th>
            <th>Siniestro</th>
            @if (!compact()) {
              <th>Asegurado</th>
            }
            <th>Monto</th>
            @if (!compact()) {
              <th>Alertas</th>
            }
            <th class="w-9"></th>
          </tr>
        </thead>
        <tbody>
          @for (claim of claims(); track claim.id) {
            <tr class="cursor-pointer hover:bg-hover" (click)="open.emit(claim.id)">
              <td>
                <ui-risk-ring
                  [score]="claim.score"
                  [size]="compact() ? 34 : 42"
                  [stroke]="compact() ? 3 : 4"
                />
              </td>
              <td>
                <div class="flex items-center gap-2 min-w-0">
                  <ui-icon [name]="ramoIcon(claim.ramo)" [cacheKey]="claim.id" [size]="compact() ? 14 : 16" />
                  <div class="min-w-0">
                    <div class="font-mono text-[12px] text-ink-2">{{ claim.id }}</div>
                    <div class="text-[11px] text-ink-3 truncate">
                      @if (compact()) {
                        {{ claim.asegurado }} · {{ money(claim.monto_reclamado) }}
                      } @else {
                        {{ ramoLabel(claim.ramo) }} · {{ claim.fecha_ocurrencia }}
                      }
                    </div>
                  </div>
                </div>
              </td>
              @if (!compact()) {
                <td>
                  <div class="font-medium truncate max-w-[180px]">{{ claim.asegurado }}</div>
                </td>
                <td class="tabular-nums font-medium">{{ money(claim.monto_reclamado) }}</td>
                <td>
                  @if (claim.alertas.length > 0) {
                    <div class="flex items-center gap-1 flex-wrap">
                      @for (alert of claim.alertas.slice(0, 3); track alert.code) {
                        <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-soft text-ink-2">
                          {{ alert.code }}
                        </span>
                      }
                    </div>
                  } @else {
                    <span class="text-[11.5px] text-ink-3">—</span>
                  }
                </td>
              } @else {
                <td class="tabular-nums font-medium text-[12px]">{{ money(claim.monto_reclamado) }}</td>
              }
              <td class="text-ink-4">
                <ui-icon name="chevron_right" [size]="16" />
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class InsightsPriorityCases {
  readonly claims = input.required<readonly Claim[]>();
  readonly compact = input(false);
  readonly open = output<string>();

  protected readonly money = formatMoney;
  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;
}
