import type { Claim } from '@shared/models';
import type { RamoKey, RiskTier } from '@shared/utils';
import { normalizeRamoKey, RAMOS } from '@shared/utils';

import type { CityProviderRow, CitySignalRow, CityTierSlice } from './city-insights';

export interface RamoCityRow {
  city: string;
  total: number;
  sospechosos: number;
  pct: number;
}

export interface RamoInsightsSnapshot {
  key: RamoKey;
  label: string;
  icon: string;
  kpis: {
    totalClaims: number;
    alertClaims: number;
    suspicionPct: number;
    avgScore: number;
    exposedAmount: number;
    incompleteDocs: number;
  };
  tierBreakdown: CityTierSlice[];
  cityBreakdown: RamoCityRow[];
  topCases: Claim[];
  topProviders: CityProviderRow[];
  topSignals: CitySignalRow[];
  narrative: string;
}

const TIER_LABELS: Record<RiskTier, string> = {
  rojo: 'Alto',
  amarillo: 'Medio',
  verde: 'Bajo',
};

export function isRamoKey(raw: string): raw is RamoKey {
  return raw in RAMOS;
}

export function claimBelongsToRamo(claim: Claim, key: RamoKey): boolean {
  return normalizeRamoKey(claim.ramo) === key;
}

export function buildRamoInsights(
  key: RamoKey,
  allClaims: readonly Claim[],
): RamoInsightsSnapshot {
  const ramoClaims = allClaims.filter((claim) => claimBelongsToRamo(claim, key));
  const alertClaims = ramoClaims.filter((claim) => claim.nivel !== 'verde');

  const tierCounts: Record<RiskTier, number> = { rojo: 0, amarillo: 0, verde: 0 };
  for (const claim of ramoClaims) tierCounts[claim.nivel] += 1;

  const tierBreakdown: CityTierSlice[] = (['rojo', 'amarillo', 'verde'] as const).map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    count: tierCounts[tier],
    pct: ramoClaims.length ? Math.round((tierCounts[tier] / ramoClaims.length) * 100) : 0,
  }));

  const cityMap = new Map<string, { total: number; sospechosos: number }>();
  for (const claim of ramoClaims) {
    const city = claim.ciudad || claim.sucursal || 'Sin ciudad';
    const row = cityMap.get(city) ?? { total: 0, sospechosos: 0 };
    row.total += 1;
    if (claim.nivel !== 'verde') row.sospechosos += 1;
    cityMap.set(city, row);
  }

  const cityBreakdown: RamoCityRow[] = [...cityMap.entries()]
    .map(([city, stats]) => ({
      city,
      total: stats.total,
      sospechosos: stats.sospechosos,
      pct: stats.total ? Math.round((stats.sospechosos / stats.total) * 100) : 0,
    }))
    .sort((left, right) => right.sospechosos - left.sospechosos || right.total - left.total)
    .slice(0, 6);

  const providerMap = new Map<string, CityProviderRow>();
  for (const claim of ramoClaims) {
    if (!claim.proveedor || !claim.proveedor_id) continue;
    const row = providerMap.get(claim.proveedor_id) ?? {
      id: claim.proveedor_id,
      nombre: claim.proveedor,
      alertas: 0,
      casos: 0,
    };
    row.casos += 1;
    // List summaries ship alertas: [] (codes arrive with detail fetches), so
    // count suspicious claims — same definition as the hero "alertas" KPI.
    if (claim.nivel !== 'verde') row.alertas += 1;
    providerMap.set(claim.proveedor_id, row);
  }

  const topProviders = [...providerMap.values()]
    .sort((left, right) => right.alertas - left.alertas || right.casos - left.casos)
    .slice(0, 5);

  const signalMap = new Map<string, number>();
  for (const claim of ramoClaims) {
    for (const alert of claim.alertas) {
      signalMap.set(alert.code, (signalMap.get(alert.code) ?? 0) + 1);
    }
  }

  const topSignals: CitySignalRow[] = [...signalMap.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  const avgScore = ramoClaims.length
    ? Math.round(ramoClaims.reduce((sum, claim) => sum + claim.score, 0) / ramoClaims.length)
    : 0;
  const exposedAmount = alertClaims.reduce((sum, claim) => sum + claim.monto_reclamado, 0);
  const incompleteDocs = ramoClaims.filter((claim) =>
    claim.documentos.some((doc) => doc.falta),
  ).length;
  const suspicionPct = ramoClaims.length
    ? Math.round((alertClaims.length / ramoClaims.length) * 100)
    : 0;

  const meta = RAMOS[key];
  const narrative = buildNarrative({
    label: meta.label,
    totalClaims: ramoClaims.length,
    suspicionPct,
    topCity: cityBreakdown[0] ?? null,
    topSignal: topSignals[0]?.code ?? null,
  });

  return {
    key,
    label: meta.label,
    icon: meta.icon,
    kpis: {
      totalClaims: ramoClaims.length,
      alertClaims: alertClaims.length,
      suspicionPct,
      avgScore,
      exposedAmount,
      incompleteDocs,
    },
    tierBreakdown,
    cityBreakdown,
    topCases: [...ramoClaims].sort((left, right) => right.score - left.score).slice(0, 10),
    topProviders,
    topSignals,
    narrative,
  };
}

function buildNarrative(input: {
  label: string;
  totalClaims: number;
  suspicionPct: number;
  topCity: RamoCityRow | null;
  topSignal: string | null;
}): string {
  const parts: string[] = [];

  if (input.totalClaims === 0) {
    return `El ramo ${input.label.toLowerCase()} no registra siniestros en la ventana analizada.`;
  }

  parts.push(
    `El ramo ${input.label.toLowerCase()} concentra ${input.totalClaims} siniestros, con un ${input.suspicionPct}% que requiere revisión`,
  );

  if (input.topCity && input.topCity.sospechosos > 0) {
    parts.push(
      `La ciudad más expuesta es ${input.topCity.city} (${input.topCity.pct}% sospechoso)`,
    );
  }

  if (input.topSignal) {
    parts.push(`La señal más recurrente es ${input.topSignal}`);
  }

  return `${parts.join('. ')}. Los resultados son alertas para revisión humana, no conclusiones automáticas.`;
}
