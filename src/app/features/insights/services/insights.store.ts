import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  InsightsApi,
  type AiAnomalyDto,
  type ClaimTypeSliceDto,
  type InsightsBundleDto,
  type RegionalFraudPointDto,
} from '@core/api/clients/insights.api';
import { AuthStore } from '@core/auth/auth.store';
import { AppError } from '@core/errors/app-error';
import type { AiAnomaly, ClaimTypeSlice, RegionalFraudPoint } from '../models';

const REGION_PALETTE = ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'];
const SLICE_COLORS: Record<string, string> = {
  auto: '#1e293b',
  health: '#3b82f6',
  life: '#6366f1',
  other: '#94a3b8',
};

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
    color: SLICE_COLORS[dto.key] ?? SLICE_COLORS.other,
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
