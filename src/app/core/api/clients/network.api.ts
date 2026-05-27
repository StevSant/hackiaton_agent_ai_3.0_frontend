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
}

@Injectable({ providedIn: 'root' })
export class NetworkApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.backendUrl}${environment.apiPrefix}`;

  listProviders(): Observable<ProviderDto[]> {
    return this.http.get<ProviderDto[]>(`${this.base}/network/providers`);
  }
}
