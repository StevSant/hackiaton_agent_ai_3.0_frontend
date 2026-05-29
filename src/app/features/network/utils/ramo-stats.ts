import type { Claim } from '@shared/models';
import { ramoLabel } from '@shared/utils';

export interface RamoStat {
  key: string;
  total: number;
  susp: number;
  pct: number;
}

export function computeRamoStats(claims: readonly Claim[]): RamoStat[] {
  // Bucket by the normalized display label so casing/accent variants of the same
  // ramo ("Vehículos" vs "vehiculos") collapse into one row instead of two.
  const buckets: Record<string, { total: number; susp: number }> = {};
  for (const c of claims) {
    const key = ramoLabel(c.ramo);
    if (!buckets[key]) buckets[key] = { total: 0, susp: 0 };
    buckets[key].total++;
    if (c.score >= 40) buckets[key].susp++;
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
