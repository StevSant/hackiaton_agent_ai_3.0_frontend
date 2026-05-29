import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Avatar } from '@shared/ui/avatar';
import { Icon } from '@shared/ui/icon';
import { RiskRing } from '@shared/ui/risk-ring';
import { SortableHeader } from '@shared/ui/sortable-header';
import {
  TableSortController,
  claimHref,
  formatMoney,
  handleEntityLinkClick,
  ramoIcon,
  ramoLabel,
} from '@shared/utils';
import type { Claim } from '../models';

@Component({
  selector: 'claims-table',
  standalone: true,
  imports: [Avatar, Icon, RiskRing, SortableHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="centinela-table-wrap">
      <table class="centinela-table">
        <thead>
          <tr>
            <th sortKey="score" [sort]="sort()" class="w-16">Riesgo</th>
            <th sortKey="id" [sort]="sort()">Siniestro</th>
            <th sortKey="asegurado" [sort]="sort()">Asegurado</th>
            <th sortKey="cobertura" [sort]="sort()">Cobertura</th>
            <th sortKey="ciudad" [sort]="sort()">Ciudad</th>
            <th sortKey="monto" [sort]="sort()">Monto</th>
            <th sortKey="alertas" [sort]="sort()">Alertas</th>
            <th sortKey="estado" [sort]="sort()">Estado</th>
            <th class="w-9"></th>
          </tr>
        </thead>
        <tbody>
          @for (c of claims(); track c.id) {
            <tr
              [attr.data-keyboard-row]="c.id"
              [class.centinela-table-row--focused]="focusedId() === c.id"
              (click)="open.emit(c.id)"
            >
              <td>
                <ui-risk-ring [score]="c.score" [size]="42" [stroke]="4" />
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <ui-icon [name]="ramoIcon(c.ramo)" [cacheKey]="c.id" [size]="16" />
                  <div>
                    <a
                      [href]="claimHref(c.id)"
                      class="font-mono text-[12px] text-ink-2 no-underline hover:underline hover:text-brand"
                      (click)="onIdClick($event, c.id)"
                    >{{ c.id }}</a>
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
                  @if (panelBadge(c); as pb) {
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
                      [class]="pb.chip"
                      [attr.title]="pb.title"
                    >
                      <ui-icon name="groups" [size]="11" />
                      {{ pb.label }}
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
  readonly sort = input.required<TableSortController>();
  readonly focusedId = input<string | null>(null);
  readonly open = output<string>();

  protected readonly money = formatMoney;
  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;
  protected readonly claimHref = claimHref;

  protected onIdClick(event: MouseEvent, id: string): void {
    handleEntityLinkClick(event, () => this.open.emit(id));
  }

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

  // Advisory marker — the multi-agent panel weighed in. Never reflects the score
  // (the score ring is engine-derived); flags falso positivo / divergence so the
  // triager knows a human-review signal exists. Falso-positivo takes precedence.
  protected panelBadge(c: Claim): { label: string; chip: string; title: string } | null {
    if (c.panel_falso_positivo) {
      return {
        label: 'Posible falso positivo',
        chip: 'bg-tier-yellow-soft text-tier-yellow-ink',
        title: 'El panel multi-agente sugiere posible falso positivo — requiere revisión humana',
      };
    }
    if (c.panel_discrepa) {
      return {
        label: 'Panel discrepa',
        chip: 'bg-soft text-ink-2 border border-line',
        title: 'El consenso del panel multi-agente difiere del nivel del motor',
      };
    }
    return null;
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
