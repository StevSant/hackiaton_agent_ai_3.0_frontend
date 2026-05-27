import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../config/env';

export interface ImportResultDto {
  imported: number;
  skipped: number;
  errors: string[];
  claim_ids: string[];
}

@Injectable({ providedIn: 'root' })
export class ImportsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.backendUrl}${environment.apiPrefix}/claims`;

  importClaims(file: File): Observable<ImportResultDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ImportResultDto>(`${this.base}/import`, formData);
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.base}/import/template`, {
      responseType: 'blob',
    });
  }
}
