import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../config/env';

export interface TranscribeResponseBody {
  text: string;
}

export interface DocxRequestBody {
  titulo: string;
  contenido_markdown: string;
}

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
