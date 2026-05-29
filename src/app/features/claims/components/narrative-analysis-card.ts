import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { Icon } from '@shared/ui/icon';
import type { Claim } from '../models';

interface EntityGroup {
  readonly label: string;
  readonly items: string[];
}

@Component({
  selector: 'claim-narrative-analysis-card',
  standalone: true,
  imports: [EmptyState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div class="flex items-center gap-2">
          <ui-icon name="psychology" [size]="16" />
          <div>
            <h3 class="text-[13px] font-semibold m-0">Análisis NLP de la narrativa</h3>
            <p class="text-[11px] text-ink-3 m-0">
              Lectura automática al abrir el caso · alimenta la señal FS-09
            </p>
          </div>
        </div>
        @if (analysis()) {
          <span
            class="font-mono text-[11.5px] px-2 py-0.5 rounded"
            [class]="
              coherente()
                ? 'bg-tier-green-soft text-tier-green-ink'
                : 'bg-tier-yellow-soft text-tier-yellow-ink'
            "
          >
            {{ coherente() ? 'Narrativa coherente' : 'Posible incoherencia' }}
          </span>
        }
      </div>

      @if (!analysis()) {
        <ui-empty-state
          title="Análisis de la narrativa en curso"
          sub="Se procesa la descripción del siniestro la primera vez que abres el caso. Vuelve en un momento o re-analiza el caso."
        />
      } @else {
        <div class="px-5 py-4 flex flex-col gap-4">
          @if (resumen()) {
            <p class="text-[13px] leading-relaxed text-ink-2 m-0">{{ resumen() }}</p>
          }

          <div>
            <h4 class="text-[11.5px] uppercase tracking-wide text-ink-4 m-0 mb-2">
              Incoherencias detectadas
            </h4>
            @if (incoherencias().length === 0) {
              <p class="text-[12.5px] text-ink-3 m-0">
                No se detectaron incoherencias internas en el relato.
              </p>
            } @else {
              <ul class="m-0 pl-0 list-none flex flex-col gap-1.5">
                @for (item of incoherencias(); track item) {
                  <li class="flex items-start gap-2 text-[13px] text-ink-2">
                    <ui-icon
                      name="warning"
                      [size]="15"
                      [style.color]="'var(--tier-yellow-ink)'"
                      class="mt-0.5"
                    />
                    <span>{{ item }}</span>
                  </li>
                }
              </ul>
            }
          </div>

          <div>
            <h4 class="text-[11.5px] uppercase tracking-wide text-ink-4 m-0 mb-2">
              Entidades extraídas
            </h4>
            @if (entityGroups().length === 0) {
              <p class="text-[12.5px] text-ink-3 m-0">
                No se identificaron entidades en la narrativa.
              </p>
            } @else {
              <div class="flex flex-col gap-2.5">
                @for (group of entityGroups(); track group.label) {
                  <div class="grid grid-cols-[88px_1fr] gap-2 items-start">
                    <span class="text-[12px] text-ink-3 pt-0.5">{{ group.label }}</span>
                    <div class="flex flex-wrap gap-1.5">
                      @for (item of group.items; track item) {
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line"
                          >{{ item }}</span
                        >
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class NarrativeAnalysisCard {
  readonly claim = input.required<Claim>();

  protected readonly analysis = computed(() => this.claim().narrative_analysis ?? null);
  protected readonly coherente = computed(() => !(this.analysis()?.narrativa_ilogica ?? false));
  protected readonly resumen = computed(() => this.analysis()?.resumen_narrativa ?? '');
  protected readonly incoherencias = computed(() => this.analysis()?.incoherencias ?? []);

  protected readonly entityGroups = computed<EntityGroup[]>(() => {
    const e = this.analysis()?.entidades;
    if (!e) return [];
    const groups: EntityGroup[] = [
      { label: 'Personas', items: e.personas ?? [] },
      { label: 'Lugares', items: e.lugares ?? [] },
      { label: 'Fechas', items: e.fechas ?? [] },
      { label: 'Vehículos', items: e.vehiculos ?? [] },
      { label: 'Terceros', items: e.terceros ?? [] },
      { label: 'Montos', items: e.montos ?? [] },
    ];
    return groups.filter((g) => g.items.length > 0);
  });
}
