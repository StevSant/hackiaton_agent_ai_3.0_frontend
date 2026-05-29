import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { ClaimsStore } from '@core/state/claims.store';
import { Icon } from '@shared/ui/icon';
import { SkeletonTable } from '@shared/ui/skeleton-table';
import {
  formatMoneyShort,
  INSIGHTS_CLAIM_RETURN,
  insightsClaimReturnQuery,
} from '@shared/utils';

import { CityComparePanel } from '../components/city-compare-panel';
import {
  CityComparePicker,
  type CityCompareOption,
} from '../components/city-compare-picker';
import { CityVisualDashboard } from '../components/city-visual-dashboard';
import { InsightsPriorityCases } from '../components/insights-priority-cases';
import { InsightsTopProviders } from '../components/insights-top-providers';
import { InsightsExplainStore } from '../services/insights-explain.store';
import { InsightsStore } from '../services/insights.store';
import {
  buildCityInsights,
  citySlugDecode,
  citySlugEncode,
  type CityInsightsSnapshot,
} from '../utils/city-insights';

@Component({
  selector: 'page-city-insights',
  standalone: true,
  imports: [
    RouterLink,
    Icon,
    SkeletonTable,
    CityComparePicker,
    CityComparePanel,
    CityVisualDashboard,
    InsightsPriorityCases,
    InsightsTopProviders,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [InsightsExplainStore],
  template: `
    <div
      class="insights-city-page"
      [class.insights-city-page--comparing]="compareCityName() !== null"
    >
      @if (store.loading() && claimsStore.claims().length === 0) {
        <div class="centinela-panel p-4">
          <ui-skeleton-table [rows]="6" [cols]="5" />
        </div>
      } @else if (!snapshot()) {
        <div class="centinela-panel centinela-empty">
          <div class="centinela-empty__icon">
            <ui-icon name="location_off" [size]="22" />
          </div>
          No encontramos datos para «{{ cityName() }}».
          <a routerLink="/insights" class="text-brand-ink hover:underline text-[13px] mt-2">
            Volver a Insights
          </a>
        </div>
      } @else {
        @let view = snapshot()!;

        <header class="insights-city-hero" [class.insights-city-hero--comparing]="compareCityName() !== null">
          <div class="insights-city-hero__main">
            <a routerLink="/insights" class="insights-city-hero__back">
              <ui-icon name="arrow_back" [size]="14" />
              Insights
            </a>
            <h1 class="insights-city-hero__title">{{ view.city }}</h1>
            <p class="insights-city-hero__meta">
              {{ view.province ?? 'Ecuador' }}
              @if (view.nationalRank) {
                · <span class="text-brand-ink font-semibold">#{{ view.nationalRank }} nacional</span>
              }
              · 12 meses
              @if (compareSnapshot(); as other) {
                · <span class="text-tier-red-ink font-semibold">Comparando con {{ other.city }}</span>
              }
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
              <span class="insights-city-stat insights-city-stat--savings">
                <strong>{{ money(view.savings.totalAhorro) }}</strong> ahorro pot.
              </span>
            </div>
            <p class="insights-city-narrative">{{ view.narrative }}</p>
          </div>
          <div class="insights-city-hero__actions">
            <insights-city-compare-picker
              [primaryCity]="view.city"
              [compareCity]="compareCityName()"
              [options]="compareOptions()"
              (primarySelect)="changePrimaryCity($event)"
              (compareSelect)="changeCompareCity($event)"
              (swapCities)="swapCities()"
              (clearCompare)="clearCompare()"
            />
            <button
              type="button"
              class="insights-city-hero__cta insights-city-hero__cta--bandeja"
              (click)="openFilteredTray(view.city)"
            >
              <ui-icon name="inbox" [size]="16" />
              Ver bandeja
            </button>
          </div>
        </header>

        @if (compareSnapshot(); as other) {
          <insights-city-compare-panel
            [primary]="view"
            [other]="other"
            [wide]="true"
            (close)="clearCompare()"
            (swap)="swapCities()"
          />
        }

        <div class="insights-city-split">
          <div class="insights-city-split__main">
            <insights-city-visual-dashboard
              [view]="view"
              [compareView]="compareSnapshot()"
              [explainState]="explainStore.entries()"
              (explain)="explainStore.explain($event)"
              (toggleExplain)="explainStore.toggle($event)"
            />

            <footer class="insights-city-footer" [class.insights-city-footer--compare]="compareSnapshot()">
              @if (!compareSnapshot()) {
                <section class="insights-city-footer__card">
                  <h2 class="insights-city-footer__title">
                    <ui-icon name="storefront" [size]="14" />
                    Proveedores · {{ view.city }}
                  </h2>
                  <insights-top-providers [items]="view.topProviders" (open)="openProvider($event)" />
                </section>
              }

              <section class="insights-city-footer__card">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <h2 class="insights-city-footer__title m-0">
                    <ui-icon name="priority_high" [size]="14" />
                    Casos prioritarios · {{ view.city }}
                  </h2>
                  <span class="text-[10px] text-ink-3">Top {{ topCasesPreview().length }}</span>
                </div>
                @if (topCasesPreview().length === 0) {
                  <p class="text-[12px] text-ink-3 m-0 py-4 text-center">Sin casos en esta ciudad.</p>
                } @else {
                  <insights-priority-cases
                    [claims]="topCasesPreview()"
                    [compact]="compareSnapshot() !== null"
                    (open)="openCase($event)"
                  />
                }
              </section>

              @if (compareSnapshot(); as other) {
                <section class="insights-city-footer__card">
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <h2 class="insights-city-footer__title m-0">
                      <ui-icon name="priority_high" [size]="14" />
                      Casos prioritarios · {{ other.city }}
                    </h2>
                    <span class="text-[10px] text-ink-3">Top {{ compareTopCasesPreview().length }}</span>
                  </div>
                  @if (compareTopCasesPreview().length === 0) {
                    <p class="text-[12px] text-ink-3 m-0 py-4 text-center">Sin casos en esta ciudad.</p>
                  } @else {
                    <insights-priority-cases
                      [claims]="compareTopCasesPreview()"
                      [compact]="true"
                      (open)="openCompareCase($event)"
                    />
                  }
                </section>
              }
            </footer>
          </div>
        </div>
      }
    </div>
  `,
})
export class CityInsightsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly claimsStore = inject(ClaimsStore);
  protected readonly store = inject(InsightsStore);
  protected readonly explainStore = inject(InsightsExplainStore);

  protected readonly compareCityName = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => {
        const raw = params.get('compare');
        if (!raw) return null;
        return citySlugDecode(raw);
      }),
    ),
    {
      initialValue: (() => {
        const raw = this.route.snapshot.queryParamMap.get('compare');
        return raw ? citySlugDecode(raw) : null;
      })(),
    },
  );

  private readonly citySlug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('citySlug') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('citySlug') ?? '' },
  );

  protected readonly cityName = computed(() => citySlugDecode(this.citySlug()));

  protected readonly compareOptions = computed<readonly CityCompareOption[]>(() =>
    this.store.cityCatalog().map((city, index) => ({
      city: city.region,
      alertCount: city.alerts,
      rank: index + 1,
    })),
  );

  private readonly regionalRows = computed(() =>
    this.store.cityCatalog().map((city) => ({
      region: city.region,
      value: city.alerts,
    })),
  );

  protected readonly snapshot = computed<CityInsightsSnapshot | null>(() => {
    const city = this.cityName();
    if (!city) return null;
    const view = buildCityInsights(city, this.claimsStore.claims(), this.regionalRows());
    return view.kpis.totalClaims > 0 || this.regionalRows().some((p) => p.region === city)
      ? view
      : null;
  });

  protected readonly compareSnapshot = computed<CityInsightsSnapshot | null>(() => {
    const city = this.compareCityName();
    if (!city) return null;
    return buildCityInsights(city, this.claimsStore.claims(), this.regionalRows());
  });

  protected readonly topCasesPreview = computed(() => this.snapshot()?.topCases ?? []);

  protected readonly compareTopCasesPreview = computed(() => this.compareSnapshot()?.topCases ?? []);

  constructor() {
    effect(() => {
      const primary = this.cityName();
      const compare = this.compareCityName();
      if (compare && compare === primary) {
        this.clearCompare();
      }
    });
    // Clear AI explanations when the city changes — the page instance is reused
    // across route params, so stale per-chart explanations would otherwise linger.
    effect(() => {
      this.cityName();
      this.explainStore.reset();
    });
  }

  ngOnInit(): void {
    void this.store.load();
    if (this.claimsStore.claims().length === 0) {
      void this.claimsStore.loadList();
    }
  }

  protected changePrimaryCity(city: string): void {
    const compare = this.compareCityName();
    void this.router.navigate(['/insights', 'ciudad', citySlugEncode(city)], {
      queryParams: compare ? { compare: citySlugEncode(compare) } : { compare: null },
      queryParamsHandling: 'merge',
    });
  }

  protected changeCompareCity(city: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { compare: citySlugEncode(city) },
      queryParamsHandling: 'merge',
    });
  }

  protected clearCompare(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { compare: null },
      queryParamsHandling: 'merge',
    });
  }

  protected swapCities(): void {
    const primary = this.cityName();
    const compare = this.compareCityName();
    if (!compare) return;
    void this.router.navigate(['/insights', 'ciudad', citySlugEncode(compare)], {
      queryParams: { compare: citySlugEncode(primary) },
    });
  }

  private compareReturnPath(): string {
    const primary = this.cityName();
    const compare = this.compareCityName();
    const base = `/insights/ciudad/${citySlugEncode(primary)}`;
    return compare ? `${base}?compare=${citySlugEncode(compare)}` : base;
  }

  protected money(value: number): string {
    return formatMoneyShort(value);
  }

  protected openCase(claimId: string): void {
    void this.router.navigate(['/claims', claimId], {
      queryParams: {
        ...insightsClaimReturnQuery(),
        returnTo: this.compareReturnPath(),
      },
    });
  }

  protected openCompareCase(claimId: string): void {
    this.openCase(claimId);
  }

  protected openProvider(providerId: string): void {
    void this.router.navigate(['/providers', providerId]);
  }

  protected openFilteredTray(city: string): void {
    void this.router.navigate(['/claims'], {
      queryParams: { ciudad: city, returnTo: INSIGHTS_CLAIM_RETURN.path },
    });
  }
}
