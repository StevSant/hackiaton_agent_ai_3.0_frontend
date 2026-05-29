import type { RiskTier } from './risk-tier';

const TIER_RANK: Record<RiskTier, number> = { rojo: 0, amarillo: 1, verde: 2 };

/**
 * Triage priority comparator: highest-risk tier first, then highest score
 * within a tier. Ensures a hard-rule 🔴 with a low additive score (e.g. a
 * "Pérdida Total por Robo" case at 24/100) never sorts below a 🟡/🟢 — the
 * traffic light, not the raw number, drives where an analyst looks first.
 */
export function byTriagePriority(
  a: { nivel: RiskTier; score: number },
  b: { nivel: RiskTier; score: number },
): number {
  const tier = TIER_RANK[a.nivel] - TIER_RANK[b.nivel];
  return tier !== 0 ? tier : b.score - a.score;
}
