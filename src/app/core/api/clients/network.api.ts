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

export type NetworkNodeKind = 'proveedor' | 'asegurado' | 'caso';

export interface NetworkNodeDto {
  id: string;
  label: string;
  kind: NetworkNodeKind;
  ciudad: string;
  casos: number;
  alertas: number;
  monto: number;
  lista_restrictiva: boolean;
  ramos?: string[];
  // Only set on synthesized `caso` nodes — drives tier-based coloring.
  tier?: string;
}

export interface NetworkEdgeDto {
  proveedor_id: string;
  asegurado_id: string;
  casos_compartidos: number;
  alertas: number;
  monto: number;
}

/** A single claim (siniestro) bridging a provider and an insured. */
export interface NetworkClaimDto {
  id: string;
  label: string;
  proveedor_id: string | null;
  asegurado_id: string;
  ramo: string;
  ciudad: string;
  monto: number;
  score: number;
  tier: string;
  alerta: boolean;
}

export interface NetworkRelationsDto {
  nodes: NetworkNodeDto[];
  edges: NetworkEdgeDto[];
  casos?: NetworkClaimDto[];
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

  listProviders(): Observable<ProviderDto[]> {
    return this.http.get<ProviderDto[]>(`${this.base}/network/providers`);
  }

  relations(): Observable<NetworkRelationsDto> {
    return this.http.get<NetworkRelationsDto>(`${this.base}/network/relations`);
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
