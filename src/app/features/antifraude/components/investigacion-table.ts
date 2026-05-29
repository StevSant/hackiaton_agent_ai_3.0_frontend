import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Avatar } from '@shared/ui/avatar';
import { Icon } from '@shared/ui/icon';
import { SortableHeader } from '@shared/ui/sortable-header';
import {
  claimHref,
  formatMoney,
  handleEntityLinkClick,
  ramoLabel,
  reviewStatusBadgeClass,
  reviewStatusLabel,
  TableSortController,
  type RiskTier,
} from '@shared/utils';
import type { Claim } from '@shared/models';

@Component({
  selector: 'investigacion-table',
  standalone: true,
  imports: [Avatar, Icon, SortableHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="centinela-table-wrap">
      <table class="centinela-table">
        <thead>
          <tr>
            <th sortKey="id" [sort]="sort()" class="hidden md:table-cell">ID siniestro</th>
            <th sortKey="asegurado" [sort]="sort()">Asegurado</th>
            <th sortKey="cobertura" [sort]="sort()" class="hidden lg:table-cell">Cobertura</th>
            <th sortKey="ciudad" [sort]="sort()" class="hidden lg:table-cell">Ciudad</th>
            <th sortKey="monto" [sort]="sort()" class="hidden xl:table-cell text-right">Monto estimado</th>
            <th sortKey="alertas" [sort]="sort()" class="text-center">Alertas IA</th>
            <th sortKey="score" [sort]="sort()" class="text-center">Riesgo IA</th>
            <th sortKey="estado" [sort]="sort()" class="hidden md:table-cell text-center">Estado</th>
            <th class="hidden md:table-cell w-16">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (claim of claims(); track claim.id) {
            <tr
              [attr.data-keyboard-row]="claim.id"
              [class.centinela-table-row--focused]="focusedId() === claim.id"
              (click)="open.emit(claim.id)"
            >
              <td class="hidden md:table-cell">
                <a
                  [href]="claimHref(claim.id)"
                  class="font-mono text-[12.5px] font-medium text-brand no-underline hover:underline"
                  (click)="onIdClick($event, claim.id)"
                >#{{ claim.id }}</a>
              </td>
              <td>
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="shrink-0">
                    <ui-avatar [name]="claim.asegurado" [size]="32" />
                  </div>
                  <div class="min-w-0">
                    <div class="font-medium text-[13px] truncate">{{ claim.asegurado }}</div>
                    <div class="md:hidden font-mono text-[11px] text-brand truncate">#{{ claim.id }}</div>
                    <div class="lg:hidden text-[11px] text-ink-3 mt-0.5 truncate">
                      {{ claim.cobertura }} · {{ ramoLabel(claim.ramo) }}
                    </div>
                    <div class="lg:hidden text-[11px] text-ink-3 mt-0.5 truncate">
                      {{ claim.ciudad }} · {{ money(claim.monto_reclamado) }}
                    </div>
                    <div class="md:hidden flex flex-wrap items-center gap-1.5 mt-1">
                      <span
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        [class]="reviewStatusBadgeClass(claim.review.status)"
                      >
                        {{ reviewStatusLabel(claim.review.status) }}
                      </span>
                      <span class="text-[10.5px] text-ink-3 truncate">{{ claim.ciudad }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="hidden lg:table-cell">
                <div class="font-medium text-[13px]">
                  {{ claim.cobertura }}
                  <span class="text-ink-3 font-normal text-[11.5px]"> · {{ ramoLabel(claim.ramo) }}</span>
                </div>
              </td>
              <td class="hidden lg:table-cell text-ink-2">{{ claim.ciudad }}</td>
              <td class="hidden xl:table-cell text-right tabular-nums font-semibold">{{ money(claim.monto_reclamado) }}</td>
              <td class="text-center">
                @if (claim.alertas.length > 0) {
                  <div class="inline-flex items-center justify-center gap-1 flex-wrap max-w-[120px] mx-auto">
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
                  <span class="text-[12px] text-ink-3">—</span>
                }
              </td>
              <td class="text-center">
                <span
                  class="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums whitespace-nowrap"
                  [class]="riskBadgeClass(claim.nivel)"
                >
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" [class]="riskDotClass(claim.nivel)"></span>
                  {{ claim.score }}
                </span>
              </td>
              <td class="hidden md:table-cell text-center">
                <div class="flex flex-col items-center gap-1">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap"
                    [class]="reviewStatusBadgeClass(claim.review.status)"
                  >
                    {{ reviewStatusLabel(claim.review.status) }}
                  </span>
                  <span class="text-[10.5px] text-ink-3">{{ claim.estado }}</span>
                </div>
              </td>
              <td class="hidden md:table-cell">
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
  readonly sort = input.required<TableSortController>();
  readonly focusedId = input<string | null>(null);
  readonly open = output<string>();

  protected readonly money = formatMoney;
  protected readonly ramoLabel = ramoLabel;
  protected readonly reviewStatusLabel = reviewStatusLabel;
  protected readonly reviewStatusBadgeClass = reviewStatusBadgeClass;

  protected topAlerts(claim: Claim) {
    return claim.alertas.slice(0, 2);
  }

  protected readonly claimHref = claimHref;

  protected onIdClick(event: MouseEvent, id: string): void {
    handleEntityLinkClick(event, () => this.open.emit(id));
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
