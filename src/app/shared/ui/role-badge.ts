import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { RoleCode } from '../../core/auth/auth-user.model';
import { Icon } from './icon';

@Component({
  selector: 'ui-role-badge',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-medium border tabular-nums"
      [class]="palette()"
    >
      <ui-icon [name]="iconName()" [size]="11" />
      {{ label() }}
    </span>
  `,
})
export class RoleBadge {
  readonly role = input.required<RoleCode>();

  protected readonly label = computed(() =>
    this.role() === 'antifraude' ? 'Antifraude' : 'Analista',
  );

  protected readonly iconName = computed(() =>
    this.role() === 'antifraude' ? 'shield_person' : 'badge',
  );

  protected readonly palette = computed(() =>
    this.role() === 'antifraude'
      ? 'bg-tier-red-soft text-tier-red-ink border-transparent'
      : 'bg-soft text-ink-2 border-line',
  );
}
