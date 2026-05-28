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

@Injectable({ providedIn: 'root' })
export class AseguradosApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.backendUrl}${environment.apiPrefix}`;

  listAsegurados(): Observable<AseguradoDto[]> {
    return this.http.get<AseguradoDto[]>(`${this.base}/asegurados`);
  }
}
