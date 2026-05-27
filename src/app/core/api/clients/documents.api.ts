import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../config/env';

export interface UploadedDocumentDto {
  tipo: string;
  estado: string;
  filename: string;
  path: string;
  signed_url: string;
}

export interface BulkUploadResultDto {
  uploaded: UploadedDocumentDto[];
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class DocumentsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.backendUrl}${environment.apiPrefix}/claims`;

  uploadDocument(claimId: string, file: File, tipo = 'otro'): Observable<UploadedDocumentDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('tipo', tipo);
    return this.http.post<UploadedDocumentDto>(
      `${this.base}/${encodeURIComponent(claimId)}/documentos`,
      formData,
    );
  }

  uploadDocumentsBulk(claimId: string, files: File[]): Observable<BulkUploadResultDto> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }
    return this.http.post<BulkUploadResultDto>(
      `${this.base}/${encodeURIComponent(claimId)}/documentos/bulk`,
      formData,
    );
  }
}
