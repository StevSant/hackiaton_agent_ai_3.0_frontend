import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../config/env';

export type RiskTierDto = 'verde' | 'amarillo' | 'rojo';
export type RuleKindDto = 'critica' | 'amarilla' | 'scored';

export interface RuleConfigDto {
  code: string;
  titulo: string;
  descripcion: string;
  clasificacion: RiskTierDto;
  kind: RuleKindDto;
  max_pts: number;
  activaciones_30d: number;
  enabled: boolean;
  thresholds: Record<string, number>;
}

/** Body of PATCH /rules/{code} — provide enabled and/or thresholds. */
export interface RuleConfigPatchDto {
  enabled?: boolean;
  thresholds?: Record<string, number>;
}

export type RuleChangeKindDto = 'creada' | 'editada' | 'pausada' | 'reactivada' | 'umbral';

export interface RuleChangeDto {
  id: string;
  ts: string;
  actor: string;
  rule_code: string;
  rule_name: string;
  kind: RuleChangeKindDto;
  summary: string;
  before_value?: string | null;
  after_value?: string | null;
}

/** Wire shape of GET /rules/catalog (and /rules/{code}). */
export interface RuleMetaDto {
  code: string;
  name: string;
  tier_hint: RiskTierDto;
  short_description: string;
  what_triggers: string;
  max_points: number;
}

/** Snapshot of the background rescore job (POST /rules/rescore + status poll). */
export interface RescoreStatusDto {
  status: 'idle' | 'running' | 'done' | 'error';
  processed: number;
  total: number;
  changed: number;
  error?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RulesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.backendUrl}${environment.apiPrefix}`;

  listConfig(): Observable<RuleConfigDto[]> {
    return this.http.get<RuleConfigDto[]>(`${this.base}/rules/config`);
  }

  listChanges(limit?: number): Observable<RuleChangeDto[]> {
    let params = new HttpParams();
    if (limit !== undefined) params = params.set('limit', String(limit));
    return this.http.get<RuleChangeDto[]>(`${this.base}/rules/changes`, { params });
  }

  listCatalog(): Observable<RuleMetaDto[]> {
    return this.http.get<RuleMetaDto[]>(`${this.base}/rules/catalog`);
  }

  /** Pause/reactivate a rule or retune its thresholds (antifraude only).
   * Does NOT rescore — start the background job with `startRescore()`. */
  patchRule(code: string, body: RuleConfigPatchDto): Observable<RuleConfigDto> {
    return this.http.patch<RuleConfigDto>(`${this.base}/rules/${code}`, body);
  }

  /** Kick off the background rescore job (202; idempotent while running). */
  startRescore(): Observable<RescoreStatusDto> {
    return this.http.post<RescoreStatusDto>(`${this.base}/rules/rescore`, {});
  }

  /** Poll the background rescore job's progress. */
  rescoreStatus(): Observable<RescoreStatusDto> {
    return this.http.get<RescoreStatusDto>(`${this.base}/rules/rescore/status`);
  }
}
