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
      <div class="mb-2 rounded-xl border border-line bg-soft overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-ink-3 hover:bg-hover transition"
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
                <span class="text-ink-3 shrink-0 min-w-[64px]">{{ kindLabel(s.kind) }}</span>
                <div class="min-w-0 flex-1">
                  <div class="text-ink">{{ s.label }}</div>
                  @if (s.detail) {
                    <div class="text-ink-3 whitespace-pre-wrap break-words">{{ s.detail }}</div>
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
  /** Whether the parent message has streamed content. Drives auto-collapse. */
  readonly hasContent = input<boolean>(false);

  /** null = follow auto rule; true/false = user has manually chosen. */
  private readonly userOverride = signal<boolean | null>(null);

  protected readonly expanded = computed<boolean>(() => {
    const override = this.userOverride();
    if (override !== null) return override;
    return this.steps().length > 0 && !this.hasContent();
  });

  protected kindLabel(kind: AgentStep['kind']): string {
    return STEP_LABEL[kind];
  }

  protected toggle(): void {
    this.userOverride.set(!this.expanded());
  }
}
