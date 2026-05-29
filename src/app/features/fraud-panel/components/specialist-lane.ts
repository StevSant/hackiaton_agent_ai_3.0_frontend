import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Chip } from '@shared/ui/chip';
import { Icon } from '@shared/ui/icon';
import { RiskBadge } from '@shared/ui/risk-badge';

import type { SpecialistLane } from '../models/specialist-lane.model';

@Component({
  selector: 'app-specialist-lane',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RiskBadge, Chip, Icon],
  template: `
    <section class="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 h-full">
      <header class="flex items-center gap-2">
        <ui-icon name="psychology" [size]="16" />
        <div>
          <p class="text-sm font-semibold">{{ lane().displayName }}</p>
          <p class="text-xs text-ink-2">{{ lane().lens }}</p>
        </div>
      </header>

      @if (lane().failed) {
        <p class="text-xs text-ink-2 italic">Sin opinión — el análisis de este especialista falló.</p>
      } @else {
        <p class="text-sm whitespace-pre-wrap min-h-12">{{ lane().narracion }}</p>

        @if (lane().verdict; as v) {
          <div class="flex items-center gap-2">
            <ui-risk-badge [nivel]="v.nivel" />
            <span class="text-xs text-ink-2">confianza: {{ v.confianza }}</span>
          </div>
          <p class="text-sm">{{ v.dictamen }}</p>
          <ul class="text-xs list-disc pl-4">
            @for (punto of v.puntos_clave; track punto) {
              <li>{{ punto }}</li>
            }
          </ul>
          @if (v.citas.length) {
            <div class="flex flex-wrap gap-1">
              @for (cita of v.citas; track cita) {
                <ui-chip>{{ cita }}</ui-chip>
              }
            </div>
          }
        }

        @if (lane().rebuttal; as r) {
          <div class="mt-2 border-t border-line pt-2">
            <p class="text-xs font-medium text-ink-2">Réplica</p>
            <p class="text-sm whitespace-pre-wrap">{{ lane().rebuttalNarracion }}</p>
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
}
