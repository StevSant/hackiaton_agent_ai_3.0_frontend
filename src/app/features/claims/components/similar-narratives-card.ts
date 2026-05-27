import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmptyState } from '../../../shared/ui/empty-state';
import { Icon } from '../../../shared/ui/icon';
import type { Claim, SimilarClaim } from '../models';

/**
 * Surfaces the top-3 narrativa-similar prior claims (V6 — pgvector cosine
 * over `siniestros.descripcion`). When the top-1 similarity ≥ 0.85 the
 * backend ALSO fires the FS-13 rule, which appears separately under
 * "Señales activadas" — this card is the qualitative complement.
 *
 * Each card is clickable and routes to /claims/:other_id.
 */
@Component({
  selector: 'claim-similar-narratives-card',
  standalone: true,
  imports: [EmptyState, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div class="flex items-center gap-2">
          <ui-icon name="hub" [size]="16" />
          <h3 class="text-[13px] font-semibold m-0">Narrativas similares (V6)</h3>
        </div>
        @if (similar().length > 0) {
          <span class="text-[11.5px] text-ink-3">Top {{ similar().length }} casos</span>
        }
      </div>
      @if (similar().length === 0) {
        <ui-empty-state
          title="Sin narrativas similares"
          sub="No se encontraron descripciones cercanas en la cartera histórica."
        />
      } @else {
        <div class="px-5 py-4 flex flex-col gap-2.5">
          @for (s of sorted(); track s.claim_id) {
            <a
              [routerLink]="['/claims', s.claim_id]"
              class="block border border-line rounded-md p-3.5 hover:bg-hover transition-colors"
            >
              <div class="flex items-center justify-between gap-3 mb-1.5">
                <span class="font-mono text-[12px] font-medium">{{ s.claim_id }}</span>
                <span
                  class="font-mono text-[11.5px] px-2 py-0.5 rounded"
                  [class]="similarityChipClass(s.similarity)"
                >
                  {{ similarityPct(s) }}% similar
                </span>
              </div>
              <p class="text-[12.5px] text-ink-2 m-0 line-clamp-2">{{ s.snippet }}</p>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class SimilarNarrativesCard {
  readonly claim = input.required<Claim>();

  protected readonly similar = computed<readonly SimilarClaim[]>(() => this.claim().similar ?? []);

  protected readonly sorted = computed(() =>
    [...this.similar()].sort((a, b) => b.similarity - a.similarity),
  );

  protected similarityPct(s: SimilarClaim): number {
    return Math.round(s.similarity * 100);
  }

  protected similarityChipClass(similarity: number): string {
    if (similarity >= 0.85) return 'bg-tier-red-soft text-tier-red-ink';
    if (similarity >= 0.7) return 'bg-tier-yellow-soft text-tier-yellow-ink';
    return 'bg-soft text-ink-2';
  }
}
