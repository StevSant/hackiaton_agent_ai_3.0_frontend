import type { RiskTier } from '@shared/utils';

/** Wire contract — confidence in the risk assessment. */
export type ConfianzaNivel = 'alta' | 'media' | 'baja';

/** Potential savings estimate — populated by estimate_savings on the backend. */
export interface SavingsEstimate {
  exposicion: number;
  valor_en_riesgo: number;
  prob_fraude_usada: number;
  ahorro_potencial_estimado: number;
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
  // Potential savings estimate — null until backend estimate_savings runs.
  ahorro?: SavingsEstimate | null;
}
