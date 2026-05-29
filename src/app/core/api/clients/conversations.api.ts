import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../config/env';
import type { components } from '../generated/schema';

type ConversationSummary = components['schemas']['ConversationSummary'];
type ConversationDetail = components['schemas']['ConversationDetail'];
type ConversationRename = components['schemas']['ConversationRename'];
type ConversationDeleted = components['schemas']['ConversationDeleted'];

@Injectable({ providedIn: 'root' })
export class ConversationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.backendUrl}${environment.apiPrefix}/conversations`;

  list(q?: string): Observable<ConversationSummary[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    return this.http.get<ConversationSummary[]>(this.base, { params });
  }

  listByContext(ctx: {
    context_claim_id?: string;
    context_provider_id?: string;
    context_asegurado_id?: string;
  }): Observable<ConversationSummary[]> {
    let params = new HttpParams();
    if (ctx.context_claim_id) params = params.set('context_claim_id', ctx.context_claim_id);
    if (ctx.context_provider_id) params = params.set('context_provider_id', ctx.context_provider_id);
    if (ctx.context_asegurado_id) params = params.set('context_asegurado_id', ctx.context_asegurado_id);
    return this.http.get<ConversationSummary[]>(this.base, { params });
  }

  get(id: string): Observable<ConversationDetail> {
    return this.http.get<ConversationDetail>(`${this.base}/${id}`);
  }

  rename(id: string, body: ConversationRename): Observable<ConversationDetail> {
    return this.http.patch<ConversationDetail>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<ConversationDeleted> {
    return this.http.delete<ConversationDeleted>(`${this.base}/${id}`);
  }
}
