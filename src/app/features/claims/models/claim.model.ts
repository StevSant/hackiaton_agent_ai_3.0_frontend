import type { RiskTier } from '../../../shared/utils';
import type { ClaimAlert } from './claim-alert.model';
import type { ClaimDocument } from './claim-document.model';
import type { ClaimTimelineEvent } from './claim-timeline-event.model';
import type { ClaimVehicle } from './claim-vehicle.model';

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
  descripcion: string;
  score: number;
  nivel: RiskTier;
  alertas: ClaimAlert[];
  timeline: ClaimTimelineEvent[];
  documentos: ClaimDocument[];
}
