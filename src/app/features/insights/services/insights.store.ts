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
import { AuthStore } from '@core/auth/auth.store';
import { AppError } from '@core/errors/app-error';
import type { AiAnomaly, ClaimTypeSlice, MapHotspot, RegionalFraudPoint } from '../models';
import { ECUADOR_CITY_COORDS } from '../utils/ecuador-city-coords';

const REGION_PALETTE = ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'];
const SLICE_COLORS: Record<string, string> = {
  auto: '#6366f1',
  health: '#06b6d4',
  life: '#a855f7',
  other: '#94a3b8',
};

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
  const coords = ECUADOR_CITY_COORDS[dto.sucursal];
  if (!coords) return null;
  return {
    id: dto.sucursal.toLowerCase().replace(/\s+/g, '-'),
    city: dto.sucursal,
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

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  private lastUserId: string | null = null;

  readonly anomalies = computed<AiAnomaly[]>(() => {
    const b = this._bundle();
    return b ? b.anomalies.map(dtoToAnomaly) : [];
  });

  readonly regionalFraud = computed<RegionalFraudPoint[]>(() => {
    const b = this._bundle();
    return b ? b.regional_fraud.map(dtoToRegional) : [];
  });

  readonly claimTypeSlices = computed<ClaimTypeSlice[]>(() => {
    const b = this._bundle();
    return b ? b.claim_type_slices.map(dtoToSlice) : [];
  });

  readonly totalClaimsLabel = computed<string>(() => this._bundle()?.total_claims_label ?? '—');

  readonly hotspots = computed<MapHotspot[]>(() => {
    const rows = this._bundle()?.hotspots ?? [];
    return rows
      .map(dtoToHotspot)
      .filter((h): h is MapHotspot => h !== null);
  });

  readonly incidents = computed<IncidentPoint[]>(() => {
    const rows = this._bundle()?.incidents ?? [];
    return rows
      .map(dtoToIncident)
      .filter((p): p is IncidentPoint => p !== null);
  });

  readonly quarterlyOutlook = computed<QuarterlyOutlookView>(() => {
    const o = this._bundle()?.quarterly_outlook;
    return {
      body: o?.body ?? '',
      systematicFraudDelta: o?.systematic_fraud_delta ?? '',
    };
  });

  constructor() {
    effect(() => {
      const userId = this.auth.user()?.id ?? null;
      if (userId === this.lastUserId) return;
      this.lastUserId = userId;
      if (userId) {
        void this.load();
      } else {
        this._bundle.set(null);
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
}
