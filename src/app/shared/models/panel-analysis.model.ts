/**
 * Cached multi-agent fraud-panel debate. Wire-compatible with the backend
 * `PanelAnalysis` schema (schemas/panel/panel_analysis.py). Advisory only —
 * never an accusation, never a score override. Surfaced on the claim detail as
 * a summary and replayed in full on the dedicated /fraud-panel page.
 *
 * Fields mirror the wire shape: the backend defaults most of them, so the
 * generated OpenAPI schema marks them as not-required. Consumers nullish-guard.
 */
import type { RiskTier } from '@shared/utils';

import type { ConfianzaNivel } from './claim.model';

export interface PanelSpecialistVerdict {
  nivel?: RiskTier;
  dictamen?: string;
  puntos_clave?: string[];
  confianza?: ConfianzaNivel;
  citas?: string[];
}

export interface PanelSpecialistRebuttal {
  ajuste?: string;
  nivel_actualizado?: RiskTier;
  cambia_postura?: boolean;
}

export interface PanelLaneSnapshot {
  agent_id: string;
  display_name: string;
  lens: string;
  narracion?: string;
  verdict?: PanelSpecialistVerdict | null;
  rebuttal_narracion?: string;
  rebuttal?: PanelSpecialistRebuttal | null;
  failed?: boolean;
}

export interface PanelConsensus {
  nivel_final?: RiskTier;
  nivel_de_acuerdo?: number; // 0..1
  puntos_de_conflicto?: string[];
  resumen?: string;
  accion_recomendada?: string;
  posible_falso_positivo?: boolean;
}

export interface PanelAnalysis {
  lanes?: PanelLaneSnapshot[];
  moderator_text?: string;
  consensus?: PanelConsensus | null;
  generated_at?: string;
}
