import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Avatar } from '../../../shared/ui/avatar';
import { Icon } from '../../../shared/ui/icon';
import {
  formatMoney,
  ramoLabel,
  reviewStatusBadgeClass,
  reviewStatusLabel,
  type RiskTier,
} from '../../../shared/utils';
import type { Claim } from '../../claims/models';

@Component({
  selector: 'investigacion-table',
  standalone: true,
  imports: [Avatar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-[13px] border-collapse">
        <thead>
          <tr class="border-b border-line">
            <th class="text-left font-semibold text-ink-2 text-[11px] uppercase tracking-wide py-3 px-4">ID siniestro</th>
            <th class="text-left font-semibold text-ink-2 text-[11px] uppercase tracking-wide py-3 px-4">Asegurado</th>
            <th class="text-left font-semibold text-ink-2 text-[11px] uppercase tracking-wide py-3 px-4">Cobertura</th>
            <th class="text-left font-semibold text-ink-2 text-[11px] uppercase tracking-wide py-3 px-4">Ciudad</th>
            <th class="text-left font-semibold text-ink-2 text-[11px] uppercase tracking-wide py-3 px-4">Monto estimado</th>
            <th class="text-center font-semibold text-ink-2 text-[11px] uppercase tracking-wide py-3 px-4">Alertas IA</th>
            <th class="text-center font-semibold text-ink-2 text-[11px] uppercase tracking-wide py-3 px-4">Riesgo IA</th>
            <th class="text-center font-semibold text-ink-2 text-[11px] uppercase tracking-wide py-3 px-4">Estado</th>
            <th class="text-left font-semibold text-ink-2 text-[11px] uppercase tracking-wide py-3 px-4 w-16">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (claim of claims(); track claim.id) {
            <tr
              class="border-b border-line hover:bg-soft/60 transition-colors cursor-pointer"
              (click)="open.emit(claim.id)"
            >
              <td class="px-4 py-3.5 align-middle">
                <span class="font-mono text-[12.5px] font-medium text-brand">#{{ claim.id }}</span>
              </td>
              <td class="px-4 py-3.5 align-middle">
                <div class="flex items-center gap-2.5">
                  <ui-avatar [name]="claim.asegurado" [size]="32" />
                  <span class="font-medium text-[13px]">{{ claim.asegurado }}</span>
                </div>
              </td>
              <td class="px-4 py-3.5 align-middle">
                <div class="font-medium text-[13px] whitespace-nowrap">
                  {{ claim.cobertura }}
                  <span class="text-ink-3 font-normal text-[11.5px]"> · {{ ramoLabel(claim.ramo) }}</span>
                </div>
              </td>
              <td class="px-4 py-3.5 align-middle text-ink-2 whitespace-nowrap">{{ claim.ciudad }}</td>
              <td class="px-4 py-3.5 align-middle tabular-nums font-semibold whitespace-nowrap">{{ money(claim.monto_reclamado) }}</td>
              <td class="px-4 py-3.5 align-middle whitespace-nowrap text-center">
                @if (claim.alertas.length > 0) {
                  <div class="inline-flex items-center justify-center gap-1 flex-wrap">
                    @for (alert of topAlerts(claim); track alert.code) {
                      <span class="font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0" [class]="alertChipClass(alert.severidad)">
                        {{ alert.code }}
                      </span>
                    }
                    @if (claim.alertas.length > 3) {
                      <span class="text-[10px] text-ink-3 shrink-0">+{{ claim.alertas.length - 3 }}</span>
                    }
                  </div>
                } @else {
                  <span class="text-[12px] text-ink-3">Sin alertas</span>
                }
              </td>
              <td class="px-4 py-3.5 align-middle whitespace-nowrap text-center">
                <span
                  class="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums"
                  [class]="riskBadgeClass(claim.nivel)"
                >
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" [class]="riskDotClass(claim.nivel)"></span>
                  {{ claim.score }}
                </span>
              </td>
              <td class="px-4 py-3.5 align-middle whitespace-nowrap">
                <div class="flex flex-col items-center gap-1">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium"
                    [class]="reviewStatusBadgeClass(claim.review.status)"
                  >
                    {{ reviewStatusLabel(claim.review.status) }}
                  </span>
                  <span class="text-[10.5px] text-ink-3">{{ claim.estado }}</span>
                </div>
              </td>
              <td class="px-4 py-3.5 align-middle">
                <button
                  type="button"
                  class="w-8 h-8 grid place-items-center rounded-md border-0 bg-transparent text-ink-3 hover:text-brand hover:bg-soft cursor-pointer"
                  (click)="onOpen($event, claim.id)"
                  aria-label="Abrir siniestro"
                >
                  <ui-icon name="open_in_new" [size]="16" />
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class InvestigacionTable {
  readonly claims = input.required<readonly Claim[]>();
  readonly open = output<string>();

  protected readonly money = formatMoney;
  protected readonly ramoLabel = ramoLabel;
  protected readonly reviewStatusLabel = reviewStatusLabel;
  protected readonly reviewStatusBadgeClass = reviewStatusBadgeClass;

  protected topAlerts(claim: Claim) {
    return claim.alertas.slice(0, 3);
  }

  protected onOpen(event: MouseEvent, claimId: string): void {
    event.stopPropagation();
    this.open.emit(claimId);
  }

  protected alertChipClass(severity: 'high' | 'med' | 'low'): string {
    return severity === 'high'
      ? 'bg-tier-red-soft text-tier-red-ink'
      : severity === 'med'
        ? 'bg-tier-yellow-soft text-tier-yellow-ink'
        : 'bg-tier-green-soft text-tier-green-ink';
  }

  protected riskBadgeClass(tier: RiskTier): string {
    return tier === 'rojo'
      ? 'bg-tier-red-soft text-tier-red-ink'
      : tier === 'amarillo'
        ? 'bg-tier-yellow-soft text-tier-yellow-ink'
        : 'bg-tier-green-soft text-tier-green-ink';
  }

  protected riskDotClass(tier: RiskTier): string {
    return tier === 'rojo' ? 'bg-tier-red' : tier === 'amarillo' ? 'bg-tier-yellow' : 'bg-tier-green';
  }
}
