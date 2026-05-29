import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { RiskBadge } from '@shared/ui/risk-badge';
import { AgentEye } from '@shared/ui/agent-eye';
import { AGENT_PERSONAS } from '@shared/utils';
import { PanelConsensus } from '../models';

@Component({
  selector: 'app-consensus-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RiskBadge, AgentEye],
  template: `
    <section
      class="rounded-lg border bg-surface p-4 flex flex-col gap-3"
      [style.border-color]="'color-mix(in oklch, ' + moderator.accent + ' 30%, var(--border))'"
    >
      <header class="flex items-center gap-2.5">
        <ui-agent-eye [persona]="moderator" [size]="40" />
        <div class="min-w-0">
          <h3 class="text-sm font-semibold leading-tight">Consenso del panel</h3>
          <p class="text-xs text-ink-2 leading-tight">
            {{ moderator.name }} · {{ moderator.role }}
          </p>
        </div>
      </header>
      @if (consensus(); as c) {
        <div class="flex items-center gap-3">
          <ui-risk-badge [nivel]="c.nivel_final" />
          <div class="flex-1">
            <p class="text-xs text-ink-3">Nivel de acuerdo</p>
            <div class="h-2 w-full rounded-full bg-soft overflow-hidden">
              <div
                class="h-2 rounded-full bg-tier-green transition-all duration-300"
                [style.width.%]="acuerdoPct()"
              ></div>
            </div>
          </div>
          <span class="text-sm font-medium tabular-nums">{{ acuerdoPct() }}%</span>
        </div>
        @if (c.posible_falso_positivo) {
          <p class="text-xs text-tier-yellow font-medium">
            ⚠ Posible falso positivo — requiere revisión humana
          </p>
        }
        @if (c.puntos_de_conflicto.length) {
          <div>
            <p class="text-xs text-ink-3 mb-1">Puntos de conflicto</p>
            <ul class="text-sm list-disc pl-4 space-y-0.5">
              @for (punto of c.puntos_de_conflicto; track punto) {
                <li>{{ punto }}</li>
              }
            </ul>
          </div>
        }
        <p class="text-sm leading-relaxed">{{ c.resumen }}</p>
        <p class="text-sm font-semibold border-t border-line pt-3">
          Acción recomendada: <span class="font-medium">{{ c.accion_recomendada }}</span>
        </p>
      } @else {
        <p class="text-sm whitespace-pre-wrap text-ink-3 min-h-12">{{ moderatorText() }}</p>
      }
    </section>
  `,
})
export class ConsensusCardComponent {
  readonly consensus = input<PanelConsensus | null>(null);
  readonly moderatorText = input<string>('');

  protected readonly moderator = AGENT_PERSONAS['consenso'];

  protected readonly acuerdoPct = computed(() =>
    Math.round((this.consensus()?.nivel_de_acuerdo ?? 0) * 100),
  );
}
