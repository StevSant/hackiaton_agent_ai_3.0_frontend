export type PanelTier = 'verde' | 'amarillo' | 'rojo';
export type PanelConfianza = 'alta' | 'media' | 'baja';

export interface PanelRosterEntry { agent_id: string; display_name: string; lens: string; }

export interface SpecialistVerdict {
  nivel: PanelTier;
  dictamen: string;
  puntos_clave: string[];
  confianza: PanelConfianza;
  citas: string[];
}
export interface SpecialistRebuttal {
  ajuste: string;
  nivel_actualizado: PanelTier;
  cambia_postura: boolean;
}
export interface PanelConsensus {
  nivel_final: PanelTier;
  nivel_de_acuerdo: number;          // 0..1
  puntos_de_conflicto: string[];
  resumen: string;
  accion_recomendada: string;
  posible_falso_positivo: boolean;
}

export interface PanelStartEvent { type: 'panel_start'; data: { claim_id: string; roster: PanelRosterEntry[] }; }
export interface AgentTokenEvent { type: 'agent_token'; data: { agent_id: string; round: 1 | 2; delta: string }; }
export interface AgentVerdictEvent { type: 'agent_verdict'; data: { agent_id: string; verdict: SpecialistVerdict }; }
export interface AgentRebuttalEvent { type: 'agent_rebuttal'; data: { agent_id: string; rebuttal: SpecialistRebuttal }; }
export interface ModeratorTokenEvent { type: 'moderator_token'; data: { delta: string }; }
export interface ConsensusEvent { type: 'consensus'; data: { consensus: PanelConsensus }; }
export interface PanelErrorEvent { type: 'error'; data: { agent_id?: string | null; code: string; message: string }; }
export interface PanelDoneEvent { type: 'done'; data: { claim_id: string }; }

export type PanelStreamEvent =
  | PanelStartEvent | AgentTokenEvent | AgentVerdictEvent | AgentRebuttalEvent
  | ModeratorTokenEvent | ConsensusEvent | PanelErrorEvent | PanelDoneEvent;
