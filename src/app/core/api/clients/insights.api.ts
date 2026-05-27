import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../config/env';

export interface AiAnomalyDto {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'potential';
  confidence: number;
}

export interface RegionalFraudPointDto {
  region: string;
  value: number;
}

export interface ClaimTypeSliceDto {
  key: string;
  label: string;
  pct: number;
}

export interface QuarterlyOutlookDto {
  body: string;
  systematic_fraud_delta: string;
}

export interface HotspotDto {
  sucursal: string;
  count: number;
  alertas: number;
  avg_score: number;
}

export interface IncidentDto {
  id_siniestro: string;
  sucursal: string;
  score: number;
  tier: string;
  latitude: number | null;
  longitude: number | null;
  fecha_ocurrencia: string | null;
}

export interface InsightsBundleDto {
  anomalies: AiAnomalyDto[];
  regional_fraud: RegionalFraudPointDto[];
  claim_type_slices: ClaimTypeSliceDto[];
  total_claims_label: string;
  // Optional: backend returns null until a real forecast pipeline lands.
  // Consumers must render an empty / hidden state when this is missing.
  quarterly_outlook: QuarterlyOutlookDto | null;
  hotspots: HotspotDto[];
  incidents: IncidentDto[];
}

@Injectable({ providedIn: 'root' })
export class InsightsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.backendUrl}${environment.apiPrefix}`;

  get(): Observable<InsightsBundleDto> {
    return this.http.get<InsightsBundleDto>(`${this.base}/insights`);
  }
}
