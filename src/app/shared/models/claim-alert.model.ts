export type AlertSeverity = 'high' | 'med' | 'low';

export interface ClaimAlert {
  code: string;
  puntos: number;
  severidad: AlertSeverity;
  detalle: string;
}
