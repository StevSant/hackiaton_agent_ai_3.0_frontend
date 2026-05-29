import type { ClaimSummaryDto } from '@core/api/clients/claim.dto';
import type { ClaimTablePayload } from '../models/claim-table.model';

function isClaimSummaryRow(row: unknown): row is ClaimSummaryDto {
  if (!row || typeof row !== 'object') return false;
  const record = row as Record<string, unknown>;
  return (
    typeof record['id'] === 'string' &&
    typeof record['score'] === 'number' &&
    typeof record['nivel'] === 'string'
  );
}

function tableTitleForMode(mode: string | undefined, count: number): string {
  switch (mode) {
    case 'top_risk':
      return `Top ${count} siniestros por riesgo`;
    case 'near_policy_start':
      return `${count} siniestros cerca del inicio de póliza`;
    case 'recommend_review':
      return `${count} casos recomendados para revisión`;
    default:
      return `${count} siniestros`;
  }
}

/** Parses a `query_claims` tool result into tabular rows when structured. */
export function parseClaimTableFromToolResult(result: unknown): ClaimTablePayload | null {
  if (!result || typeof result !== 'object') return null;
  const payload = result as Record<string, unknown>;
  const claims = payload['claims'];
  if (!Array.isArray(claims) || claims.length === 0) return null;
  if (!claims.every(isClaimSummaryRow)) return null;

  const mode = typeof payload['mode'] === 'string' ? payload['mode'] : undefined;
  return {
    title: tableTitleForMode(mode, claims.length),
    mode,
    rows: claims,
  };
}

interface StoredToolCall {
  tool: string;
  result: unknown;
}

/** Reconstructs a table from persisted transparency metadata on history load. */
export function extractClaimTableFromToolCalls(
  toolCalls: readonly StoredToolCall[] | undefined,
): ClaimTablePayload | null {
  if (!toolCalls?.length) return null;
  for (let index = toolCalls.length - 1; index >= 0; index -= 1) {
    const call = toolCalls[index];
    if (call.tool !== 'query_claims') continue;
    const table = parseClaimTableFromToolResult(call.result);
    if (table) return table;
  }
  return null;
}
