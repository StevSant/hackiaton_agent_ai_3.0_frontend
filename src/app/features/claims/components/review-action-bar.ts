import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { RoleCode } from '@core/auth/auth-user.model';
import { Icon } from '@shared/ui/icon';
import type { ClaimReview } from '@shared/models';

/**
 * Renders the role + state aware action bar on a claim detail page.
 * Decides between buttons (when the current user can act) and read-only badges
 * (when they're waiting on the other persona). Hides forbidden actions per
 * design spec §6 RBAC; never disables them.
 */
@Component({
  selector: 'claim-review-action-bar',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'claim-review-action-bar-host' },
  template: `
    @switch (variant()) {
      @case ('analista-can-escalate') {
        <button type="button" class="claim-review-actions__btn" (click)="markRevisado.emit()">
          <ui-icon name="check_circle" [size]="14" />
          Marcar revisado
        </button>
        <button
          type="button"
          class="claim-review-actions__btn claim-review-actions__btn--primary"
          (click)="escalate.emit()"
        >
          <ui-icon name="flag" [size]="14" />
          Escalar a Antifraude
        </button>
      }
      @case ('analista-can-rescalate') {
        <button
          type="button"
          class="claim-review-actions__btn claim-review-actions__btn--primary"
          (click)="escalate.emit()"
        >
          <ui-icon name="restart_alt" [size]="14" />
          Re-escalar con nueva info
        </button>
      }
      @case ('analista-waiting-take') {
        <span class="claim-review-actions__status claim-review-actions__status--warn">
          <ui-icon name="hourglass_top" [size]="14" />
          Esperando que Antifraude tome el caso
        </span>
      }
      @case ('analista-waiting-dictamen') {
        <span class="claim-review-actions__status claim-review-actions__status--warn">
          <ui-icon name="hourglass_top" [size]="14" />
          Pendiente de dictamen — {{ review().assigned_to_name || 'Unidad Antifraude' }}
        </span>
      }
      @case ('antifraude-can-take') {
        <button
          type="button"
          class="claim-review-actions__btn"
          title="Emitir dictamen sin asignarte el caso"
          (click)="dictaminate.emit()"
        >
          <ui-icon name="gavel" [size]="14" />
          Dictamen directo
        </button>
        <button
          type="button"
          class="claim-review-actions__btn claim-review-actions__btn--primary"
          (click)="take.emit()"
        >
          <ui-icon name="how_to_reg" [size]="14" />
          Tomar caso
        </button>
      }
      @case ('antifraude-can-dictamen') {
        <button
          type="button"
          class="claim-review-actions__btn claim-review-actions__btn--primary"
          (click)="dictaminate.emit()"
        >
          <ui-icon name="gavel" [size]="14" />
          Emitir dictamen
        </button>
      }
      @case ('antifraude-other-owns') {
        <span class="claim-review-actions__status">
          <ui-icon name="lock" [size]="14" />
          En revisión por {{ review().assigned_to_name || 'Unidad Antifraude' }}
        </span>
      }
      @case ('dictaminado-terminal') {
        <span class="claim-review-actions__status">
          <ui-icon name="check_circle" [size]="14" />
          Caso dictaminado
        </span>
      }
      @case ('cerrado-sin-escalar-terminal') {
        <span class="claim-review-actions__status claim-review-actions__status--ok">
          <ui-icon name="check_circle" [size]="14" />
          Cerrado sin escalación
        </span>
      }
      @default {
        <!-- nothing for verde / no-context fallback -->
      }
    }
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
