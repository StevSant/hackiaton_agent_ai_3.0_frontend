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

export interface InsightsBundleDto {
  anomalies: AiAnomalyDto[];
  regional_fraud: RegionalFraudPointDto[];
  claim_type_slices: ClaimTypeSliceDto[];
  total_claims_label: string;
  quarterly_outlook: QuarterlyOutlookDto;
}

@Injectable({ providedIn: 'root' })
export class InsightsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.backendUrl}${environment.apiPrefix}`;

  get(): Observable<InsightsBundleDto> {
    return this.http.get<InsightsBundleDto>(`${this.base}/insights`);
  }
}
