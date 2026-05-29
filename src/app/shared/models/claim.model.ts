import type { RiskTier } from '@shared/utils';
import type { ClaimAlert } from './claim-alert.model';
import type { ClaimDocument } from './claim-document.model';
import type { ClaimReview } from './claim-review.model';
import type { ClaimTimelineEvent } from './claim-timeline-event.model';
import type { ClaimVehicle } from './claim-vehicle.model';
import type { FactorContribution } from './factor-contribution.model';
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
  resumen_editado?: string | null;
}
