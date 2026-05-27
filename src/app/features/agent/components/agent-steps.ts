import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import type { AgentStep } from '../models';

const STEP_LABEL: Record<AgentStep['kind'], string> = {
  agent_step: 'Nodo',
  tool_call: 'Herramienta',
  tool_result: 'Resultado',
};

@Component({
  selector: 'agent-steps',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (steps().length > 0) {
      <div class="mb-2 rounded-xl border border-line bg-surface-2 overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-muted hover:bg-surface-3 transition"
          (click)="toggle()"
          [attr.aria-expanded]="expanded()"
        >
          <span class="flex items-center gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand"></span>
            <span>Razonamiento del agente · {{ steps().length }} pasos</span>
          </span>
          <span class="font-mono text-[10px]">{{ expanded() ? '▾' : '▸' }}</span>
        </button>
        @if (expanded()) {
          <ol class="px-3 pb-2 pt-1 space-y-1.5 text-[11.5px] font-mono leading-snug">
            @for (s of steps(); track $index) {
              <li class="flex gap-2">
                <span class="text-muted shrink-0 min-w-[64px]">{{ kindLabel(s.kind) }}</span>
                <div class="min-w-0 flex-1">
                  <div class="text-ink">{{ s.label }}</div>
                  @if (s.detail) {
                    <div class="text-muted whitespace-pre-wrap break-words">{{ s.detail }}</div>
                  }
                </div>
              </li>
            }
          </ol>
        }
      </div>
    }
  `,
})
export class AgentSteps {
  readonly steps = input.required<AgentStep[]>();
  protected readonly expanded = signal(false);
  protected readonly count = computed(() => this.steps().length);

  protected kindLabel(kind: AgentStep['kind']): string {
    return STEP_LABEL[kind];
  }

  protected toggle(): void {
    this.expanded.update((v) => !v);
  }
}
