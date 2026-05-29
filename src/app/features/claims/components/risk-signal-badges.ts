import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Claim, ConfianzaNivel } from '@shared/models';

const CONFIANZA_LABEL: Record<ConfianzaNivel, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

/** Renders explainability chips for false-positive signalling (G2 / C4). */
@Component({
  selector: 'claim-risk-signal-badges',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="flex flex-wrap items-center gap-2">
        @if (claim().posible_falso_positivo) {
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-tier-yellow-soft text-tier-yellow-ink border border-tier-yellow/30"
          >
            posible falso positivo — requiere revisión
          </span>
        }
        @if (confianza(); as level) {
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium uppercase tracking-wide border"
            [class]="confianzaClass(level)"
          >
            Confianza {{ confianzaLabel(level) }}
          </span>
        }
      </div>
    }
  `,
})
export class RiskSignalBadges {
  readonly claim = input.required<Claim>();

  protected readonly confianza = computed(() => this.claim().confianza ?? null);

  protected readonly visible = computed(
    () => this.claim().posible_falso_positivo === true || this.confianza() !== null,
  );

  protected confianzaLabel(level: ConfianzaNivel): string {
    return CONFIANZA_LABEL[level];
  }

  protected confianzaClass(level: ConfianzaNivel): string {
    if (level === 'alta') return 'bg-tier-green-soft text-tier-green-ink border-tier-green/25';
    if (level === 'media') return 'bg-tier-yellow-soft text-tier-yellow-ink border-tier-yellow/25';
    return 'bg-tier-red-soft text-tier-red-ink border-tier-red/25';
  }
}
