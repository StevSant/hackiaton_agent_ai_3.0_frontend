import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';
import { Modal } from '../../../shared/ui/modal';
import { MOCK_RULE_CHANGES } from '../services/rule-changes-mock.data';
import type { RuleChange, RuleChangeKind } from '../models/rule-change.model';

@Component({
  selector: 'alerts-rule-history-modal',
  standalone: true,
  imports: [Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="open()"
      title="Historial de cambios"
      subtitle="Bitácora inmutable de ediciones al catálogo de reglas"
      size="lg"
      (close)="close.emit()"
    >
      <div class="flex items-center justify-between px-5 py-3 border-b border-line bg-soft text-[12px] text-ink-3">
        <span>{{ changes.length }} cambios en los últimos 30 días</span>
        <span class="flex items-center gap-1.5">
          <ui-icon name="lock" [size]="12" />
          Solo lectura · firmado con SHA-256
        </span>
      </div>

      <div class="timeline px-6 pt-5 pb-4">
        @for (c of changes; track c.id) {
          <div class="tl-item" [attr.data-tone]="toneFor(c.kind)">
            <div class="flex items-center gap-2 text-[11.5px] text-ink-3 font-mono tabular-nums">
              <span>{{ c.ts }}</span>
              <span class="opacity-50">·</span>
              <span class="text-ink-2">{{ c.actor }}</span>
            </div>
            <div class="flex items-center gap-2 flex-wrap mt-1">
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px]" [class]="kindClass(c.kind)">
                <ui-icon [name]="kindIcon(c.kind)" [size]="11" />
                {{ kindLabel(c.kind) }}
              </span>
              <span class="font-mono text-[11.5px] px-1.5 py-px rounded bg-soft text-ink-2 border border-line">{{ c.ruleCode }}</span>
              <span class="font-medium text-[13.5px]">{{ c.ruleName }}</span>
            </div>
            <p class="text-[12.5px] text-ink-3 m-0 mt-1.5">{{ c.summary }}</p>
            @if (c.before || c.after) {
              <div class="mt-2 flex items-center gap-2 text-[12px]">
                @if (c.before) {
                  <span class="font-mono px-1.5 py-0.5 rounded bg-tier-red-soft text-tier-red-ink line-through">{{ c.before }}</span>
                }
                @if (c.before && c.after) {
                  <ui-icon name="arrow_forward" [size]="12" />
                }
                @if (c.after) {
                  <span class="font-mono px-1.5 py-0.5 rounded bg-tier-green-soft text-tier-green-ink">{{ c.after }}</span>
                }
              </div>
            }
          </div>
        }
      </div>

      <footer footer class="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-line bg-soft">
        <p class="text-[11.5px] text-ink-3 m-0">
          Retención: 5 años · Exportable para auditoría regulatoria.
        </p>
        <div class="flex gap-2">
          <ui-button (click)="close.emit()">Cerrar</ui-button>
          <ui-button variant="primary">
            <ui-icon name="download" [size]="14" />
            Exportar bitácora
          </ui-button>
        </div>
      </footer>
    </ui-modal>
  `,
})
export class RuleHistoryModal {
  readonly open = input.required<boolean>();
  readonly close = output<void>();

  protected readonly changes: RuleChange[] = MOCK_RULE_CHANGES;

  private readonly kindMeta: Record<
    RuleChangeKind,
    { icon: string; label: string; chip: string; tone: 'ok' | 'warn' | 'danger' }
  > = {
    creada: { icon: 'add_circle', label: 'Creada', chip: 'bg-tier-green-soft text-tier-green-ink', tone: 'ok' },
    editada: { icon: 'edit', label: 'Editada', chip: 'bg-brand-soft text-brand-ink', tone: 'warn' },
    pausada: { icon: 'pause_circle', label: 'Pausada', chip: 'bg-tier-yellow-soft text-tier-yellow-ink', tone: 'warn' },
    reactivada: { icon: 'play_circle', label: 'Reactivada', chip: 'bg-tier-green-soft text-tier-green-ink', tone: 'ok' },
    umbral: { icon: 'tune', label: 'Umbral', chip: 'bg-tier-yellow-soft text-tier-yellow-ink', tone: 'warn' },
  };

  protected kindIcon(k: RuleChangeKind): string {
    return this.kindMeta[k].icon;
  }
  protected kindLabel(k: RuleChangeKind): string {
    return this.kindMeta[k].label;
  }
  protected kindClass(k: RuleChangeKind): string {
    return this.kindMeta[k].chip;
  }
  protected toneFor(k: RuleChangeKind): 'ok' | 'warn' | 'danger' {
    return this.kindMeta[k].tone;
  }
}
