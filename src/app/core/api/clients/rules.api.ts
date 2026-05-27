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
}
