import type { AgentStep } from './agent-step.model';
import type { ChartPayload } from './chart.model';
import type { ClaimTablePayload } from './claim-table.model';

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
  /**
   * True between the `chart_pending` SSE step and the matching `chart` event —
   * the UI renders a chart skeleton so the user knows a viz is coming while
   * the compose stream is still finishing.
   */
  chartPending?: boolean;
  /** Tabular data from `query_claims` tool results, when present. */
  table?: ClaimTablePayload;
}
