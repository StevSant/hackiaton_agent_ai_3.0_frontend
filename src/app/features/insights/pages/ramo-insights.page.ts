import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { ClaimsStore } from '@core/state/claims.store';
import { Icon } from '@shared/ui/icon';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import { formatMoneyShort } from '@shared/utils';

import { InsightsPriorityCases } from '../components/insights-priority-cases';
import { InsightsTopProviders } from '../components/insights-top-providers';
import { citySlugEncode } from '../utils/city-insights';
import {
  buildRamoInsights,
  isRamoKey,
  type RamoInsightsSnapshot,
} from '../utils/ramo-insights';

@Component({
  selector: 'page-ramo-insights',
  standalone: true,
  imports: [RouterLink, Icon, SkeletonTable, InsightsPriorityCases, InsightsTopProviders],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="insights-city-page">
      @if (claimsStore.loading() && claimsStore.claims().length === 0) {
        <div class="centinela-panel p-4">
          <ui-skeleton-table [rows]="6" [cols]="5" />
        </div>
      } @else if (!snapshot()) {
        <div class="centinela-panel centinela-empty">
          <div class="centinela-empty__icon">
            <ui-icon name="category" [size]="22" />
          </div>
          No encontramos datos para este ramo.
          <a routerLink="/insights" class="text-brand-ink hover:underline text-[13px] mt-2">
            Volver a Insights
          </a>
        </div>
      } @else {
        @let view = snapshot()!;

        <header class="insights-city-hero">
          <div class="insights-city-hero__main">
            <a routerLink="/insights" class="insights-city-hero__back">
              <ui-icon name="arrow_back" [size]="14" />
              Insights
            </a>
            <h1 class="insights-city-hero__title">{{ view.label }}</h1>
            <p class="insights-city-hero__meta flex items-center gap-1.5">
              <ui-icon [name]="view.icon" [size]="14" />
              Ramo · 12 meses
            </p>
            <div class="insights-city-stats">
              <span class="insights-city-stat">
                <strong>{{ view.kpis.totalClaims }}</strong> casos
              </span>
              <span class="insights-city-stat insights-city-stat--alert">
                <strong>{{ view.kpis.alertClaims }}</strong> alertas
              </span>
              <span class="insights-city-stat insights-city-stat--warn">
                <strong>{{ view.kpis.suspicionPct }}%</strong> sospechoso
              </span>
              <span class="insights-city-stat">
                Score <strong>{{ view.kpis.avgScore }}</strong>
              </span>
              <span class="insights-city-stat">
                <strong>{{ money(view.kpis.exposedAmount) }}</strong> expuesto
              </span>
            </div>
            <div class="flex items-center gap-2 mt-2">
              @for (tier of view.tierBreakdown; track tier.tier) {
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums"
                  [class.bg-tier-red-soft]="tier.tier === 'rojo'"
                  [class.text-tier-red-ink]="tier.tier === 'rojo'"
                  [class.bg-tier-yellow-soft]="tier.tier === 'amarillo'"
                  [class.text-tier-yellow-ink]="tier.tier === 'amarillo'"
                  [class.bg-tier-green-soft]="tier.tier === 'verde'"
                  [class.text-tier-green-ink]="tier.tier === 'verde'"
                >
                  {{ tier.label }} · {{ tier.count }} ({{ tier.pct }}%)
                </span>
              }
            </div>
            <p class="insights-city-narrative">{{ view.narrative }}</p>
          </div>
          <div class="insights-city-hero__actions">
            <button
              type="button"
              class="insights-city-hero__cta insights-city-hero__cta--bandeja"
              (click)="openFilteredTray(view.key)"
            >
              <ui-icon name="inbox" [size]="16" />
              Ver bandeja
            </button>
          </div>
        </header>

        <footer class="insights-city-footer">
          <section class="insights-city-footer__card">
            <h2 class="insights-city-footer__title">
              <ui-icon name="location_on" [size]="14" />
              Ciudades · {{ view.label }}
            </h2>
            @if (view.cityBreakdown.length === 0) {
              <p class="text-[12px] text-ink-3 m-0 py-4 text-center">Sin casos en este ramo.</p>
            } @else {
              <ul class="flex flex-col gap-1 m-0 p-0 list-none">
                @for (row of view.cityBreakdown; track row.city) {
                  <li>
                    <button
                      type="button"
                      class="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm hover:bg-hover text-left"
                      (click)="openCity(row.city)"
                    >
                      <span class="min-w-0 truncate text-[12.5px] text-ink">{{ row.city }}</span>
                      <span class="shrink-0 text-[11.5px] tabular-nums text-ink-3">
                        {{ row.sospechosos }} sospechosos · {{ row.total }} casos ·
                        {{ row.pct }}%
                      </span>
                    </button>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="insights-city-footer__card">
            <!-- InsightsTopProviders brings its own "Proveedores con más alertas" header -->
            <insights-top-providers [items]="view.topProviders" (open)="openProvider($event)" />
          </section>

          <section class="insights-city-footer__card lg:col-span-2">
            <div class="flex items-center justify-between gap-2 mb-2">
              <h2 class="insights-city-footer__title m-0">
                <ui-icon name="priority_high" [size]="14" />
                Casos prioritarios · {{ view.label }}
              </h2>
              <span class="text-[10px] text-ink-3">Top {{ view.topCases.length }}</span>
            </div>
            @if (view.topCases.length === 0) {
              <p class="text-[12px] text-ink-3 m-0 py-4 text-center">Sin casos en este ramo.</p>
            } @else {
              <insights-priority-cases [claims]="view.topCases" (open)="openCase($event)" />
            }
          </section>
        </footer>
      }
    </div>
  `,
})
export class RamoInsightsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly claimsStore = inject(ClaimsStore);

  private readonly ramoKey = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('ramoKey') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('ramoKey') ?? '' },
  );

  protected readonly snapshot = computed<RamoInsightsSnapshot | null>(() => {
    const key = this.ramoKey().toLowerCase();
    if (!isRamoKey(key)) return null;
    const view = buildRamoInsights(key, this.claimsStore.claims());
    return view.kpis.totalClaims > 0 ? view : null;
  });

  ngOnInit(): void {
    if (this.claimsStore.claims().length === 0) {
      void this.claimsStore.loadList();
    }
  }

  protected money(value: number): string {
    return formatMoneyShort(value);
  }

  private returnPath(): string {
    return `/insights/ramo/${this.ramoKey().toLowerCase()}`;
  }

  protected openCase(claimId: string): void {
    void this.router.navigate(['/claims', claimId], {
      queryParams: { returnTo: this.returnPath() },
    });
  }

  protected openProvider(providerId: string): void {
    void this.router.navigate(['/providers', providerId]);
  }

  protected openCity(city: string): void {
    void this.router.navigate(['/insights', 'ciudad', citySlugEncode(city)]);
  }

  protected openFilteredTray(ramoKey: string): void {
    void this.router.navigate(['/claims'], {
      queryParams: { ramo: ramoKey, returnTo: this.returnPath() },
    });
  }
}
