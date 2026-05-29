import type { RiskTier } from '@shared/utils';

/** Per-agent live status during an in-flight panel run (claim-detail card). */
export type PanelLiveStatus = 'pendiente' | 'pensando' | 'voto' | 'fallo';

export interface PanelLiveAgent {
  agentId: string;
  displayName: string;
  lens: string;
  status: PanelLiveStatus;
  nivel?: RiskTier;
}
