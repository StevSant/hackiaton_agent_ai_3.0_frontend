export type ReviewStatus =
  | 'pendiente'
  | 'escalado'
  | 'en_revision'
  | 'dictaminado'
  | 'revisado_sin_escalar';

export type DictamenOutcome = 'confirmado_sospecha' | 'descartado' | 'requiere_mas_info';

export interface ClaimReview {
  status: ReviewStatus;
  escalated_by?: string;
  escalated_by_name?: string;
  escalated_at?: string;
  escalation_note?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  taken_at?: string;
  dictamen_outcome?: DictamenOutcome;
  dictamen_justificacion?: string;
  dictaminado_by?: string;
  dictaminado_by_name?: string;
  dictaminado_at?: string;
  bounce_count: number;
  bounce_note?: string;
  // analista terminal close (revisado_sin_escalar)
  closed_by?: string;
  closed_by_name?: string;
  closed_at?: string;
  closed_note?: string;
}
