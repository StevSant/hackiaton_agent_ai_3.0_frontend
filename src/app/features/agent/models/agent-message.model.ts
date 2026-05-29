import type { AgentStep } from './agent-step.model';
import type { ChartPayload } from './chart.model';

export type AgentRole = 'user' | 'assistant';

/** A single row in a tabular tool result. Keys are Spanish field names from the backend. */
export type TableRow = Record<string, string | number | boolean | null>;

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
  /**
   * Tabular data from a list-shaped tool result (e.g. query_claims returns ClaimSummary[]).
   * Set by the store on `tool_result` events where the result is an array of objects.
   */
  tablePayload?: TableRow[] | null;
}
