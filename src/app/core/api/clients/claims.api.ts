import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../config/env';
import type {
  ClaimDto,
  ClaimSummaryDto,
  DictamenOutcomeDto,
  InboxRowDto,
  ReviewStatusDto,
  RiskTierDto,
} from './claim.dto';
import type { Page } from './page.model';

export interface ClaimsListParams {
  tier?: RiskTierDto;
  ramo?: string;
  from_date?: string;
  to_date?: string;
  status_filter?: ReviewStatusDto;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface PageParams {
  page?: number;
  page_size?: number;
}

export interface InboxParams extends PageParams {
  status_filter?: ReviewStatusDto;
}

@Injectable({ providedIn: 'root' })
export class ClaimsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.backendUrl}${environment.apiPrefix}`;

  list(params: ClaimsListParams = {}): Observable<Page<ClaimSummaryDto>> {
    return this.http.get<Page<ClaimSummaryDto>>(`${this.base}/claims`, {
      params: toHttpParams(params),
    });
  }

  detail(id: string): Observable<ClaimDto> {
    return this.http.get<ClaimDto>(`${this.base}/claims/${encodeURIComponent(id)}`);
  }

  rescore(id: string): Observable<ClaimDto> {
    return this.http.post<ClaimDto>(`${this.base}/claims/${encodeURIComponent(id)}/rescore`, {});
  }

  escalate(id: string, note?: string): Observable<ClaimDto> {
    return this.http.post<ClaimDto>(`${this.base}/claims/${encodeURIComponent(id)}/escalate`, {
      note: note ?? null,
    });
  }

  close(id: string, note?: string): Observable<ClaimDto> {
    return this.http.post<ClaimDto>(`${this.base}/claims/${encodeURIComponent(id)}/close`, {
      note: note ?? null,
    });
  }

  take(id: string): Observable<ClaimDto> {
    return this.http.post<ClaimDto>(`${this.base}/claims/${encodeURIComponent(id)}/take`, {});
  }

  dictamen(id: string, outcome: DictamenOutcomeDto, justificacion: string): Observable<ClaimDto> {
    return this.http.post<ClaimDto>(`${this.base}/claims/${encodeURIComponent(id)}/dictamen`, {
      outcome,
      justificacion,
    });
  }

  antifraudeInbox(params: InboxParams = {}): Observable<Page<InboxRowDto>> {
    return this.http.get<Page<InboxRowDto>>(`${this.base}/antifraude/inbox`, {
      params: toHttpParams(params),
    });
  }

  analistaHistorico(params: PageParams = {}): Observable<Page<ClaimSummaryDto>> {
    return this.http.get<Page<ClaimSummaryDto>>(`${this.base}/claims/historico`, {
      params: toHttpParams(params),
    });
  }

  antifraudeHistorico(params: PageParams = {}): Observable<Page<ClaimSummaryDto>> {
    return this.http.get<Page<ClaimSummaryDto>>(`${this.base}/antifraude/historico`, {
      params: toHttpParams(params),
    });
  }
}

function toHttpParams(record: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}
