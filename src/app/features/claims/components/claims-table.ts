import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Avatar } from '@shared/ui/avatar';
import { Icon } from '@shared/ui/icon';
import { RiskRing } from '@shared/ui/risk-ring';
import { formatMoney, ramoIcon, ramoLabel } from '@shared/utils';
import type { Claim } from '../models';

@Component({
  selector: 'claims-table',
  standalone: true,
  imports: [Avatar, Icon, RiskRing],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="centinela-table-wrap">
      <table class="centinela-table">
        <thead>
          <tr>
            <th class="w-16">Riesgo</th>
            <th>Siniestro</th>
            <th>Asegurado</th>
            <th>Cobertura</th>
            <th>Ciudad</th>
            <th>Monto</th>
            <th>Alertas</th>
            <th>Estado</th>
            <th class="w-9"></th>
          </tr>
        </thead>
        <tbody>
          @for (c of claims(); track c.id) {
            <tr (click)="open.emit(c.id)">
              <td>
                <ui-risk-ring [score]="c.score" [size]="42" [stroke]="4" />
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <ui-icon [name]="ramoIcon(c.ramo)" [size]="16" />
                  <div>
                    <div class="font-mono text-[12px] text-ink-2">{{ c.id }}</div>
                    <div class="text-[11.5px] text-ink-3">{{ ramoLabel(c.ramo) }} · {{ c.fecha_ocurrencia }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <ui-avatar [name]="c.asegurado" [size]="26" />
                  <div>
                    <div class="font-medium">{{ c.asegurado }}</div>
                    <div class="text-[11.5px] text-ink-3 font-mono">{{ c.asegurado_id }}</div>
                  </div>
                </div>
              </td>
              <td>{{ c.cobertura }}</td>
              <td class="text-ink-3 text-[12.5px]">{{ c.ciudad }}</td>
              <td class="tabular-nums font-medium">{{ money(c.monto_reclamado) }}</td>
              <td>
                @if (c.alertas.length > 0) {
                  <div class="flex items-center gap-1">
                    @for (a of topAlerts(c); track a.code) {
                      <span class="font-mono text-[10px] px-1.5 py-0.5 rounded" [class]="alertChipClass(a.severidad)">{{ a.code }}</span>
                    }
                    @if (c.alertas.length > 3) {
                      <span class="text-[11.5px] text-ink-3">+{{ c.alertas.length - 3 }}</span>
                    }
                  </div>
                } @else {
                  <span class="text-[11.5px] text-ink-3">—</span>
                }
              </td>
              <td>
                <div class="flex flex-col items-start gap-1">
                  <span class="centinela-status-pill">{{ c.estado }}</span>
                  @if (reviewBadge(c); as rb) {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]" [class]="rb.chip">
                      <ui-icon [name]="rb.icon" [size]="11" />
                      {{ rb.label }}
                    </span>
                  }
                </div>
              </td>
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
export class ClaimsTable {
  readonly claims = input.required<readonly Claim[]>();
  readonly open = output<string>();

  protected readonly money = formatMoney;
  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;

  protected topAlerts(c: Claim) {
    return c.alertas.slice(0, 3);
  }

  protected alertChipClass(sev: 'high' | 'med' | 'low'): string {
    return sev === 'high'
      ? 'bg-tier-red-soft text-tier-red-ink'
      : sev === 'med'
        ? 'bg-tier-yellow-soft text-tier-yellow-ink'
        : 'bg-tier-green-soft text-tier-green-ink';
  }

  protected reviewBadge(c: Claim): { label: string; icon: string; chip: string } | null {
    switch (c.review.status) {
      case 'escalado':
        return { label: 'Escalado', icon: 'flag', chip: 'bg-tier-red-soft text-tier-red-ink' };
      case 'en_revision':
        return {
          label: 'En revisión',
          icon: 'visibility',
          chip: 'bg-tier-yellow-soft text-tier-yellow-ink',
        };
      case 'dictaminado':
        return { label: 'Dictaminado', icon: 'gavel', chip: 'bg-brand-soft text-brand-ink' };
      case 'revisado_sin_escalar':
        return {
          label: 'Revisado',
          icon: 'check_circle',
          chip: 'bg-tier-green-soft text-tier-green-ink',
        };
      default:
        return null;
    }
  }
}
