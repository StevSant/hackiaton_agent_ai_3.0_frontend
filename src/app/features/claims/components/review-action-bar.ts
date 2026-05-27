import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { RoleCode } from '@core/auth/auth-user.model';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import type { ClaimReview } from '../models/claim-review.model';

/**
 * Renders the role + state aware action bar on a claim detail page.
 * Decides between buttons (when the current user can act) and read-only badges
 * (when they're waiting on the other persona). Hides forbidden actions per
 * design spec §6 RBAC; never disables them.
 */
@Component({
  selector: 'claim-review-action-bar',
  standalone: true,
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center gap-2 justify-end">
      @switch (variant()) {
        @case ('analista-can-escalate') {
          <ui-button (click)="markRevisado.emit()">
            <ui-icon name="check_circle" [size]="14" />
            Marcar como revisado
          </ui-button>
          <ui-button variant="primary" (click)="escalate.emit()">
            <ui-icon name="flag" [size]="14" />
            Escalar a Unidad Antifraude
          </ui-button>
        }
        @case ('analista-can-rescalate') {
          <ui-button variant="primary" (click)="escalate.emit()">
            <ui-icon name="restart_alt" [size]="14" />
            Re-escalar con nueva información
          </ui-button>
        }
        @case ('analista-waiting-take') {
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-tier-yellow-ink bg-tier-yellow-soft border border-transparent">
            <ui-icon name="hourglass_top" [size]="13" />
            Esperando que la Unidad Antifraude tome el caso
          </span>
        }
        @case ('analista-waiting-dictamen') {
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-tier-yellow-ink bg-tier-yellow-soft border border-transparent">
            <ui-icon name="visibility" [size]="13" />
            Pendiente de dictamen — {{ review().assigned_to_name }} tomó el caso
          </span>
        }
        @case ('antifraude-can-take') {
          <ui-button (click)="dictaminate.emit()">
            <ui-icon name="gavel" [size]="14" />
            Emitir dictamen (atajo)
          </ui-button>
          <ui-button variant="primary" (click)="take.emit()">
            <ui-icon name="how_to_reg" [size]="14" />
            Tomar caso
          </ui-button>
        }
        @case ('antifraude-can-dictamen') {
          <ui-button variant="primary" (click)="dictaminate.emit()">
            <ui-icon name="gavel" [size]="14" />
            Emitir dictamen
          </ui-button>
        }
        @case ('antifraude-other-owns') {
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-ink-3 bg-soft border border-line">
            <ui-icon name="lock" [size]="13" />
            En revisión por {{ review().assigned_to_name }}
          </span>
        }
        @case ('dictaminado-terminal') {
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-ink-2 bg-soft border border-line">
            <ui-icon name="check_circle" [size]="13" />
            Caso dictaminado
          </span>
        }
        @case ('cerrado-sin-escalar-terminal') {
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-tier-green-ink bg-tier-green-soft border border-transparent">
            <ui-icon name="check_circle" [size]="13" />
            Cerrado sin escalación
          </span>
        }
        @default {
          <!-- nothing for verde / no-context fallback -->
        }
      }
    </div>
  `,
})
export class ReviewActionBar {
  readonly role = input.required<RoleCode>();
  readonly currentUserId = input.required<string>();
  readonly review = input.required<ClaimReview>();

  readonly escalate = output<void>();
  readonly take = output<void>();
  readonly dictaminate = output<void>();
  readonly markRevisado = output<void>();

  protected readonly variant = computed<
    | 'analista-can-escalate'
    | 'analista-can-rescalate'
    | 'analista-waiting-take'
    | 'analista-waiting-dictamen'
    | 'antifraude-can-take'
    | 'antifraude-can-dictamen'
    | 'antifraude-other-owns'
    | 'dictaminado-terminal'
    | 'cerrado-sin-escalar-terminal'
    | 'none'
  >(() => {
    const r = this.review();
    const role = this.role();
    const me = this.currentUserId();

    if (r.status === 'dictaminado') return 'dictaminado-terminal';
    if (r.status === 'revisado_sin_escalar') return 'cerrado-sin-escalar-terminal';

    if (role === 'analista') {
      if (r.status === 'pendiente') {
        return r.bounce_count > 0 ? 'analista-can-rescalate' : 'analista-can-escalate';
      }
      if (r.status === 'escalado') return 'analista-waiting-take';
      if (r.status === 'en_revision') return 'analista-waiting-dictamen';
      return 'none';
    }

    // antifraude
    if (r.status === 'pendiente') return 'none';
    if (r.status === 'escalado') return 'antifraude-can-take';
    if (r.status === 'en_revision') {
      return r.assigned_to === me ? 'antifraude-can-dictamen' : 'antifraude-other-owns';
    }
    return 'none';
  });
}
