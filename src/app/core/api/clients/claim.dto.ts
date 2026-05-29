/**
 * Wire shape returned by the backend `GET /claims/{id}` and the review
 * action endpoints. Mirrors `app.schemas.claim.ClaimDetail` and is layered
 * inside `core/api/` so feature code stays free of HTTP coupling.
 */

export type ReviewStatusDto =
  | 'pendiente'
  | 'escalado'
  | 'en_revision'
  | 'dictaminado'
  | 'revisado_sin_escalar';

export type DictamenOutcomeDto = 'confirmado_sospecha' | 'descartado' | 'requiere_mas_info';

export type RiskTierDto = 'verde' | 'amarillo' | 'rojo';
export type AlertSeverityDto = 'high' | 'med' | 'low';
export type TimelineToneDto = 'ok' | 'warn' | 'danger';

export interface ClaimAlertDto {
  code: string;
  puntos: number;
  severidad: AlertSeverityDto;
  detalle: string;
}

export interface ClaimDocumentDto {
  tipo: string;
  estado: string;
  falta?: boolean;
}

export interface ClaimVehicleDto {
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  chasis?: string | null;
}

export interface ClaimTimelineEventDto {
  date: string;
  title: string;
  tone: TimelineToneDto;
  desc?: string | null;
}

export interface ClaimReviewDto {
  status: ReviewStatusDto;
  escalated_by?: string | null;
  escalated_by_name?: string | null;
  escalated_at?: string | null;
  escalation_note?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  taken_at?: string | null;
  dictamen_outcome?: DictamenOutcomeDto | null;
  dictamen_justificacion?: string | null;
  dictaminado_by?: string | null;
  dictaminado_by_name?: string | null;
  dictaminado_at?: string | null;
  bounce_count: number;
  bounce_note?: string | null;
  closed_by?: string | null;
  closed_by_name?: string | null;
  closed_at?: string | null;
  closed_note?: string | null;
}

export interface FactorContributionDto {
  feature: string;
  shap_value: number;
  direction: 'up' | 'down';
}

export interface SimilarClaimDto {
  claim_id: string;
  similarity: number;
  snippet: string;
}

export interface ClaimDto {
  id: string;
  ramo: string;
  cobertura: string;
  asegurado: string;
  asegurado_id: string;
  poliza: string;
  ciudad: string;
  fecha_ocurrencia: string;
  fecha_reporte: string;
  fecha_inicio_poliza?: string | null;
  fecha_fin_poliza?: string | null;
  monto_reclamado: number;
  suma_asegurada: number;
  estado: string;
  sucursal: string;
  vehiculo?: ClaimVehicleDto | null;
  proveedor?: string | null;
  descripcion: string;
  score: number;
  nivel: RiskTierDto;
  alertas?: ClaimAlertDto[];
  timeline?: ClaimTimelineEventDto[];
  documentos?: ClaimDocumentDto[];
  review?: ClaimReviewDto;
  ml_probability?: number | null;
  ml_factors?: FactorContributionDto[];
  anomaly_score?: number | null;
  nearest_normal_claim_id?: string | null;
  similar?: SimilarClaimDto[];
  /** G2 — awaiting Dev B OpenAPI freeze. */
  posible_falso_positivo?: boolean;
  confianza?: 'alta' | 'media' | 'baja';
  /** G4 — analyst-edited AI summary. */
  resumen_editado?: string | null;
}

export interface ClaimSummaryDto {
  id: string;
  ramo: string;
  cobertura: string;
  asegurado: string;
  asegurado_id?: string | null;
  ciudad: string;
  fecha_ocurrencia: string;
  monto_reclamado: number;
  estado: string;
  score: number;
  nivel: RiskTierDto;
  review_status: ReviewStatusDto;
  proveedor?: string | null;
  proveedor_id?: string | null;
}

export interface InboxRowDto {
  claim_id: string;
  asegurado: string;
  ramo: string;
  score: number;
  nivel: RiskTierDto;
  escalated_at: string | null;
  escalation_note_preview: string | null;
  assigned_to_name: string | null;
  bounce_count: number;
}
