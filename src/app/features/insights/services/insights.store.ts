import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  InsightsApi,
  type AiAnomalyDto,
  type ClaimTypeSliceDto,
  type HotspotDto,
  type IncidentDto,
  type InsightsBundleDto,
  type RegionalFraudPointDto,
} from '@core/api/clients/insights.api';
import type { SavingsAnalysisDto } from '@core/api/clients/claim.dto';
import { AuthStore } from '@core/auth/auth.store';
import { AppError } from '@core/errors/app-error';
import type { AiAnomaly, ClaimTypeSlice, MapHotspot, RegionalFraudPoint } from '../models';
import { ECUADOR_CITY_COORDS, normalizeToCity } from '../utils/ecuador-city-coords';
import { SLICE_COLORS } from '../utils/insights-chart-theme';

const REGION_PALETTE = ['#4a6280', '#5f7d9e', '#7a94b0', '#94aec9', '#aebdd0'];

const HIGH_RISK_THRESHOLD = 70;

export interface IncidentPoint {
  id: string;
  sucursal: string;
  score: number;
  tier: 'verde' | 'amarillo' | 'rojo';
  latitude: number;
  longitude: number;
  fechaOcurrencia: string | null;
}

interface QuarterlyOutlookView {
  body: string;
  systematicFraudDelta: string;
}

function dtoToAnomaly(dto: AiAnomalyDto): AiAnomaly {
  return { ...dto };
}

function dtoToRegional(dto: RegionalFraudPointDto, idx: number): RegionalFraudPoint {
  return {
    region: dto.region,
    value: dto.value,
    color: REGION_PALETTE[idx] ?? REGION_PALETTE[REGION_PALETTE.length - 1],
  };
}

function dtoToSlice(dto: ClaimTypeSliceDto): ClaimTypeSlice {
  return {
    key: dto.key,
    label: dto.label,
    pct: dto.pct,
    color: SLICE_COLORS[dto.key] ?? SLICE_COLORS['other'],
  };
}

function dtoToHotspot(dto: HotspotDto): MapHotspot | null {
  const city = normalizeToCity(dto.sucursal) ?? dto.sucursal;
  const coords = ECUADOR_CITY_COORDS[city];
  if (!coords) return null;
  return {
    id: city.toLowerCase().replace(/\s+/g, '-'),
    city,
    province: coords.province,
    risk: dto.avg_score >= HIGH_RISK_THRESHOLD ? 'high' : 'medium',
    latitude: coords.latitude,
    longitude: coords.longitude,
    fraudProbability: Math.round(dto.avg_score),
  };
}

function dtoToIncident(dto: IncidentDto): IncidentPoint | null {
  if (dto.latitude == null || dto.longitude == null) return null;
  return {
    id: dto.id_siniestro,
    sucursal: dto.sucursal,
    score: dto.score,
    tier: dto.tier as 'verde' | 'amarillo' | 'rojo',
    latitude: dto.latitude,
    longitude: dto.longitude,
    fechaOcurrencia: dto.fecha_ocurrencia ?? null,
  };
}

@Injectable({ providedIn: 'root' })
export class InsightsStore {
  private readonly api = inject(InsightsApi);
  private readonly auth = inject(AuthStore);

  private readonly _bundle = signal<InsightsBundleDto | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<AppError | null>(null);

  private readonly _savings = signal<SavingsAnalysisDto | null>(null);
  private readonly _savingsLoading = signal<boolean>(false);
  private readonly _savingsError = signal<AppError | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly savings = this._savings.asReadonly();
  readonly savingsLoading = this._savingsLoading.asReadonly();
  readonly savingsError = this._savingsError.asReadonly();

  private lastUserId: string | null = null;

  readonly anomalies = computed<AiAnomaly[]>(() => {
    const b = this._bundle();
    return b ? b.anomalies.map(dtoToAnomaly) : [];
  });

  readonly regionalFraud = computed<RegionalFraudPoint[]>(() => {
    const b = this._bundle();
    return b ? b.regional_fraud.map(dtoToRegional) : [];
  });

  /** All mapped cities with claim counts (for navigation / compare pickers). */
  readonly cityCatalog = computed(() => {
    const stats = new Map<string, { alerts: number; total: number }>();
    for (const incident of this.incidents()) {
      const city = normalizeToCity(incident.sucursal);
      if (!city) continue;
      const row = stats.get(city) ?? { alerts: 0, total: 0 };
      row.total += 1;
      if (incident.tier !== 'verde') row.alerts += 1;
      stats.set(city, row);
    }

    return [...stats.entries()]
      .sort(
        (left, right) =>
          right[1].alerts - left[1].alerts ||
          right[1].total - left[1].total ||
          left[0].localeCompare(right[0], 'es'),
      )
      .map(([region, row]) => ({
        region,
        alerts: row.alerts,
        total: row.total,
      }));
  });

  readonly claimTypeSlices = computed<ClaimTypeSlice[]>(() => {
    const b = this._bundle();
    return b ? b.claim_type_slices.map(dtoToSlice) : [];
  });

  readonly totalClaimsLabel = computed<string>(() => this._bundle()?.total_claims_label ?? '—');

  readonly hotspots = computed<MapHotspot[]>(() => {
    const rows = this._bundle()?.hotspots ?? [];
    return rows.map(dtoToHotspot).filter((h): h is MapHotspot => h !== null);
  });

  readonly incidents = computed<IncidentPoint[]>(() => {
    const rows = this._bundle()?.incidents ?? [];
    return rows.map(dtoToIncident).filter((p): p is IncidentPoint => p !== null);
  });

  readonly quarterlyOutlook = computed<QuarterlyOutlookView | null>(() => {
    const o = this._bundle()?.quarterly_outlook;
    if (!o) return null;
    return {
      body: o.body,
      systematicFraudDelta: o.systematic_fraud_delta,
    };
  });

  constructor() {
    effect(() => {
      const userId = this.auth.user()?.id ?? null;
      if (userId === this.lastUserId) return;
      this.lastUserId = userId;
      if (userId) {
        void this.load();
        void this.loadSavings();
      } else {
        this._bundle.set(null);
        this._savings.set(null);
      }
    });
  }

  async load(): Promise<void> {
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const bundle = await firstValueFrom(this.api.get());
      this._bundle.set(bundle);
    } catch (err) {
      this._error.set(err instanceof AppError ? err : new AppError('unknown', String(err)));
    } finally {
      this._loading.set(false);
    }
  }

  async loadSavings(): Promise<void> {
    if (this._savingsLoading()) return;
    this._savingsLoading.set(true);
    this._savingsError.set(null);
    try {
      const data = await firstValueFrom(this.api.savingsAnalysis());
      this._savings.set(data);
    } catch (err) {
      this._savingsError.set(err instanceof AppError ? err : new AppError('unknown', String(err)));
    } finally {
      this._savingsLoading.set(false);
    }
  }
}
