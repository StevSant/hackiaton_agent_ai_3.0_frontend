import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmptyState } from '../../../shared/ui/empty-state';
import { Icon } from '../../../shared/ui/icon';
import type { Claim } from '../models';

/**
 * Surfaces the IsolationForest score (V5) and, when available, a link to
 * the closest "normal" claim so the analyst can contrast.
 *
 * Anomaly score follows the sklearn convention: lower = more anomalous,
 * range roughly [-1, 1]. We map to three buckets for the UI:
 *   <= -0.50  → "muy anómalo"   (red)
 *   <= -0.20  → "moderadamente"  (yellow)
 *   else      → "dentro de lo esperado" (green)
 */
@Component({
  selector: 'claim-anomaly-indicator-card',
  standalone: true,
  imports: [EmptyState, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div class="flex items-center gap-2">
          <ui-icon name="radar" [size]="16" />
          <h3 class="text-[13px] font-semibold m-0">Indicador de anomalía (V5)</h3>
        </div>
        @if (score() !== null) {
          <span class="font-mono text-[11.5px] px-2 py-0.5 rounded" [class]="bandChipClass()">
            {{ bandLabel() }}
          </span>
        }
      </div>
      @if (score() === null) {
        <ui-empty-state
          title="Detector de anomalía no cargado"
          sub="Entrena el IsolationForest en notebooks/02_modelo_fraude.ipynb para activar esta vista."
        />
      } @else {
        <div class="px-5 py-4">
          <p class="text-[12.5px] text-ink-3 m-0 mb-3">
            Indicador no supervisado: qué tan inusual es este siniestro en comparación con la
            distribución completa de la cartera. Menor valor = más atípico.
          </p>
          <div class="flex items-center gap-4">
            <div
              class="font-mono text-[22px] font-semibold tabular-nums"
              [style.color]="bandColor()"
            >
              {{ score()!.toFixed(3) }}
            </div>
            <div class="flex-1 text-[12.5px] text-ink-2">{{ bandDescription() }}</div>
          </div>
          @if (nearestId(); as nid) {
            <a
              [routerLink]="['/claims', nid]"
              class="mt-3.5 inline-flex items-center gap-1.5 text-[12.5px] text-brand-ink hover:underline"
            >
              <ui-icon name="compare_arrows" [size]="14" />
              Comparar con caso normal más parecido: <span class="font-mono">{{ nid }}</span>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class AnomalyIndicatorCard {
  readonly claim = input.required<Claim>();

  protected readonly score = computed(() => this.claim().anomaly_score ?? null);
  protected readonly nearestId = computed(() => this.claim().nearest_normal_claim_id ?? null);

  protected readonly band = computed<'high' | 'med' | 'low'>(() => {
    const s = this.score();
    if (s === null) return 'low';
    if (s <= -0.5) return 'high';
    if (s <= -0.2) return 'med';
    return 'low';
  });

  protected readonly bandLabel = computed(() => {
    switch (this.band()) {
      case 'high':
        return 'Muy anómalo';
      case 'med':
        return 'Moderadamente anómalo';
      default:
        return 'Dentro de lo esperado';
    }
  });

  protected readonly bandDescription = computed(() => {
    switch (this.band()) {
      case 'high':
        return 'El siniestro se aleja significativamente del comportamiento típico de la cartera. Revisar a fondo.';
      case 'med':
        return 'Algunas variables del caso se desvían de lo normal. Vale una segunda mirada.';
      default:
        return 'El siniestro se mantiene dentro del rango esperado.';
    }
  });

  protected readonly bandColor = computed(() => {
    switch (this.band()) {
      case 'high':
        return 'var(--tier-red-ink)';
      case 'med':
        return 'var(--tier-yellow-ink)';
      default:
        return 'var(--tier-green-ink)';
    }
  });

  protected readonly bandChipClass = computed(() => {
    switch (this.band()) {
      case 'high':
        return 'bg-tier-red-soft text-tier-red-ink';
      case 'med':
        return 'bg-tier-yellow-soft text-tier-yellow-ink';
      default:
        return 'bg-tier-green-soft text-tier-green-ink';
    }
  });
}
