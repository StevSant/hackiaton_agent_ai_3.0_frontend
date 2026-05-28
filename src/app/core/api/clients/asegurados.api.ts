import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../config/env';

export interface AseguradoDto {
  id_asegurado: string;
  nombre: string;
  segmento: string | null;
  ciudad: string;
  antiguedad: number | null;
  num_polizas: number;
  reclamos_ultimos_12_meses: number;
  mora_actual: boolean;
  score_cliente_simulado: number | null;
  casos: number;
  alertas: number;
  monto: number;
  ramos?: string[];
}

export interface AseguradoCreate {
  id_asegurado?: string | null;
  nombre?: string | null;
  segmento?: string | null;
  ciudad: string;
  antiguedad?: number | null;
  num_polizas?: number;
  reclamos_ultimos_12_meses?: number;
  mora_actual?: boolean;
  score_cliente_simulado?: number | null;
}

export interface AseguradoUpdate {
  nombre?: string | null;
  segmento?: string | null;
  ciudad?: string;
  antiguedad?: number | null;
  num_polizas?: number;
  reclamos_ultimos_12_meses?: number;
  mora_actual?: boolean;
  score_cliente_simulado?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AseguradosApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.backendUrl}${environment.apiPrefix}`;

  listAsegurados(): Observable<AseguradoDto[]> {
    return this.http.get<AseguradoDto[]>(`${this.base}/asegurados`);
  }

  createAsegurado(body: AseguradoCreate): Observable<AseguradoDto> {
    return this.http.post<AseguradoDto>(`${this.base}/asegurados`, body);
  }

  updateAsegurado(id: string, body: AseguradoUpdate): Observable<AseguradoDto> {
    return this.http.patch<AseguradoDto>(
      `${this.base}/asegurados/${encodeURIComponent(id)}`,
      body,
    );
  }

  deleteAsegurado(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/asegurados/${encodeURIComponent(id)}`);
  }
}
