import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icon } from '@shared/ui/icon';
import { RiskBadge } from '@shared/ui/risk-badge';
import type { Claim, PanelLiveAgent } from '@shared/models';
import type { RiskTier } from '@shared/utils';

/**
 * Inline summary of the multi-agent panel debate on the claim detail. This is
 * the *headline* analysis surface — the panel auto-runs the first time a claim
 * opens, so this card shows an "analizando…" state while the specialists debate
 * and the consensus + recommended action once it lands. Advisory only (never
 * affects the score). Links to the full /fraud-panel replay.
 */
@Component({
  selector: 'claim-panel-summary-card',
  standalone: true,
  imports: [RouterLink, Icon, RiskBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="border rounded-lg shadow-1"
      style="background: linear-gradient(180deg, color-mix(in oklch, var(--brand) 6%, var(--bg-elev)) 0%, var(--bg-elev) 60%); border-color: color-mix(in oklch, var(--brand) 18%, var(--border));"
    >
      <div class="flex items-center justify-between gap-3 px-5 pt-3.5">
        <div class="flex items-center gap-2">
          <ui-icon name="groups" [size]="16" [fill]="true" />
          <div>
            <h3 class="text-[13px] font-semibold m-0" style="color: var(--brand-ink)">
              Análisis multi-agente
            </h3>
            <p class="text-[11px] m-0" style="color: var(--brand-ink); opacity: 0.75">
              Análisis principal · 5 agentes debaten y emiten un consenso
            </p>
          </div>
        </div>
        @if (running() && !consensus()) {
          <span class="inline-flex items-center gap-1.5 text-[12px] text-brand-ink">
            <ui-icon name="progress_activity" [size]="14" class="animate-spin" />
            Analizando…
          </span>
        } @else {
          <a
            [routerLink]="['/fraud-panel', claim().id]"
            class="inline-flex items-center gap-1 text-[12px] text-brand-ink hover:underline"
          >
            {{ consensus() ? 'Ver debate completo' : 'Ejecutar análisis' }}
            <ui-icon name="arrow_forward" [size]="13" />
          </a>
        }
      </div>

      @if (consensus(); as c) {
        <div class="px-5 pt-2.5 pb-5 flex flex-col gap-3">
          <!-- Motor vs Panel contrast -->
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]">
            <span class="text-ink-3">Motor</span>
            <ui-risk-badge [nivel]="claim().nivel" />
            <span class="font-medium tabular-nums">{{ claim().score }}/100</span>
            <ui-icon name="compare_arrows" [size]="15" />
            <span class="text-ink-3">Panel</span>
            <ui-risk-badge [nivel]="c.nivel_final ?? 'verde'" />
            @if (divergence()) {
              <span class="text-[11px] px-2 py-0.5 rounded-full border border-line bg-soft text-ink-2 font-medium">
                discrepan
              </span>
            }
          </div>

          <div class="flex items-center gap-3">
            <div class="flex-1">
              <p class="text-[11px] text-ink-3">Nivel de acuerdo del panel</p>
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

          <p class="text-[13.7px] leading-relaxed text-ink-2">{{ c.resumen }}</p>

          <p class="text-[13px] border-t border-line pt-3">
            <span class="font-semibold">Acción recomendada:</span>
            <span class="text-ink-2"> {{ c.accion_recomendada }}</span>
          </p>
        </div>
      } @else if (running()) {
        <div class="px-5 pt-2.5 pb-5 flex flex-col gap-3">
          @if (liveAgents().length) {
            <div class="flex flex-wrap gap-2">
              @for (a of liveAgents(); track a.agentId) {
                <span
                  class="inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-full border border-line bg-soft"
                >
                  @switch (a.status) {
                    @case ('voto') {
                      <span class="w-2 h-2 rounded-full" [class]="dotClass(a.nivel)"></span>
                    }
                    @case ('fallo') {
                      <ui-icon name="error" [size]="13" class="text-tier-red" />
                    }
                    @case ('pensando') {
                      <ui-icon
                        name="progress_activity"
                        [size]="13"
                        class="animate-spin"
                        style="color: var(--brand-ink)"
                      />
                    }
                    @default {
                      <ui-icon name="schedule" [size]="13" class="text-ink-3" />
                    }
                  }
                  <span class="text-ink-2">{{ a.displayName }}</span>
                </span>
              }
            </div>
          }
          <p class="flex items-center gap-2 text-[12.5px] leading-relaxed text-ink-3">
            <ui-icon
              name="progress_activity"
              [size]="15"
              class="animate-spin shrink-0"
              style="color: var(--brand-ink)"
            />
            Los agentes (reglas, ML/anomalía, narrativa, documentos/red) debaten este caso; el
            moderador emitirá el consenso aquí en unos segundos.
          </p>
        </div>
      } @else {
        <div class="px-5 pt-2.5 pb-5 text-[13px] leading-relaxed text-ink-3">
          Cinco agentes de IA — reglas, ML/anomalía, narrativa, documentos/red y un moderador de
          consenso — debaten este caso y emiten una alerta con acción recomendada. Aún no se ha
          ejecutado para este siniestro.
        </div>
      }
    </div>
  `,
})
export class PanelSummaryCard {
  readonly claim = input.required<Claim>();
  // True while the panel auto-run is in flight for this claim (no cached
  // consensus yet) — drives the "analizando con multi-agentes…" state.
  readonly running = input<boolean>(false);
  // Per-agent live status while the panel runs — shows the specialists lighting
  // up (pendiente → pensando → voto) instead of a static spinner.
  readonly liveAgents = input<PanelLiveAgent[]>([]);

  protected dotClass(nivel?: RiskTier): string {
    switch (nivel) {
      case 'rojo':
        return 'bg-tier-red';
      case 'amarillo':
        return 'bg-tier-yellow';
      default:
        return 'bg-tier-green';
    }
  }

  protected readonly consensus = computed(() => this.claim().panel_analysis?.consensus ?? null);
  protected readonly acuerdoPct = computed(() =>
    Math.round((this.consensus()?.nivel_de_acuerdo ?? 0) * 100),
  );
  protected readonly divergence = computed(() => {
    const c = this.consensus();
    return c != null && c.nivel_final != null && c.nivel_final !== this.claim().nivel;
  });
}
