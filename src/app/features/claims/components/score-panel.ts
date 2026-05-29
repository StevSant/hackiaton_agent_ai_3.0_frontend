import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { RiskRing } from '@shared/ui/risk-ring';
import { ALERT_CATALOG } from '@shared/models';
import { RiskSignalBadges } from './risk-signal-badges';
import { suggestedAction } from '../utils/ai-explanation';
import { hardRuleOverride } from '../utils/hard-rule-override';
import type { Claim, ClaimAlert } from '../models';

@Component({
  selector: 'claim-score-panel',
  standalone: true,
  imports: [RiskRing, RiskSignalBadges],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="px-5 py-5 flex items-center gap-7">
        <ui-risk-ring [score]="claim().score" [size]="132" [stroke]="10" />
        <div class="flex-1">
          <div class="text-ink-3 text-[11px] uppercase tracking-wider font-medium">Score de posible fraude</div>
          <div class="text-[22px] font-semibold mt-1 tracking-tight">{{ headline() }}</div>
          <claim-risk-signal-badges class="block mt-2" [claim]="claim()" />
          <p class="text-ink-3 text-[12.5px] mt-2 mb-0 max-w-[520px]">
            {{ suggestedAction(claim()) }}
            @if (claim().alertas.length > 0) {
              Se activaron {{ claim().alertas.length }} señales con un total de {{ totalPts() }} puntos sobre 100.
            }
          </p>
          @if (override(); as ov) {
            <div
              class="mt-3 max-w-[520px] flex items-start gap-2 rounded-md px-3 py-2 border"
              [class]="
                claim().nivel === 'rojo'
                  ? 'bg-tier-red-soft border-tier-red-ink/20'
                  : 'bg-tier-yellow-soft border-tier-yellow-ink/20'
              "
            >
              <span
                class="font-mono text-[11px] leading-none mt-0.5"
                [class]="claim().nivel === 'rojo' ? 'text-tier-red-ink' : 'text-tier-yellow-ink'"
                aria-hidden="true"
                >⚑</span
              >
              <p
                class="text-[12px] m-0"
                [class]="claim().nivel === 'rojo' ? 'text-tier-red-ink' : 'text-tier-yellow-ink'"
              >
                Clasificado como <strong>{{ overrideTierWord() }}</strong> por
                {{ ov.rules.length === 1 ? 'una regla crítica' : 'reglas críticas' }} —
                <span class="font-medium">{{ overrideRuleLabels() }}</span> —,
                <strong>independiente del puntaje acumulado</strong> ({{ claim().score }}/100).
                Las reglas críticas escalan el caso a {{ overrideReviewWord() }};
                no implican fraude, solo que el caso amerita revisión.
              </p>
            </div>
          }
          <div class="flex items-center gap-1.5 mt-3.5 flex-wrap">
            @for (a of topAlerts(); track a.code) {
              <button
                type="button"
                class="font-mono text-[11px] px-2 py-0.5 rounded transition-all cursor-pointer hover:ring-2 hover:ring-line-2 hover:ring-offset-1 hover:ring-offset-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-2"
                [class]="chipClass(a.severidad)"
                [title]="tooltipFor(a)"
                (click)="ruleClick.emit(a)"
              >
                @if (a.puntos > 0) {
                  {{ a.code }} · +{{ a.puntos }}
                } @else {
                  ⚑ {{ a.code }} · crítica
                }
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ScorePanel {
  readonly claim = input.required<Claim>();
  readonly ruleClick = output<ClaimAlert>();

  protected readonly suggestedAction = suggestedAction;

  protected readonly headline = computed(() => {
    const tier = this.claim().nivel;
    return tier === 'rojo'
      ? 'Riesgo alto — requiere revisión especializada'
      : tier === 'amarillo'
        ? 'Riesgo medio — revisión documental'
        : 'Riesgo bajo — flujo normal';
  });

  protected readonly totalPts = computed(() =>
    this.claim().alertas.reduce((s, a) => s + a.puntos, 0),
  );

  protected readonly override = computed(() => {
    const ov = hardRuleOverride(this.claim());
    return ov.active ? ov : null;
  });

  protected readonly overrideRuleLabels = computed(() =>
    (this.override()?.rules ?? [])
      .map((r) => `${r.code} · ${ALERT_CATALOG[r.code]?.titulo ?? r.code}`)
      .join(', '),
  );

  protected readonly overrideTierWord = computed(() =>
    this.claim().nivel === 'rojo' ? 'riesgo alto' : 'riesgo medio',
  );

  protected readonly overrideReviewWord = computed(() =>
    this.claim().nivel === 'rojo' ? 'revisión especializada de campo' : 'revisión documental',
  );

  // Show every activated rule as a chip — never truncate. The responsible hard
  // rule(s) are pinned first (they justify the tier even with 0 points), then
  // the rest by points desc, so the decisive signal always leads.
  protected readonly topAlerts = computed(() => {
    const alertas = this.claim().alertas;
    const pinned = new Set((this.override()?.rules ?? []).map((r) => r.code));
    const head = alertas.filter((a) => pinned.has(a.code));
    const tail = alertas.filter((a) => !pinned.has(a.code)).sort((a, b) => b.puntos - a.puntos);
    return [...head, ...tail];
  });

  protected chipClass(sev: 'high' | 'med' | 'low'): string {
    return sev === 'high'
      ? 'bg-tier-red-soft text-tier-red-ink'
      : sev === 'med'
        ? 'bg-tier-yellow-soft text-tier-yellow-ink'
        : 'bg-tier-green-soft text-tier-green-ink';
  }

  protected tooltipFor(a: ClaimAlert): string {
    const peso = a.puntos > 0 ? `+${a.puntos} pts` : 'regla crítica — escala el caso sin sumar puntos';
    return `${a.code} · ${peso} — ${a.detalle} (clic para ver detalle)`;
  }
}
