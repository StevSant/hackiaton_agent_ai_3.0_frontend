import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { InboxRowDto } from '@core/api/clients/claim.dto';
import { Icon } from '@shared/ui/icon';
import { RiskRing } from '@shared/ui/risk-ring';
import { SortableHeader } from '@shared/ui/sortable-header';
import { formatDateTime, ramoIcon, ramoLabel, TableSortController } from '@shared/utils';

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
  imports: [Icon, RiskRing, SortableHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="centinela-table-wrap">
      <table class="centinela-table">
        <thead>
          <tr>
            <th sortKey="score" [sort]="sort()" class="w-16">Riesgo</th>
            <th sortKey="claim_id" [sort]="sort()">Siniestro</th>
            <th>Nota del analista</th>
            <th sortKey="dueno" [sort]="sort()">Dueño</th>
            <th sortKey="recibido" [sort]="sort()">Recibido</th>
            <th sortKey="estado" [sort]="sort()">Estado</th>
            <th sortKey="rework" [sort]="sort()">Re-trabajo</th>
          </tr>
        </thead>
        <tbody>
          @for (vm of vms(); track vm.row.claim_id) {
            <tr
              [attr.data-keyboard-row]="vm.row.claim_id"
              [class.centinela-table-row--focused]="focusedId() === vm.row.claim_id"
              (click)="open.emit(vm.row.claim_id)"
            >
              <td>
                <ui-risk-ring [score]="vm.row.score" [size]="42" [stroke]="4" />
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <ui-icon [name]="ramoIcon(vm.row.ramo)" [cacheKey]="vm.row.claim_id" [size]="16" />
                  <div>
                    <div class="font-mono text-[12px] text-ink-2">{{ vm.row.claim_id }}</div>
                    <div class="text-[11.5px] text-ink-3">{{ ramoLabel(vm.row.ramo) }} · {{ vm.row.asegurado }}</div>
                  </div>
                </div>
              </td>
              <td class="max-w-[320px]">
                <span class="text-[12.5px] text-ink-2 line-clamp-2">{{ vm.notePreview }}</span>
              </td>
              <td class="text-[12.5px]">{{ vm.duenoLabel }}</td>
              <td class="text-[12px] text-ink-3 tabular-nums">{{ vm.whenLabel }}</td>
              <td>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium" [class]="vm.statusPalette">
                  {{ vm.statusLabel }}
                </span>
              </td>
              <td class="text-[12px] tabular-nums">
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
  readonly sort = input.required<TableSortController>();
  readonly focusedId = input<string | null>(null);
  readonly open = output<string>();

  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;

  // Ordering is owned by the page (default tier→FIFO + user override), so this
  // only maps each row to its view model — it renders in the order it receives.
  protected readonly vms = computed<InboxRowVm[]>(() =>
    this.rows().map((row) => {
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
    }),
  );
}
