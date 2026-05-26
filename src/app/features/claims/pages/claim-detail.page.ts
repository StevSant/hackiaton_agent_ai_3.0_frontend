import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';
import { RiskBadge } from '../../../shared/ui/risk-badge';
import { ramoIcon, ramoLabel } from '../../../shared/utils';
import { AiExplanationCard } from '../components/ai-explanation-card';
import { AlertsList } from '../components/alerts-list';
import { CaseMetaCard } from '../components/case-meta-card';
import { DocumentsCard } from '../components/documents-card';
import { ProviderSummaryCard } from '../components/provider-summary-card';
import { RecommendationCard } from '../components/recommendation-card';
import { ScorePanel } from '../components/score-panel';
import { TimelineCard } from '../components/timeline-card';
import { VehicleCard } from '../components/vehicle-card';
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
    CaseMetaCard,
    DocumentsCard,
    ProviderSummaryCard,
    RecommendationCard,
    ScorePanel,
    TimelineCard,
    VehicleCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = claim();
    @if (c) {
      <div class="flex items-center gap-2 mb-3.5">
        <button class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[13px] text-ink-2 hover:bg-hover hover:text-ink" (click)="back()">
          <ui-icon name="arrow_back" [size]="14" /> Bandeja
        </button>
        <span class="text-ink-3 text-[12.5px]">/</span>
        <span class="font-mono text-[12.5px] whitespace-nowrap">{{ c.id }}</span>
      </div>

      <div class="flex items-start justify-between gap-6 pb-6">
        <div class="flex-1">
          <div class="flex items-center gap-2.5 mb-1.5">
            <ui-icon [name]="ramoIcon(c.ramo)" [size]="18" />
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line">{{ ramoLabel(c.ramo) }}</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line">{{ c.estado }}</span>
            <ui-risk-badge [nivel]="c.nivel" />
          </div>
          <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1.5">{{ c.cobertura }}</h1>
          <p class="text-ink-3 text-[13.5px] m-0">
            {{ c.asegurado }} · {{ c.ciudad }} · ocurrió el {{ c.fecha_ocurrencia }} · reportado {{ c.fecha_reporte }}
          </p>
        </div>
        <div class="flex gap-2">
          <ui-button (click)="askAI()">
            <ui-icon name="auto_awesome" [size]="14" />
            Preguntar a la IA
          </ui-button>
          <ui-button>
            <ui-icon name="download" [size]="14" />
            PDF
          </ui-button>
          <ui-button variant="primary">
            <ui-icon name="flag" [size]="14" />
            Escalar
          </ui-button>
        </div>
      </div>

      <div class="grid grid-cols-[1fr_360px] gap-5 max-[1100px]:grid-cols-1">
        <div class="flex flex-col gap-5">
          <claim-score-panel [claim]="c" />
          <claim-ai-explanation-card [claim]="c" />
          <claim-alerts-list [alerts]="c.alertas" />
          <claim-timeline-card [events]="c.timeline" />
          <claim-documents-card [docs]="c.documentos" />
        </div>

        <div class="flex flex-col gap-5">
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
    } @else {
      <div class="py-20 text-center text-ink-3">
        Caso no encontrado.
        <div class="mt-2"><button class="underline" (click)="back()">Volver a la bandeja</button></div>
      </div>
    }
  `,
})
export class ClaimDetailPage {
  readonly id = input.required<string>();

  private readonly claims = inject(ClaimsStore);
  private readonly providers = inject(ProvidersStore);
  private readonly router = inject(Router);

  protected readonly ramoIcon = ramoIcon;
  protected readonly ramoLabel = ramoLabel;

  protected readonly claim = computed(() => this.claims.findById(this.id()));

  protected readonly provider = computed(() => {
    const c = this.claim();
    if (!c?.proveedor) return null;
    return this.providers.findById(c.proveedor) ?? null;
  });

  protected back(): void {
    void this.router.navigate(['/claims']);
  }

  protected askAI(): void {
    void this.router.navigate(['/agent'], { queryParams: { case: this.id() } });
  }
}
