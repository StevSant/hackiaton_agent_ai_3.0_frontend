import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../config/env';

export interface ProviderDto {
  id_proveedor: string;
  nombre: string;
  tipo: string;
  ciudad: string;
  casos: number;
  alertas: number;
  monto: number;
  lista_restrictiva: boolean;
  ramos?: string[];
}

export interface ProviderCreate {
  id_proveedor?: string | null;
  nombre?: string | null;
  tipo: string;
  ciudad: string;
  antiguedad?: number | null;
  lista_restrictiva?: boolean;
  reclamos_asociados?: number;
  monto_promedio_reclamado?: number;
}

export interface ProviderUpdate {
  nombre?: string | null;
  tipo?: string;
  ciudad?: string;
  antiguedad?: number | null;
  lista_restrictiva?: boolean;
  reclamos_asociados?: number;
  monto_promedio_reclamado?: number;
}

@Injectable({ providedIn: 'root' })
export class NetworkApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.backendUrl}${environment.apiPrefix}`;

  // `fresh` busts the 30s server Cache-Control so a post-mutation reload sees
  // the new state immediately (the GET sets `Cache-Control: max-age=30`).
  listProviders(opts?: { fresh?: boolean }): Observable<ProviderDto[]> {
    const url = opts?.fresh
      ? `${this.base}/network/providers?ts=${Date.now()}`
      : `${this.base}/network/providers`;
    return this.http.get<ProviderDto[]>(url);
  }

  createProvider(body: ProviderCreate): Observable<ProviderDto> {
    return this.http.post<ProviderDto>(`${this.base}/network/providers`, body);
  }

  updateProvider(id: string, body: ProviderUpdate): Observable<ProviderDto> {
    return this.http.patch<ProviderDto>(
      `${this.base}/network/providers/${encodeURIComponent(id)}`,
      body,
    );
  }

  deleteProvider(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/network/providers/${encodeURIComponent(id)}`);
  }
}
