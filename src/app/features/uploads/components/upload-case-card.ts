import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icon } from '@shared/ui/icon';
import { Spinner } from '@shared/ui/spinner';
import { RiskBadge } from '@shared/ui/risk-badge';
import type { UploadCase } from '../services/upload-stream.store';

@Component({
  selector: 'upload-case-card',
  standalone: true,
  imports: [Icon, Spinner, RiskBadge, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes chip-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .chip-in {
      animation: chip-in 150ms ease-out both;
    }
  `],
  template: `
    <div class="relative flex overflow-hidden rounded-md border border-line bg-surface shadow-1 transition-all">
      <!-- Tier accent stripe -->
      <div class="w-1 flex-shrink-0" [class]="stripeClass()"></div>

      <div class="flex-1 px-4 py-3 min-w-0">
        <!-- Header row -->
        <div class="flex items-center gap-2 mb-2">
          @if (case_().status === 'parsing') {
            <ui-spinner [size]="14" class="text-ink-3" />
          } @else if (case_().status === 'scoring') {
            <ui-spinner [size]="14" class="text-brand" />
          } @else if (case_().status === 'completed') {
            <ui-icon name="check_circle" [size]="16" class="text-tier-green-ink" />
          } @else if (case_().status === 'error') {
            <ui-icon name="error" [size]="16" class="text-tier-red-ink" />
          }

          <span class="font-medium text-[13px] truncate">{{ case_().claim_id }}</span>

          @if (case_().ramo) {
            <span class="text-[11.5px] text-ink-3 ml-auto flex-shrink-0">
              {{ case_().ramo }}
              @if (case_().cobertura) { · {{ case_().cobertura }} }
            </span>
          }
        </div>

        <!-- Parsing skeleton -->
        @if (case_().status === 'parsing') {
          <p class="text-[12px] text-ink-3 m-0">Leyendo fila…</p>
        }

        <!-- Rules as they arrive during scoring -->
        @if (case_().status === 'scoring' || case_().status === 'completed') {
          @if (case_().rules.length > 0) {
            <div class="flex flex-wrap gap-1.5 mb-2">
              @for (rule of case_().rules; track rule.code) {
                <span class="chip-in inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" [class]="ruleChipClass(rule)">
                  {{ rule.code }}
                  @if (rule.kind === 'hard') {
                    <span class="opacity-75 uppercase text-[9.5px]">{{ rule.tier_hint }}</span>
                  } @else if (rule.puntos > 0) {
                    <span class="opacity-75">+{{ rule.puntos }}</span>
                  }
                </span>
              }
            </div>
          }

          <!-- ML / Anomaly / Similarity metrics row -->
          @if (hasMetrics()) {
            <div class="flex flex-wrap items-center gap-3 mt-1 text-[11.5px] text-ink-3">
              @if (case_().ml_probability !== null) {
                <span class="flex items-center gap-1">
                  <ui-icon name="psychology" [size]="12" />
                  IA: {{ formatProb(case_().ml_probability!) }}
                </span>
              }
              @if (case_().anomaly_score !== null) {
                <span class="flex items-center gap-1">
                  <ui-icon name="radar" [size]="12" />
                  Anomalía: {{ case_().anomaly_score!.toFixed(2) }}
                </span>
              }
              @if (case_().similarity_matches.length > 0) {
                <span class="flex items-center gap-1">
                  <ui-icon name="content_copy" [size]="12" />
                  ~ {{ case_().similarity_matches[0]!.claim_id }}
                  ({{ formatProb(case_().similarity_matches[0]!.similarity) }})
                </span>
              }
            </div>
          }
        }

        <!-- Completed summary -->
        @if (case_().status === 'completed' && case_().final_score !== null) {
          <div class="flex items-center gap-3 mt-2 pt-2 border-t border-line">
            <span class="text-[22px] font-bold leading-none" [class]="scoreFontClass()">
              {{ case_().final_score }}
            </span>
            <ui-risk-badge [nivel]="case_().final_tier" [withDot]="true" />
            <a
              class="ml-auto text-[12px] text-brand hover:underline flex items-center gap-0.5"
              [routerLink]="['/claims', case_().claim_id]"
            >
              Ver detalle
              <ui-icon name="arrow_forward" [size]="12" />
            </a>
          </div>
        }

        <!-- Error -->
        @if (case_().status === 'error') {
          <p class="text-[12px] text-tier-red-ink m-0 mt-1">{{ case_().error }}</p>
        }
      </div>
    </div>
  `,
})
export class UploadCaseCard {
  readonly case_ = input.required<UploadCase>({ alias: 'case' });

  protected readonly hasMetrics = computed(
    () =>
      this.case_().ml_probability !== null ||
      this.case_().anomaly_score !== null ||
      this.case_().similarity_matches.length > 0,
  );

  protected readonly stripeClass = computed(() => {
    const c = this.case_();
    if (c.status === 'error') return 'bg-tier-red';
    if (c.final_tier === 'rojo') return 'bg-tier-red';
    if (c.final_tier === 'amarillo') return 'bg-tier-yellow';
    if (c.final_tier === 'verde') return 'bg-tier-green';
    const hasRed = c.rules.some((r) => r.kind === 'hard' && r.tier_hint === 'rojo');
    if (hasRed) return 'bg-tier-red';
    const hasYellow = c.rules.some((r) => r.kind === 'hard' && r.tier_hint === 'amarillo');
    if (hasYellow) return 'bg-tier-yellow';
    return 'bg-line';
  });

  protected readonly scoreFontClass = computed(() => {
    const tier = this.case_().final_tier;
    return tier === 'rojo'
      ? 'text-tier-red-ink'
      : tier === 'amarillo'
        ? 'text-tier-yellow-ink'
        : 'text-tier-green-ink';
  });

  protected ruleChipClass(rule: UploadCase['rules'][number]): string {
    if (rule.kind === 'hard') {
      return rule.tier_hint === 'rojo'
        ? 'bg-tier-red-soft text-tier-red-ink'
        : 'bg-tier-yellow-soft text-tier-yellow-ink';
    }
    if (rule.puntos >= 6) return 'bg-tier-red-soft text-tier-red-ink';
    if (rule.puntos >= 3) return 'bg-tier-yellow-soft text-tier-yellow-ink';
    return 'bg-soft text-ink-2';
  }

  protected formatProb(v: number): string {
    return (v * 100).toFixed(0) + '%';
  }
}
