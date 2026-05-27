import type { AgentStep } from './agent-step.model';
import type { ChartPayload } from './chart.model';

export type AgentRole = 'user' | 'assistant';

export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  /** Transparency trail — agent nodes traversed and tools fired during this turn. */
  steps?: AgentStep[];
  /** Chartable data the agent offered for this answer, if any. */
  chart?: ChartPayload;
  /** Whether the user accepted to view the offered chart. */
  chartAccepted?: boolean;
}
