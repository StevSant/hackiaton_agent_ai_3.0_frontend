import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon } from '../../../shared/ui/icon';
import type { AuditAction, AuditActor, AuditEvent } from '../models';

@Component({
  selector: 'audit-row',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-[140px_36px_1fr_140px] gap-4 items-start px-5 py-3.5 border-t border-line first:border-t-0">
      <div class="text-[11.5px] text-ink-3 font-mono tabular-nums leading-snug pt-1">{{ event().ts }}</div>

      <div class="w-9 h-9 rounded-md grid place-items-center" [style.background]="actorBg()" [style.color]="actorFg()">
        <ui-icon [name]="actorIcon()" [size]="16" [fill]="event().actor === 'agente'" />
      </div>

      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium text-[13.5px]">{{ event().title }}</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-soft text-ink-3 border border-line">{{ actorLabel() }}</span>
          @if (event().target) {
            <button class="font-mono text-[11.5px] px-1.5 py-px rounded bg-brand-soft text-brand-ink hover:opacity-80 cursor-pointer" (click)="openTarget.emit(event().target!)">
              {{ event().target }}
            </button>
          }
        </div>
        <div class="text-[12.5px] text-ink-3 mt-1">{{ event().detail }}</div>
      </div>

      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] w-fit justify-self-end" [class]="actionChipClass()">
        <ui-icon [name]="actionIcon()" [size]="12" />
        {{ actionLabel() }}
      </span>
    </div>
  `,
})
export class AuditRow {
  readonly event = input.required<AuditEvent>();
  readonly openTarget = output<string>();

  private readonly actorMeta: Record<AuditActor, { icon: string; bg: string; fg: string; label: string }> = {
    analista: { icon: 'person', bg: 'oklch(0.95 0.04 30)', fg: 'oklch(0.45 0.18 30)', label: 'Analista' },
    agente: { icon: 'auto_awesome', bg: 'var(--brand-soft)', fg: 'var(--brand-ink)', label: 'Centinela IA' },
    sistema: { icon: 'memory', bg: 'var(--bg-soft)', fg: 'var(--ink-3)', label: 'Sistema' },
  };

  private readonly actionMeta: Record<AuditAction, { icon: string; label: string; chip: string }> = {
    apertura: { icon: 'visibility', label: 'Apertura', chip: 'bg-soft text-ink-2' },
    escalamiento: { icon: 'flag', label: 'Escalamiento', chip: 'bg-tier-red-soft text-tier-red-ink' },
    consulta_ia: { icon: 'forum', label: 'Consulta IA', chip: 'bg-brand-soft text-brand-ink' },
    cambio_regla: { icon: 'tune', label: 'Cambio de regla', chip: 'bg-tier-yellow-soft text-tier-yellow-ink' },
    cierre: { icon: 'check', label: 'Cierre', chip: 'bg-tier-green-soft text-tier-green-ink' },
    export: { icon: 'download', label: 'Exportación', chip: 'bg-soft text-ink-2' },
  };

  protected readonly actorIcon = computed(() => this.actorMeta[this.event().actor].icon);
  protected readonly actorBg = computed(() => this.actorMeta[this.event().actor].bg);
  protected readonly actorFg = computed(() => this.actorMeta[this.event().actor].fg);
  protected readonly actorLabel = computed(() => this.actorMeta[this.event().actor].label);
  protected readonly actionIcon = computed(() => this.actionMeta[this.event().action].icon);
  protected readonly actionLabel = computed(() => this.actionMeta[this.event().action].label);
  protected readonly actionChipClass = computed(() => this.actionMeta[this.event().action].chip);
}
