import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';
import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';
import { RiskBadge } from '../../../shared/ui/risk-badge';
import { ramoIcon, ramoLabel } from '../../../shared/utils';
import { AiExplanationCard } from '../components/ai-explanation-card';
import { AlertsList } from '../components/alerts-list';
import { AnomalyIndicatorCard } from '../components/anomaly-indicator-card';
import { CaseMetaCard } from '../components/case-meta-card';
import { DictamenCard } from '../components/dictamen-card';
import { DictamenFormModal } from '../components/dictamen-form-modal';
import { DocumentsCard } from '../components/documents-card';
import { EscalationStickyBanner } from '../components/escalation-sticky-banner';
import { MlFactorsCard } from '../components/ml-factors-card';
import { ProviderSummaryCard } from '../components/provider-summary-card';
import { RecommendationCard } from '../components/recommendation-card';
import { RevisadoCard } from '../components/revisado-card';
import { ReviewActionBar } from '../components/review-action-bar';
import { ReviewTimeline } from '../components/review-timeline';
import { RuleDetailDialog } from '../components/rule-detail-dialog';
import { ScorePanel } from '../components/score-panel';
import { SimilarNarrativesCard } from '../components/similar-narratives-card';
import { TimelineCard } from '../components/timeline-card';
import { VehicleCard } from '../components/vehicle-card';
import type { ClaimAlert, DictamenOutcome } from '../models';
import { ClaimsStore } from '../services/claims.store';
import { ProvidersStore } from '../../network/services/providers.store';

@Component({
  selector: 'page-claim-detail',
  standalone: true,
  imports: [
    Button,
    Icon,
    RiskBadge,
    AiExplanationCard,
    AlertsList,
    AnomalyIndicatorCard,
    CaseMetaCard,
    DictamenCard,
    DictamenFormModal,
    DocumentsCard,
    EscalationStickyBanner,
    MlFactorsCard,
    ProviderSummaryCard,
    RecommendationCard,
    RevisadoCard,
    ReviewActionBar,
    ReviewTimeline,
    RuleDetailDialog,
    ScorePanel,
    SimilarNarrativesCard,
    TimelineCard,
    VehicleCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = claim();
    @if (c) {
      <div class="flex items-center gap-2 mb-3.5">
        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
          (click)="back()"
        >
          <ui-icon name="arrow_back" [size]="14" /> {{ backLabel() }}
        </button>
        <span class="text-ink-3 text-[12.5px]">/</span>
        <span class="font-mono text-[12.5px] whitespace-nowrap">{{ c.id }}</span>
      </div>

      <div class="flex items-start justify-between gap-6 pb-6">
        <div class="flex-1">
          <div class="flex items-center gap-2.5 mb-1.5">
            <ui-icon [name]="ramoIcon(c.ramo)" [size]="18" />
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line"
              >{{ ramoLabel(c.ramo) }}</span
            >
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line"
              >{{ c.estado }}</span
            >
            <ui-risk-badge [nivel]="c.nivel" />
          </div>
          <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1.5">{{ c.cobertura }}</h1>
          <p class="text-ink-3 text-[13.5px] m-0">
            {{ c.asegurado }} · {{ c.ciudad }} · ocurrió el {{ c.fecha_ocurrencia }} · reportado
            {{ c.fecha_reporte }}
          </p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <div class="flex gap-2">
            <ui-button (click)="askAI()">
              <ui-icon name="auto_awesome" [size]="14" />
              Preguntar a la IA
            </ui-button>
            <ui-button>
              <ui-icon name="download" [size]="14" />
              PDF
            </ui-button>
          </div>
          @if (roleCode(); as r) {
            <claim-review-action-bar
              [role]="r"
              [currentUserId]="currentUserId()"
              [review]="c.review"
              (escalate)="onEscalate()"
              (take)="onTake()"
              (dictaminate)="dictamenOpen.set(true)"
              (markRevisado)="onMarkRevisado()"
            />
          }
        </div>
      </div>

      <!-- Bounce-back banner (only when applicable; component renders nothing otherwise) -->
      <div class="mb-4">
        <claim-escalation-sticky-banner [review]="c.review" />
      </div>

      <div class="grid grid-cols-[1fr_360px] gap-5 max-[1100px]:grid-cols-1">
        <div class="flex flex-col gap-5">
          <claim-score-panel [claim]="c" (ruleClick)="openRule($event)" />
          @if (c.review.status === 'dictaminado') {
            <claim-dictamen-card [review]="c.review" />
          } @else if (c.review.status === 'revisado_sin_escalar') {
            <claim-revisado-card [review]="c.review" />
          }
          <claim-ai-explanation-card [claim]="c" />
          <claim-alerts-list [alerts]="c.alertas" />
          <claim-ml-factors-card [claim]="c" />
          <claim-anomaly-indicator-card [claim]="c" />
          <claim-similar-narratives-card [claim]="c" />
          <claim-timeline-card [events]="c.timeline" />
          <claim-documents-card [docs]="c.documentos" />
        </div>

        <div class="flex flex-col gap-5">
          <claim-review-timeline [review]="c.review" />
          <claim-meta-card [claim]="c" />
          @if (c.vehiculo) {
            <claim-vehicle-card [vehicle]="c.vehiculo" />
          }
          @if (provider(); as p) {
            <claim-provider-summary-card [provider]="p" />
          }
          <div class="bg-surface border border-line rounded-lg shadow-1">
            <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
              <h3 class="text-[13px] font-semibold m-0">Relato del reclamo</h3>
            </div>
            <div class="px-5 py-5 text-[13px] leading-relaxed text-ink-2">{{ c.descripcion }}</div>
          </div>
          <claim-recommendation-card [claim]="c" />
        </div>
      </div>

      <!-- Modals -->
      @if (activeAlert(); as a) {
        <claim-rule-detail-dialog [open]="ruleOpen()" [alert]="a" (close)="ruleOpen.set(false)" />
      }
      <claim-dictamen-form-modal
        [open]="dictamenOpen()"
        (close)="dictamenOpen.set(false)"
        (submit)="onDictamen($event)"
      />
    } @else {
      <div class="py-20 text-center text-ink-3">
        Caso no encontrado.
        <div class="mt-2">
          <button class="underline" (click)="back()">Volver a la bandeja</button>
        </div>
      </div>
    }
  `,
})
export class ClaimDetailPage {
  readonly id = input.required<string>();

  private readonly claims = inject(ClaimsStore);
  private readonly providers = inject(ProvidersStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;

  protected readonly ruleOpen = signal(false);
  protected readonly activeAlert = signal<ClaimAlert | null>(null);
  protected readonly dictamenOpen = signal(false);

  protected readonly claim = computed(() => this.claims.findById(this.id()));

  protected readonly provider = computed(() => {
    const c = this.claim();
    if (!c?.proveedor) return null;
    return this.providers.findById(c.proveedor) ?? null;
  });

  protected readonly roleCode = computed(() => this.auth.user()?.roleCode ?? null);
  protected readonly currentUserId = computed(() => this.auth.user()?.id ?? 'usr_anon');
  protected readonly currentUserName = computed(() => this.auth.user()?.name ?? 'Sin sesión');

  protected readonly backLabel = computed(() =>
    this.roleCode() === 'antifraude' ? 'Bandeja Antifraude' : 'Bandeja',
  );

  protected back(): void {
    const route = this.roleCode() === 'antifraude' ? '/antifraude/bandeja' : '/claims';
    void this.router.navigate([route]);
  }

  protected askAI(): void {
    void this.router.navigate(['/agent'], { queryParams: { case: this.id() } });
  }

  protected openRule(alert: ClaimAlert): void {
    this.activeAlert.set(alert);
    this.ruleOpen.set(true);
  }

  protected onMarkRevisado(): void {
    // Mockup: light prompt so the user can leave a closure note. Real wiring
    // replaces with a proper modal + POST /claims/{id}/close.
    const note =
      typeof window !== 'undefined'
        ? window.prompt(
            'Marcar este caso como revisado sin escalación. Opcionalmente, deja una nota:',
            '',
          )
        : null;
    if (note === null) return; // user cancelled
    const now = new Date().toISOString();
    this.claims.patchReview(this.id(), {
      status: 'revisado_sin_escalar',
      closed_by: this.currentUserId(),
      closed_by_name: this.currentUserName(),
      closed_at: now,
      closed_note: note.trim() || undefined,
    });
  }

  protected onEscalate(): void {
    const id = this.id();
    const now = new Date().toISOString();
    // Mockup: synchronously transition. Real wiring calls POST /escalate.
    this.claims.patchReview(id, {
      status: 'escalado',
      escalated_by: this.currentUserId(),
      escalated_by_name: this.currentUserName(),
      escalated_at: now,
      escalation_note: 'Escalado desde la bandeja (mockup).',
      // Clear bounce visibility after re-escalation
      bounce_note: undefined,
    });
  }

  protected onTake(): void {
    const now = new Date().toISOString();
    this.claims.patchReview(this.id(), {
      status: 'en_revision',
      assigned_to: this.currentUserId(),
      assigned_to_name: this.currentUserName(),
      taken_at: now,
    });
  }

  protected onDictamen(payload: { outcome: DictamenOutcome; justificacion: string }): void {
    const now = new Date().toISOString();
    const id = this.id();
    this.dictamenOpen.set(false);

    if (payload.outcome === 'requiere_mas_info') {
      // Bounce-back: return to pendiente with the antifraude's note as bounce_note.
      const current = this.claim();
      const nextBounce = (current?.review.bounce_count ?? 0) + 1;
      this.claims.patchReview(id, {
        status: 'pendiente',
        bounce_count: nextBounce,
        bounce_note: payload.justificacion,
        dictaminado_by: this.currentUserId(),
        dictaminado_by_name: this.currentUserName(),
        dictaminado_at: now,
        // Clear taken_at so the timeline collapses cleanly
        assigned_to: undefined,
        taken_at: undefined,
      });
      return;
    }

    this.claims.patchReview(id, {
      status: 'dictaminado',
      dictamen_outcome: payload.outcome,
      dictamen_justificacion: payload.justificacion,
      dictaminado_by: this.currentUserId(),
      dictaminado_by_name: this.currentUserName(),
      dictaminado_at: now,
    });
  }
}
