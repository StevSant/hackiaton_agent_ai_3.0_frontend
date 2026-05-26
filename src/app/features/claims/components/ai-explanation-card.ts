import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Icon } from '../../../shared/ui/icon';
import { aiExplanation } from '../utils/ai-explanation';
import type { Claim } from '../models';

@Component({
  selector: 'claim-ai-explanation-card',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="border rounded-lg shadow-1"
      style="background: linear-gradient(180deg, color-mix(in oklch, var(--brand) 6%, var(--bg-elev)) 0%, var(--bg-elev) 60%); border-color: color-mix(in oklch, var(--brand) 18%, var(--border));"
    >
      <div class="flex items-center justify-between gap-3 px-5 pt-3.5">
        <div class="flex items-center gap-2">
          <ui-icon name="auto_awesome" [size]="16" [fill]="true" />
          <h3 class="text-[13px] font-semibold m-0" style="color: var(--brand-ink)">Explicación generada por Centinela IA</h3>
        </div>
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-brand-soft text-brand-ink">Borrador para analista</span>
      </div>
      <div class="px-5 pt-2.5 pb-5 text-[13.7px] leading-relaxed text-ink-2">
        {{ text() }}
      </div>
    </div>
  `,
})
export class AiExplanationCard {
  readonly claim = input.required<Claim>();
  protected readonly text = computed(() => aiExplanation(this.claim()));
}
