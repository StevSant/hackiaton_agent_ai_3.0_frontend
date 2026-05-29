import { PanelConfianza, PanelTier, SpecialistRebuttal, SpecialistVerdict } from './panel-stream-event.model';

export interface SpecialistLane {
  agentId: string;
  displayName: string;
  lens: string;
  narracion: string;               // accumulated round-1 tokens
  verdict: SpecialistVerdict | null;
  rebuttalNarracion: string;       // accumulated round-2 tokens
  rebuttal: SpecialistRebuttal | null;
  failed: boolean;
}
