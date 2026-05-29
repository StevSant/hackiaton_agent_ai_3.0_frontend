import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { RiskBadge } from '@shared/ui/risk-badge';
import { formatMoneyShort, ramoLabel } from '@shared/utils';
import type { ClaimTablePayload } from '../models/claim-table.model';

/** Renders structured `query_claims` results as a compact triage table in chat. */
@Component({
  selector: 'agent-table',
  standalone: true,
  imports: [RiskBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-line bg-surface p-3 mt-1 w-full max-w-[720px] overflow-x-auto">
      <div class="flex items-center justify-between gap-2 mb-2.5 min-w-[520px]">
        <span class="text-[12.5px] font-semibold text-ink">{{ payload().title }}</span>
        <span class="text-[11px] text-ink-3 tabular-nums">{{ payload().rows.length }} filas</span>
      </div>

      <table class="w-full min-w-[520px] text-[12px] border-collapse">
        <thead>
          <tr class="text-left text-ink-3 border-b border-line">
            <th class="py-1.5 pr-2 font-medium">ID</th>
            <th class="py-1.5 pr-2 font-medium">Asegurado</th>
            <th class="py-1.5 pr-2 font-medium">Ramo</th>
            <th class="py-1.5 pr-2 font-medium text-right">Monto</th>
            <th class="py-1.5 pr-2 font-medium text-right">Score</th>
            <th class="py-1.5 font-medium">Nivel</th>
          </tr>
        </thead>
        <tbody>
          @for (row of payload().rows; track row.id) {
            <tr class="border-b border-line/60 last:border-0 hover:bg-hover/60">
              <td class="py-2 pr-2">
                <button
                  type="button"
                  class="font-mono text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  (click)="openCase.emit(row.id)"
                >
                  {{ row.id }}
                </button>
              </td>
              <td class="py-2 pr-2 text-ink-2 max-w-[140px] truncate" [title]="row.asegurado">
                {{ row.asegurado }}
              </td>
              <td class="py-2 pr-2 text-ink-3 whitespace-nowrap">{{ ramoLabel(row.ramo) }}</td>
              <td class="py-2 pr-2 text-ink-2 text-right tabular-nums whitespace-nowrap">
                {{ formatMoneyShort(row.monto_reclamado) }}
              </td>
              <td class="py-2 pr-2 text-ink font-semibold text-right tabular-nums">{{ row.score }}</td>
              <td class="py-2">
                <ui-risk-badge [nivel]="row.nivel" />
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class AgentTable {
  readonly payload = input.required<ClaimTablePayload>();
  readonly openCase = output<string>();

  protected readonly formatMoneyShort = formatMoneyShort;
  protected readonly ramoLabel = ramoLabel;
}
