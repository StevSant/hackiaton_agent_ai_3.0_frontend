import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state';
import { Icon } from '@shared/ui/icon';
import type { Claim } from '../models';
import { featureLabel } from '../utils/feature-labels';

@Component({
  selector: 'claim-ml-factors-card',
  standalone: true,
  imports: [EmptyState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div class="flex items-center gap-2">
          <ui-icon name="model_training" [size]="16" />
          <h3 class="text-[13px] font-semibold m-0">Factores del modelo (V4)</h3>
        </div>
        @if (probability() !== null) {
          <span
            class="font-mono text-[11.5px] px-2 py-0.5 rounded"
            [class]="probabilityChipClass()"
          >
            {{ probabilityLabel() }} · {{ probabilityPct() }}%
          </span>
        }
      </div>
      @if (probability() === null) {
        <ui-empty-state
          title="Modelo supervisado no cargado"
          sub="Entrena el clasificador en notebooks/02_modelo_fraude.ipynb para activar esta vista."
        />
      } @else if (factors().length === 0) {
        <ui-empty-state
          title="Sin factores destacados"
          sub="El modelo evaluó este siniestro sin contribuciones SHAP relevantes."
        />
      } @else {
        <div class="px-5 py-4">
          <p class="text-[12.5px] text-ink-3 m-0 mb-3.5">
            Los tres factores que más empujaron la probabilidad. La señal del analista (reglas
            activadas) es independiente — el modelo agrega contexto, no reemplaza criterio.
          </p>
          @for (f of factors(); track f.feature) {
            <div
              class="grid grid-cols-[20px_1fr_auto] gap-3 py-2.5 items-center border-t border-line first:border-t-0"
            >
              <ui-icon
                [name]="f.direction === 'up' ? 'trending_up' : 'trending_down'"
                [size]="18"
                [style.color]="f.direction === 'up' ? 'var(--tier-red)' : 'var(--tier-green)'"
              />
              <div>
                <p class="text-[13.5px] m-0 mb-0.5 font-medium">{{ label(f.feature) }}</p>
                <span class="font-mono text-[10.5px] text-ink-4">{{ f.feature }}</span>
              </div>
              <span
                class="font-mono text-[12px] tabular-nums"
                [style.color]="
                  f.direction === 'up' ? 'var(--tier-red-ink)' : 'var(--tier-green-ink)'
                "
              >
                {{ f.direction === 'up' ? '+' : '' }}{{ f.shap_value.toFixed(3) }}
              </span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MlFactorsCard {
  readonly claim = input.required<Claim>();

  protected readonly probability = computed(() => this.claim().ml_probability ?? null);
  protected readonly factors = computed(() => this.claim().ml_factors ?? []);

  protected readonly probabilityPct = computed(() => {
    const p = this.probability();
    return p === null ? 0 : Math.round(p * 100);
  });

  protected readonly probabilityLabel = computed(() => {
    const pct = this.probabilityPct();
    if (pct >= 75) return 'Probabilidad alta';
    if (pct >= 40) return 'Probabilidad media';
    return 'Probabilidad baja';
  });

  protected readonly probabilityChipClass = computed(() => {
    const pct = this.probabilityPct();
    if (pct >= 75) return 'bg-tier-red-soft text-tier-red-ink';
    if (pct >= 40) return 'bg-tier-yellow-soft text-tier-yellow-ink';
    return 'bg-tier-green-soft text-tier-green-ink';
  });

  protected label(feature: string): string {
    return featureLabel(feature);
  }
}
