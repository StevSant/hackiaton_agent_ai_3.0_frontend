import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../config/env';

export type AuditActorDto = 'analista' | 'agente' | 'sistema';
export type AuditActionDto =
  | 'apertura'
  | 'escalamiento'
  | 'consulta_ia'
  | 'cambio_regla'
  | 'cierre'
  | 'dictamen'
  | 'export';

export interface AuditEventDto {
  id: string;
  ts: string;
  actor: AuditActorDto;
  actor_name: string;
  action: AuditActionDto;
  title: string;
  detail: string;
  target?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuditApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.backendUrl}${environment.apiPrefix}`;

  listEvents(limit?: number): Observable<AuditEventDto[]> {
    let params = new HttpParams();
    if (limit !== undefined) params = params.set('limit', String(limit));
    return this.http.get<AuditEventDto[]>(`${this.base}/audit/events`, { params });
  }
}
