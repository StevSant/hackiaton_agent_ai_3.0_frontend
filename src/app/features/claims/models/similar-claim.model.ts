/**
 * A narrative-similar prior claim, surfaced by `SimilarNarrativesCard`.
 * Wire-compatible with the backend `SimilarClaim` schema (schemas/risk.py).
 *
 * - `similarity` is cosine in [0, 1]. >= 0.85 fires the FS-13 rule.
 * - `claim_id` is clickable on the UI and routes to /claims/:claim_id.
 * - `snippet` is a short excerpt from the matched claim's narrative,
 *   typically the first ~150 chars of `descripcion`.
 */
export interface SimilarClaim {
  claim_id: string;
  similarity: number;
  snippet: string;
}
