import type { Claim } from '@shared/models';

export interface RamoStat {
  key: string;
  total: number;
  susp: number;
  pct: number;
}

export function computeRamoStats(claims: readonly Claim[]): RamoStat[] {
  const buckets: Record<string, { total: number; susp: number }> = {};
  for (const c of claims) {
    if (!buckets[c.ramo]) buckets[c.ramo] = { total: 0, susp: 0 };
    buckets[c.ramo].total++;
    if (c.score >= 40) buckets[c.ramo].susp++;
  }
  return Object.entries(buckets)
    .map(([key, v]) => ({
      key,
      total: v.total,
      susp: v.susp,
      pct: Math.round((v.susp / v.total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);
}
