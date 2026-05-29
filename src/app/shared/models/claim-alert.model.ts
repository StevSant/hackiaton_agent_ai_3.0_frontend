export type AlertSeverity = 'high' | 'med' | 'low';

export interface ClaimAlert {
  code: string;
  puntos: number;
  severidad: AlertSeverity;
  detalle: string;
  // Per-claim variables that made this rule fire (e.g. { demora_denuncia_horas: 56 }).
  // Optional for backward-compatibility with claims serialized before the field existed.
  evidence?: Record<string, unknown>;
}
