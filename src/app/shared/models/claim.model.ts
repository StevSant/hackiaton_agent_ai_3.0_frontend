import type { RiskTier } from '@shared/utils';

/** Wire contract — confidence in the risk assessment. */
export type ConfianzaNivel = 'alta' | 'media' | 'baja';

/** Potential savings estimate — populated by estimate_savings on the backend. */
export interface SavingsEstimate {
  exposicion: number;
  valor_en_riesgo: number;
  prob_fraude_usada: number;
  ahorro_potencial_estimado: number;
  /** Raw amounts used to derive the estimate (added in v2). */
  monto_reclamado: number;
  suma_asegurada: number;
  monto_pagado: number;
  deducible: number;
  /** Fraction of at-risk amount expected to be recovered (0-1). */
  tasa_recuperacion: number;
  /** Where prob_fraude_usada came from — ML model or the rule score. */
  prob_source: 'ml' | 'score';
}

import type { ClaimAlert } from './claim-alert.model';
import type { ClaimDocument } from './claim-document.model';
import type { ClaimReview } from './claim-review.model';
import type { ClaimTimelineEvent } from './claim-timeline-event.model';
import type { ClaimVehicle } from './claim-vehicle.model';
import type { FactorContribution } from './factor-contribution.model';
import type { NarrativeAnalysis } from './narrative-analysis.model';
import type { PanelAnalysis } from './panel-analysis.model';
import type { SimilarClaim } from './similar-claim.model';

export interface Claim {
  id: string;
  ramo: string;
  cobertura: string;
  asegurado: string;
  asegurado_id: string;
  poliza: string;
  ciudad: string;
  fecha_ocurrencia: string;
  fecha_reporte: string;
  monto_reclamado: number;
  suma_asegurada: number;
  estado: string;
  sucursal: string;
  vehiculo?: ClaimVehicle;
  proveedor: string | null;
  proveedor_id?: string | null;
  descripcion: string;
  score: number;
  nivel: RiskTier;
  alertas: ClaimAlert[];
  timeline: ClaimTimelineEvent[];
  documentos: ClaimDocument[];
  review: ClaimReview;
  // Explainability extras (V4/V5) — backend populates them when the lifespan
  // has loaded fraud_lgbm.txt / anomaly_iforest.joblib. Absent when the
  // adapters aren't wired; UI hides the corresponding widgets gracefully.
  ml_probability?: number | null;
  ml_factors?: FactorContribution[];
  anomaly_score?: number | null;
  nearest_normal_claim_id?: string | null;
  similar?: SimilarClaim[];
  posible_falso_positivo?: boolean;
  confianza?: ConfianzaNivel;
  resumen_editado?: string | null;
  // NLP read of the narrative (entities + coherence + summary). Null until the
  // analyzer has run for this claim; the detail page triggers it on first open.
  narrative_analysis?: NarrativeAnalysis | null;
  // Cached multi-agent panel debate. Null until a panel run completes. Advisory
  // only — surfaced as a summary here; replayed in full on /fraud-panel.
  panel_analysis?: PanelAnalysis | null;
  // Lightweight advisory panel markers — carried on list rows (where the full
  // panel_analysis isn't fetched) so the bandeja can show a chip. Never affect
  // the score/tier (§2.10).
  panel_revisado?: boolean;
  panel_discrepa?: boolean;
  panel_falso_positivo?: boolean;
  // Potential savings estimate — null until backend estimate_savings runs.
  ahorro?: SavingsEstimate | null;
}
