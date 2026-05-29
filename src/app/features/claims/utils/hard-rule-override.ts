import { riskTier, type RiskTier } from '@shared/utils';
import type { Claim, ClaimAlert } from '@shared/models';

// Critical hard rules that escalate the tier regardless of the additive score
// (root CLAUDE.md §2.5 / backend aggregator.py). RF-01..04 force rojo;
// RF-05..07 floor at amarillo. Mirrors the backend's override sets.
const ROJO_HARD = new Set(['RF-01', 'RF-02', 'RF-03', 'RF-04']);
const AMARILLO_HARD = new Set(['RF-05', 'RF-06', 'RF-07']);

const TIER_ORDER: Record<RiskTier, number> = { verde: 0, amarillo: 1, rojo: 2 };

// Accepts 'RF01' or 'RF-01' and normalizes to the catalog form 'RF-01'.
function normalizeCode(code: string): string {
  const m = /^([A-Za-z]+)-?(\d+)$/.exec(code.trim());
  return m ? `${m[1].toUpperCase()}-${m[2].padStart(2, '0')}` : code.toUpperCase();
}

export interface HardRuleOverride {
  active: boolean;
  rules: ClaimAlert[];
}

/**
 * Detects when a claim's displayed tier was elevated by a critical hard rule
 * rather than by its additive score — e.g. a 16/100 claim shown as rojo
 * because RF-01 (Perdida Total por Robo) fired. Returns the responsible rules
 * so the UI can explain the apparent score/tier mismatch.
 */
export function hardRuleOverride(c: Claim): HardRuleOverride {
  // Only an override if the shown tier outranks what the score alone implies.
  if (TIER_ORDER[c.nivel] <= TIER_ORDER[riskTier(c.score)]) {
    return { active: false, rules: [] };
  }
  const responsible = c.nivel === 'rojo' ? ROJO_HARD : AMARILLO_HARD;
  const rules = c.alertas.filter((a) => responsible.has(normalizeCode(a.code)));
  return { active: rules.length > 0, rules };
}
