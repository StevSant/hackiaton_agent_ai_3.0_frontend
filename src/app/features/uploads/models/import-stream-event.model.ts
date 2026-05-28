/** Hand-authored mirror of backend ``app/schemas/imports/stream/__init__.py``.
 *  Field names are verbatim from the Python models — no camelCase mapping.
 */

export interface ImportStartedEvent {
  type: 'import.started';
  data: { total_rows: number; filename: string };
}

export interface ParseRowEvent {
  type: 'parse.row';
  data: { row_index: number; claim_id: string; ramo: string; cobertura: string };
}

export interface CaseStartedEvent {
  type: 'case.started';
  data: { claim_id: string; row_index: number };
}

export interface RuleHardFiredEvent {
  type: 'case.rule.hard.fired';
  data: {
    claim_id: string;
    code: string;
    tier_hint: 'rojo' | 'amarillo';
    evidence: Record<string, unknown>;
  };
}

export interface RuleScoringEvent {
  type: 'case.rule.scoring.evaluated';
  data: {
    claim_id: string;
    code: string;
    fired: boolean;
    puntos: number;
    why_not: string | null;
    evidence: Record<string, unknown>;
  };
}

export interface MLScoredEvent {
  type: 'case.ml.scored';
  data: { claim_id: string; probability: number; top_factors: string[] };
}

export interface AnomalyDetectedEvent {
  type: 'case.anomaly.detected';
  data: {
    claim_id: string;
    anomaly_score: number;
    nearest_normal_claim_id: string | null;
  };
}

export interface SimilarClaimRef {
  claim_id: string;
  similarity: number;
  snippet: string;
}

export interface SimilarityFoundEvent {
  type: 'case.similarity.found';
  data: { claim_id: string; matches: SimilarClaimRef[] };
}

export interface CaseCompletedEvent {
  type: 'case.completed';
  data: {
    claim_id: string;
    score: number;
    tier: 'verde' | 'amarillo' | 'rojo';
    persisted: boolean;
    rules_fired: number;
  };
}

export interface ImportCompletedEvent {
  type: 'import.completed';
  data: { imported: number; skipped: number; errors: string[] };
}

export interface ImportErrorEvent {
  type: 'import.error';
  data: { row_index: number | null; claim_id: string | null; message: string };
}

export type ImportStreamEvent =
  | ImportStartedEvent
  | ParseRowEvent
  | CaseStartedEvent
  | RuleHardFiredEvent
  | RuleScoringEvent
  | MLScoredEvent
  | AnomalyDetectedEvent
  | SimilarityFoundEvent
  | CaseCompletedEvent
  | ImportCompletedEvent
  | ImportErrorEvent;
