import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';
import { Icon } from '../../../shared/ui/icon';
import { KpiSmall } from '../../../shared/ui/kpi-small';
import { ClaimsStore } from '../../claims/services/claims.store';
import { InboxTable } from '../components/inbox-table';

@Component({
  selector: 'page-antifraude-bandeja',
  standalone: true,
  imports: [Icon, KpiSmall, InboxTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Bandeja Antifraude</h1>
        <p class="text-ink-3 text-[13.5px] m-0">
          Casos elevados desde la bandeja del analista. Toma uno para iniciar la revisión especializada.
        </p>
      </div>
      <div class="flex items-center gap-2 text-[12px] text-ink-3">
        <ui-icon name="info" [size]="14" />
        Ordenados por tier (rojo primero) y luego por fecha de escalación.
      </div>
    </div>

    <div class="grid grid-cols-4 gap-3 mb-5">
      <ui-kpi-small label="Pendientes de tomar" [value]="stats().pendingTake" icon="hourglass_top" tone="yellow" />
      <ui-kpi-small label="En revisión (mías)" [value]="stats().mine" icon="visibility" tone="brand" />
      <ui-kpi-small label="En revisión (equipo)" [value]="stats().team" icon="group" />
      <ui-kpi-small label="Re-trabajos" [value]="stats().bounces" icon="restart_alt" tone="red" />
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div class="flex items-center gap-3.5">
          <h3 class="text-[13px] font-semibold m-0">Casos escalados</h3>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line">
            {{ inbox().length }} casos
          </span>
        </div>
      </div>
      <antifraude-inbox-table [claims]="inbox()" (open)="openCase($event)" />
    </div>
  `,
})
export class BandejaPage {
  private readonly claimsStore = inject(ClaimsStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly inbox = this.claimsStore.antifraudeInbox;

  protected readonly stats = computed(() => {
    const list = this.inbox();
    const me = this.auth.user()?.id ?? '';
    const pendingTake = list.filter((c) => c.review.status === 'escalado').length;
    const mine = list.filter(
      (c) => c.review.status === 'en_revision' && c.review.assigned_to === me,
    ).length;
    const team = list.filter(
      (c) => c.review.status === 'en_revision' && c.review.assigned_to !== me,
    ).length;
    const bounces = this.claimsStore.claims().filter((c) => c.review.bounce_count > 0).length;
    return { pendingTake, mine, team, bounces };
  });

  protected openCase(id: string): void {
    void this.router.navigate(['/claims', id]);
  }
}
