export type AgentStepKind = 'agent_step' | 'tool_call' | 'tool_result';

export interface AgentStep {
  kind: AgentStepKind;
  /** Label rendered in the transparency card (node name, tool name). */
  label: string;
  /** Optional secondary text (e.g. tool args summary or result excerpt). */
  detail?: string;
  /** Stable id used to pair `tool_call` with its later `tool_result`. */
  callId?: string;
}
