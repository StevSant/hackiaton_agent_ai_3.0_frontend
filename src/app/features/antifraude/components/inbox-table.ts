import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { InboxRowDto } from '@core/api/clients/claim.dto';
import { Icon } from '@shared/ui/icon';
import { RiskRing } from '@shared/ui/risk-ring';
import { formatDateTime, ramoIcon, ramoLabel } from '@shared/utils';

interface InboxRowVm {
  row: InboxRowDto;
  statusLabel: string;
  statusPalette: string;
  duenoLabel: string;
  whenLabel: string;
  notePreview: string;
}

@Component({
  selector: 'antifraude-inbox-table',
  standalone: true,
  imports: [Icon, RiskRing],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-[13px] border-collapse">
        <thead>
          <tr class="bg-soft">
            <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line w-16">Riesgo</th>
            <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Siniestro</th>
            <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Nota del analista</th>
            <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Dueño</th>
            <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Recibido</th>
            <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Estado</th>
            <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Re-trabajo</th>
          </tr>
        </thead>
        <tbody>
          @for (vm of vms(); track vm.row.claim_id) {
            <tr class="cursor-pointer hover:bg-soft transition-colors" (click)="open.emit(vm.row.claim_id)">
              <td class="px-3 py-3 border-b border-line align-middle">
                <ui-risk-ring [score]="vm.row.score" [size]="42" [stroke]="4" />
              </td>
              <td class="px-3 py-3 border-b border-line align-middle">
                <div class="flex items-center gap-2">
                  <ui-icon [name]="ramoIcon(vm.row.ramo)" [size]="16" />
                  <div>
                    <div class="font-mono text-[12px] text-ink-2">{{ vm.row.claim_id }}</div>
                    <div class="text-[11.5px] text-ink-3">{{ ramoLabel(vm.row.ramo) }} · {{ vm.row.asegurado }}</div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3 border-b border-line align-middle max-w-[320px]">
                <span class="text-[12.5px] text-ink-2 line-clamp-2">{{ vm.notePreview }}</span>
              </td>
              <td class="px-3 py-3 border-b border-line align-middle text-[12.5px]">{{ vm.duenoLabel }}</td>
              <td class="px-3 py-3 border-b border-line align-middle text-[12px] text-ink-3 tabular-nums">{{ vm.whenLabel }}</td>
              <td class="px-3 py-3 border-b border-line align-middle">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium" [class]="vm.statusPalette">
                  {{ vm.statusLabel }}
                </span>
              </td>
              <td class="px-3 py-3 border-b border-line align-middle text-[12px] tabular-nums">
                @if (vm.row.bounce_count > 0) {
                  <span class="inline-flex items-center gap-1 text-tier-yellow-ink">
                    <ui-icon name="restart_alt" [size]="13" />
                    {{ vm.row.bounce_count }}
                  </span>
                } @else {
                  <span class="text-ink-3">—</span>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class InboxTable {
  readonly rows = input.required<readonly InboxRowDto[]>();
  readonly open = output<string>();

  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;

  protected readonly vms = computed<InboxRowVm[]>(() => {
    return [...this.rows()]
      .sort((a, b) => {
        const tierRank: Record<string, number> = { rojo: 0, amarillo: 1, verde: 2 };
        const ta = tierRank[a.nivel] ?? 9;
        const tb = tierRank[b.nivel] ?? 9;
        if (ta !== tb) return ta - tb;
        const da = a.escalated_at ?? '';
        const db = b.escalated_at ?? '';
        return da.localeCompare(db);
      })
      .map((row) => {
        const assigned = !!row.assigned_to_name;
        return {
          row,
          statusLabel: assigned ? 'En revisión' : 'Escalado',
          statusPalette: assigned
            ? 'bg-brand-soft text-brand-ink'
            : 'bg-tier-yellow-soft text-tier-yellow-ink',
          duenoLabel: row.assigned_to_name ?? 'Sin asignar',
          whenLabel: formatDateTime(row.escalated_at) ?? '—',
          notePreview: row.escalation_note_preview ?? '(sin nota)',
        };
      });
  });
}
