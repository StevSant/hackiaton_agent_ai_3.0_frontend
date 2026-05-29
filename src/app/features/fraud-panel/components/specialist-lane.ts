import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Chip } from '@shared/ui/chip';
import { Icon } from '@shared/ui/icon';
import { RiskBadge } from '@shared/ui/risk-badge';
import { AgentEye } from '@shared/ui/agent-eye';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';
import { resolveAgentPersona } from '@shared/utils';

import type { SpecialistLane } from '../models/specialist-lane.model';
import { formatCita } from '../utils';

@Component({
  selector: 'app-specialist-lane',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RiskBadge, Chip, Icon, AgentEye, MarkdownPipe],
  template: `
    <section
      class="flex flex-col gap-2 rounded-lg border bg-surface p-3 h-full transition-colors"
      [style.border-color]="'color-mix(in oklch, ' + persona().accent + ' 28%, var(--border))'"
    >
      <header class="flex items-center gap-2.5">
        <ui-agent-eye [persona]="persona()" [size]="44" />
        <div class="min-w-0">
          <p class="text-sm font-semibold leading-tight">{{ persona().name }}</p>
          <p class="text-xs text-ink-2 leading-tight">{{ persona().role }}</p>
          <p
            class="text-[10px] uppercase tracking-[0.1em] font-semibold mt-0.5"
            [style.color]="persona().accent"
          >
            {{ persona().tag }}
          </p>
        </div>
      </header>

      @if (lane().failed) {
        <p class="text-xs text-ink-2 italic">Sin opinión — el análisis de este especialista falló.</p>
      } @else {
        <div class="markdown-body text-sm min-h-12" [innerHTML]="lane().narracion | markdown"></div>

        @if (lane().verdict; as v) {
          <div class="flex items-center gap-2">
            <ui-risk-badge [nivel]="v.nivel" />
            <span class="text-xs text-ink-2">confianza: {{ v.confianza }}</span>
          </div>
          <div class="markdown-body text-sm" [innerHTML]="v.dictamen | markdown"></div>
          <ul class="text-xs list-disc pl-4">
            @for (punto of v.puntos_clave; track punto) {
              <li class="markdown-body" [innerHTML]="punto | markdown"></li>
            }
          </ul>
          @if (citas().length) {
            <div class="flex flex-wrap gap-1">
              @for (cita of citas(); track $index) {
                <ui-chip>{{ cita }}</ui-chip>
              }
            </div>
          }
        }

        @if (lane().rebuttal; as r) {
          <div class="mt-2 border-t border-line pt-2">
            <p class="text-xs font-medium text-ink-2">Réplica</p>
            <div class="markdown-body text-sm" [innerHTML]="lane().rebuttalNarracion | markdown"></div>
            <div class="flex items-center gap-2 flex-wrap">
              @if (r.cambia_postura && lane().verdict && lane().verdict!.nivel !== r.nivel_actualizado) {
                <ui-risk-badge [nivel]="lane().verdict!.nivel" />
                <ui-icon name="arrow_forward" [size]="13" />
                <ui-risk-badge [nivel]="r.nivel_actualizado" />
                <span class="text-xs text-tier-yellow-ink font-medium">cambió de postura</span>
              } @else {
                <ui-risk-badge [nivel]="r.nivel_actualizado" />
                @if (r.cambia_postura) {
                  <span class="text-xs text-tier-yellow-ink font-medium">cambió de postura</span>
                } @else {
                  <span class="text-xs text-ink-3">mantiene postura</span>
                }
              }
            </div>
          </div>
        } @else if (lane().r2Failed) {
          <div class="mt-2 border-t border-line pt-2">
            <p class="text-xs font-medium text-ink-2">Réplica</p>
            <p class="text-xs text-ink-3 italic">Sin réplica — no se obtuvo la reacción de este especialista.</p>
          </div>
        }
      }
    </section>
  `,
})
export class SpecialistLaneComponent {
  readonly lane = input.required<SpecialistLane>();

  protected readonly persona = computed(() =>
    resolveAgentPersona(this.lane().agentId, {
      name: this.lane().displayName,
      role: this.lane().displayName,
    }),
  );

  // Safety net: persisted analyses may still carry raw `clave=valor` citas.
  protected readonly citas = computed(
    () => this.lane().verdict?.citas.map(formatCita) ?? [],
  );
}
