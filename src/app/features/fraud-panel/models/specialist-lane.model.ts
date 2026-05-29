import { PanelConfianza, PanelTier, SpecialistRebuttal, SpecialistVerdict } from '@shared/models/panel-stream-event.model';

export interface SpecialistLane {
  agentId: string;
  displayName: string;
  lens: string;
  narracion: string;               // accumulated round-1 tokens
  verdict: SpecialistVerdict | null;
  rebuttalNarracion: string;       // accumulated round-2 tokens
  rebuttal: SpecialistRebuttal | null;
  failed: boolean;                 // R1 failed — no real opinion for this lane
  r2Failed: boolean;               // R2 failed — keep R1, only the réplica is missing
}
