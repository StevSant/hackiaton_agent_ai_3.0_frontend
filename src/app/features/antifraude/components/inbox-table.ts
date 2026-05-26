import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon } from '../../../shared/ui/icon';
import { RiskRing } from '../../../shared/ui/risk-ring';
import { formatDateTime, ramoIcon, ramoLabel } from '../../../shared/utils';
import type { Claim } from '../../claims/models';

interface InboxRow {
  claim: Claim;
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
            <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Cobertura</th>
            <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Nota del analista</th>
            <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Dueño</th>
            <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Recibido</th>
            <th class="text-left font-medium text-ink-3 text-[11.5px] tracking-wide py-2.5 px-3 border-b border-line">Estado</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.claim.id) {
            <tr class="cursor-pointer hover:bg-soft transition-colors" (click)="open.emit(row.claim.id)">
              <td class="px-3 py-3 border-b border-line align-middle">
                <ui-risk-ring [score]="row.claim.score" [size]="42" [stroke]="4" />
              </td>
              <td class="px-3 py-3 border-b border-line align-middle">
                <div class="flex items-center gap-2">
                  <ui-icon [name]="ramoIcon(row.claim.ramo)" [size]="16" />
                  <div>
                    <div class="font-mono text-[12px] text-ink-2">{{ row.claim.id }}</div>
                    <div class="text-[11.5px] text-ink-3">{{ ramoLabel(row.claim.ramo) }} · {{ row.claim.asegurado }}</div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3 border-b border-line align-middle">{{ row.claim.cobertura }}</td>
              <td class="px-3 py-3 border-b border-line align-middle max-w-[280px]">
                <span class="text-[12.5px] text-ink-2 line-clamp-2">{{ row.notePreview }}</span>
              </td>
              <td class="px-3 py-3 border-b border-line align-middle text-[12.5px]">{{ row.duenoLabel }}</td>
              <td class="px-3 py-3 border-b border-line align-middle text-[12px] text-ink-3 tabular-nums">{{ row.whenLabel }}</td>
              <td class="px-3 py-3 border-b border-line align-middle">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium" [class]="row.statusPalette">
                  {{ row.statusLabel }}
                </span>
              </td>
            </tr>
          }
        </tbody>
      </table>
      @if (rows().length === 0) {
        <div class="px-5 py-12 text-center text-ink-3 text-[13px]">
          La bandeja de Antifraude está vacía. Cuando un analista escale un caso, aparecerá aquí.
        </div>
      }
    </div>
  `,
})
export class InboxTable {
  readonly claims = input.required<readonly Claim[]>();
  readonly open = output<string>();

  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;

  protected readonly rows = computed<InboxRow[]>(() => {
    return [...this.claims()]
      .sort((a, b) => {
        // Rojo first, then amarillo, then verde — and within tier, FIFO by escalated_at.
        const tierRank: Record<string, number> = { rojo: 0, amarillo: 1, verde: 2 };
        const ta = tierRank[a.nivel] ?? 9;
        const tb = tierRank[b.nivel] ?? 9;
        if (ta !== tb) return ta - tb;
        const da = a.review.escalated_at ?? '';
        const db = b.review.escalated_at ?? '';
        return da.localeCompare(db);
      })
      .map((claim) => {
        const r = claim.review;
        const status = r.status;
        return {
          claim,
          statusLabel: status === 'en_revision' ? 'En revisión' : 'Escalado',
          statusPalette:
            status === 'en_revision'
              ? 'bg-brand-soft text-brand-ink'
              : 'bg-tier-yellow-soft text-tier-yellow-ink',
          duenoLabel:
            status === 'en_revision'
              ? (r.assigned_to_name ?? 'Sin asignar')
              : 'Sin asignar',
          whenLabel: formatDateTime(r.escalated_at) ?? '—',
          notePreview: r.escalation_note ?? '(sin nota)',
        };
      });
  });
}
