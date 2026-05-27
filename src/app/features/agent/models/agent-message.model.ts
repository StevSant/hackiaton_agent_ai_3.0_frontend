import type { AgentStep } from './agent-step.model';

export type AgentRole = 'user' | 'assistant';

export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  /** Transparency trail — agent nodes traversed and tools fired during this turn. */
  steps?: AgentStep[];
}
