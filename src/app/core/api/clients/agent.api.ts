import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../config/env';
import type { components } from '../generated/schema';

export interface TranscribeResponseBody {
  text: string;
}

export type DocxRequestBody = components['schemas']['DocxRequest'];

/** Document the analyst is editing in the canvas, attached to a chat turn (CHANGE 1). */
export type DocumentContext = components['schemas']['DocumentContext'];

@Injectable({ providedIn: 'root' })
export class AgentApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendUrl}${environment.apiPrefix}/agent`;

  transcribe(audioBlob: Blob, filename = 'voice.webm'): Observable<TranscribeResponseBody> {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    return this.http.post<TranscribeResponseBody>(`${this.baseUrl}/transcribe`, formData);
  }

  /** Synthesize speech for `text`; returns an audio/mpeg blob. Bearer added by interceptor. */
  tts(text: string, voice: string): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/tts`, { text, voice }, { responseType: 'blob' });
  }

  /**
   * Convert markdown content to a .docx binary and return it as a Blob.
   * Mirrors the `downloadReportDocx` pattern in claims.api.ts.
   */
  downloadDocumentDocx(body: DocxRequestBody): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/document/docx`, body, { responseType: 'blob' });
  }
}
