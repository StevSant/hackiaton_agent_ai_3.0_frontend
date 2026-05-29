import type { AgentVisual } from '@shared/ui/viz';
import type { AgentStep } from './agent-step.model';

export type AgentRole = 'user' | 'assistant';

/** A single row in a tabular tool result. Keys are Spanish field names from the backend. */
export type TableRow = Record<string, string | number | boolean | null>;

/** Payload from the `document` SSE event — agent-generated Word document content. */
export interface DocumentPayload {
  titulo: string;
  contenido_markdown: string;
}

/**
 * A document attached to a conversation. Multiple can coexist in one chat — each
 * generated/improved document becomes its own attachment, rendered as a
 * `chat-document-card` in the thread and openable in the right-side canvas panel.
 */
export interface ConversationDocument {
  id: string;
  titulo: string;
  contenidoMarkdown: string;
  createdAt: number;
  /** Source message id, when the document originated from an assistant turn. */
  messageId?: string;
  /** Set when this document is an AI-improved derivative of another attachment. */
  parentId?: string;
  /** Version index within a lineage (1 = original, 2 = first improvement, …). */
  version?: number;
}

export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  /** Transparency trail — agent nodes traversed and tools fired during this turn. */
  steps?: AgentStep[];
  /**
   * Tabular data from a list-shaped tool result (e.g. query_claims returns ClaimSummary[]).
   * Set by the store on `tool_result` events where the result is an array of objects.
   */
  tablePayload?: TableRow[] | null;
  /** Whether the table is currently shown (default true). Toggled by "Ocultar tabla". */
  tableAccepted?: boolean;
  /**
   * Agent-generated Word document payload (from `document` SSE event or restored from
   * transparency_metadata). When present, renders a `chat-document-canvas` artifact.
   */
  documentPayload?: DocumentPayload | null;
  /** Structured visuals streamed via `visual` SSE events or restored from `visual_payload`. */
  visuals?: AgentVisual[];
  /**
   * True between the `visual_pending` agent_step and the first `visual` event —
   * the UI renders a skeleton so the user knows a visualization is being computed.
   */
  visualsPending?: boolean;
}
