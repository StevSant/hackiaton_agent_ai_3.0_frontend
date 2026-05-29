import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthStore } from '@core/auth/auth.store';
import { ClaimNavigationStore } from '@core/state/claim-navigation.store';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { RiskBadge } from '@shared/ui/risk-badge';
import { SkeletonCard } from '@shared/ui/skeleton-card';
import { ramoIcon, ramoLabel, resolveClaimBackNavigation, insightsMapFocusQuery, bindDetailKeyboardNav, bindRecordSwapPulse, scrollAppMainToTop } from '@shared/utils';
import { SummaryCanvas } from '../components/summary-canvas';
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
import type { ClaimAlert, DictamenOutcome } from '@shared/models';
import { ClaimsStore } from '@core/state/claims.store';
import { ProvidersStore } from '@core/state/providers.store';

@Component({
  selector: 'page-claim-detail',
  standalone: true,
  imports: [
    Button,
    Icon,
    RiskBadge,
    SkeletonCard,
    SummaryCanvas,
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
      <p class="sr-only" aria-live="polite">{{ swapAnnouncement() }}</p>

      <div class="flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <div class="flex items-center gap-2 min-w-0">
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
            (click)="back()"
          >
            <ui-icon name="arrow_back" [size]="14" /> {{ backLabel() }}
          </button>
        </div>
        @if (caseNav().total > 1) {
          <nav class="centinela-record-nav" aria-label="Navegación entre casos">
            <button
              type="button"
              class="centinela-record-nav__btn"
              [disabled]="!caseNav().prevId"
              (mouseenter)="prefetchCase(caseNav().prevId)"
              (click)="goToCase(caseNav().prevId)"
              aria-label="Caso anterior"
            >
              <ui-icon name="chevron_left" [size]="16" />
              <span class="hidden sm:inline">Anterior</span>
            </button>
            <span class="centinela-record-nav__count" [attr.data-swap]="swapTick()">
              {{ caseNav().position }}/{{ caseNav().total }}
            </span>
            <button
              type="button"
              class="centinela-record-nav__btn"
              [disabled]="!caseNav().nextId"
              (mouseenter)="prefetchCase(caseNav().nextId)"
              (click)="goToCase(caseNav().nextId)"
              aria-label="Caso siguiente"
            >
              <span class="hidden sm:inline">Siguiente</span>
              <ui-icon name="chevron_right" [size]="16" />
            </button>
          </nav>
        }
      </div>

      <div class="bg-surface border border-line rounded-lg shadow-1 mb-5 overflow-hidden">
        <div
          class="centinela-detail-hero centinela-record-identity-panel"
          [attr.data-swap]="swapTick()"
        >
          <div class="centinela-detail-hero__body">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="centinela-record-id-chip">{{ c.id }}</span>
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line"
              >
                <ui-icon [name]="ramoIcon(c.ramo)" [cacheKey]="c.id" [size]="14" />
                {{ ramoLabel(c.ramo) }}
              </span>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line"
                >{{ c.estado }}</span
              >
              <ui-risk-badge [nivel]="c.nivel" />
            </div>
            <h1 class="centinela-record-primary-name">{{ c.asegurado }}</h1>
            <p class="centinela-record-secondary-line">
              <span class="text-ink-2 font-medium">{{ c.cobertura }}</span>
              · {{ c.ciudad }} · ocurrió el {{ c.fecha_ocurrencia }} · reportado
              {{ c.fecha_reporte }}
            </p>
          </div>
          <div class="centinela-detail-hero__actions">
            <div class="flex flex-wrap gap-2">
              <ui-button [disabled]="reanalyzing()" (click)="reanalyze()">
                <ui-icon name="autorenew" [size]="14" />
                {{ reanalyzing() ? 'Re-analizando…' : 'Re-analizar caso' }}
              </ui-button>
              <ui-button (click)="askAI()">
                <ui-icon name="auto_awesome" [size]="14" />
                Preguntar a la IA
              </ui-button>
              <ui-button (click)="showOnMap()">
                <ui-icon name="map" [size]="14" />
                Mostrar en el mapa
              </ui-button>
              <ui-button (click)="exportPdf()">
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
          @if (detailLoaded()) {
            <claim-summary-canvas [claim]="c" />
            <claim-alerts-list [alerts]="c.alertas" />
            <claim-ml-factors-card [claim]="c" />
            <claim-anomaly-indicator-card [claim]="c" />
            <claim-similar-narratives-card [claim]="c" />
            <claim-timeline-card [events]="c.timeline" />
            <claim-documents-card
              [docs]="c.documentos"
              [claimId]="c.id"
              (uploaded)="onDocumentsUploaded()"
            />
          } @else {
            <div role="status" aria-label="Cargando análisis del siniestro" class="flex flex-col gap-5">
              <ui-skeleton-card [bodyLines]="4" />
            </div>
          }
        </div>

        <div class="flex flex-col gap-5">
          <claim-review-timeline [review]="c.review" />
          @if (detailLoaded()) {
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
          }
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
          <button class="underline" (click)="back()">{{ backLabel() }}</button>
        </div>
      </div>
    }
  `,
})
export class ClaimDetailPage {
  readonly id = input.required<string>();

  private readonly claims = inject(ClaimsStore);
  private readonly claimNavigation = inject(ClaimNavigationStore);
  private readonly providers = inject(ProvidersStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly returnTo = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('returnTo'))),
    { initialValue: null },
  );

  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;

  protected readonly ruleOpen = signal(false);
  protected readonly activeAlert = signal<ClaimAlert | null>(null);
  protected readonly dictamenOpen = signal(false);
  protected readonly reanalyzing = signal(false);
  protected readonly swapTick = signal(0);

  protected readonly claim = computed(() => this.claims.findById(this.id()));
  protected readonly detailLoaded = computed(() =>
    this.claims.detailLoadedIds().has(this.id()),
  );

  constructor() {
    bindRecordSwapPulse(() => this.id(), this.swapTick);

    effect(() => {
      const id = this.id();
      if (!id) return;

      scrollAppMainToTop();
      void this.claims.loadDetail(id);

      const orderedIds = this.claimNavigation.getOrderedIds(this.fallbackNavIds());
      this.claims.prefetchNeighborDetails(orderedIds, id, 2);
    });

    bindDetailKeyboardNav(this.destroyRef, {
      onPrev: () => this.goToCase(this.caseNav().prevId),
      onNext: () => this.goToCase(this.caseNav().nextId),
    });
  }

  protected readonly provider = computed(() => {
    const c = this.claim();
    if (!c?.proveedor) return null;
    return this.providers.findById(c.proveedor) ?? null;
  });

  protected readonly roleCode = computed(() => this.auth.user()?.roleCode ?? null);
  protected readonly currentUserId = computed(() => this.auth.user()?.id ?? 'usr_anon');
  protected readonly currentUserName = computed(() => this.auth.user()?.name ?? 'Sin sesión');

  protected readonly backNavigation = computed(() =>
    resolveClaimBackNavigation(this.returnTo(), this.roleCode()),
  );

  protected readonly backLabel = computed(() => this.backNavigation().label);

  protected readonly fallbackNavIds = computed(() =>
    [...this.claims.claims()]
      .sort((a, b) => b.score - a.score)
      .map((claim) => claim.id),
  );

  protected readonly caseNav = computed(() =>
    this.claimNavigation.resolve(this.id(), this.fallbackNavIds()),
  );

  protected readonly swapAnnouncement = computed(() => {
    this.swapTick();
    const claim = this.claim();
    if (!claim) return '';
    const nav = this.caseNav();
    return `Caso ${claim.id}, ${claim.asegurado}. ${nav.position} de ${nav.total}.`;
  });

  protected back(): void {
    void this.router.navigateByUrl(this.backNavigation().path);
  }

  protected goToCase(id: string | null): void {
    if (!id || id === this.id()) return;
    this.claims.prefetchDetail(id);
    scrollAppMainToTop();
    const queryParams = this.returnTo() ? { returnTo: this.returnTo()! } : undefined;
    void this.router.navigate(['/claims', id], { queryParams });
  }

  protected prefetchCase(id: string | null): void {
    this.claims.prefetchDetail(id);
  }

  protected askAI(): void {
    const conversationId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    void this.router.navigate(['/agent'], {
      queryParams: { case: this.id(), conversation: conversationId },
    });
  }

  protected showOnMap(): void {
    void this.router.navigate(['/insights'], {
      queryParams: insightsMapFocusQuery(this.id()),
    });
  }

  protected openRule(alert: ClaimAlert): void {
    this.activeAlert.set(alert);
    this.ruleOpen.set(true);
  }

  protected async onMarkRevisado(): Promise<void> {
    const note =
      typeof window !== 'undefined'
        ? window.prompt(
            'Marcar este caso como revisado sin escalación. Opcionalmente, deja una nota:',
            '',
          )
        : null;
    if (note === null) return;
    await this.claims.close(this.id(), note.trim() || undefined);
  }

  protected async reanalyze(): Promise<void> {
    if (this.reanalyzing()) return;
    this.reanalyzing.set(true);
    try {
      await this.claims.rescore(this.id());
    } finally {
      this.reanalyzing.set(false);
    }
  }

  protected async onEscalate(): Promise<void> {
    await this.claims.escalate(this.id(), 'Escalado desde la bandeja.');
  }

  protected async onTake(): Promise<void> {
    await this.claims.take(this.id());
  }

  protected async onDictamen(payload: {
    outcome: DictamenOutcome;
    justificacion: string;
  }): Promise<void> {
    this.dictamenOpen.set(false);
    await this.claims.dictamen(this.id(), payload.outcome, payload.justificacion);
  }

  protected async exportPdf(): Promise<void> {
    const { exportClaimPdf } = await import('../utils/export-claim-pdf');
    const c = this.claim();
    if (!c) return;
    exportClaimPdf(c);
  }

  protected async onDocumentsUploaded(): Promise<void> {
    await this.claims.reloadDetail(this.id());
  }
}
