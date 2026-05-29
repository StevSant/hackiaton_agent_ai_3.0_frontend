import type { Claim } from '@shared/models';
import type { RiskTier } from '@shared/utils';
import { ramoLabel } from '@shared/utils';

import { ECUADOR_CITY_COORDS, normalizeToCity } from './ecuador-city-coords';

export interface CityTierSlice {
  tier: RiskTier;
  label: string;
  count: number;
  pct: number;
}

export interface CityRamoRow {
  ramo: string;
  label: string;
  total: number;
  sospechosos: number;
  pct: number;
}

export interface CityProviderRow {
  id: string;
  nombre: string;
  alertas: number;
  casos: number;
}

export interface CitySignalRow {
  code: string;
  count: number;
}

export interface CityMonthBar {
  label: string;
  count: number;
  heightPct: number;
}

export interface CityMonthlyStacked {
  labels: string[];
  verde: number[];
  amarillo: number[];
  rojo: number[];
}

export interface CityScatterPoint {
  id: string;
  amount: number;
  score: number;
  tier: RiskTier;
}

export interface CitySignalRadar {
  indicators: { name: string; max: number }[];
  values: number[];
}

export interface CityNationalBenchmark {
  citySuspicionPct: number;
  nationalSuspicionPct: number;
}

export interface CityInsightsSnapshot {
  city: string;
  province: string | null;
  nationalRank: number | null;
  nationalAlertCount: number | null;
  kpis: {
    totalClaims: number;
    alertClaims: number;
    suspicionPct: number;
    avgScore: number;
    exposedAmount: number;
    incompleteDocs: number;
  };
  tierBreakdown: CityTierSlice[];
  ramoBreakdown: CityRamoRow[];
  topCases: Claim[];
  topProviders: CityProviderRow[];
  topSignals: CitySignalRow[];
  monthlyActivity: CityMonthBar[];
  monthlyStacked: CityMonthlyStacked;
  scatterPoints: CityScatterPoint[];
  signalRadar: CitySignalRadar;
  nationalBenchmark: CityNationalBenchmark;
  narrative: string;
}

const TIER_LABELS: Record<RiskTier, string> = {
  rojo: 'Alto',
  amarillo: 'Medio',
  verde: 'Bajo',
};

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function citySlugEncode(city: string): string {
  return encodeURIComponent(city);
}

export function citySlugDecode(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function claimBelongsToCity(claim: Claim, city: string): boolean {
  const fromCiudad = normalizeToCity(claim.ciudad) ?? claim.ciudad;
  const fromSucursal = normalizeToCity(claim.sucursal);
  return fromCiudad === city || fromSucursal === city;
}

export function buildCityInsights(
  city: string,
  allClaims: readonly Claim[],
  regionalFraud: readonly { region: string; value: number }[],
): CityInsightsSnapshot {
  const cityClaims = allClaims.filter((claim) => claimBelongsToCity(claim, city));
  const alertClaims = cityClaims.filter((claim) => claim.nivel !== 'verde');
  const coords = ECUADOR_CITY_COORDS[city];

  const rankIndex = regionalFraud.findIndex((point) => point.region === city);
  const nationalRank = rankIndex >= 0 ? rankIndex + 1 : null;
  const nationalAlertCount = rankIndex >= 0 ? regionalFraud[rankIndex].value : null;

  const tierCounts: Record<RiskTier, number> = { rojo: 0, amarillo: 0, verde: 0 };
  for (const claim of cityClaims) tierCounts[claim.nivel] += 1;

  const tierBreakdown: CityTierSlice[] = (['rojo', 'amarillo', 'verde'] as const).map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    count: tierCounts[tier],
    pct: cityClaims.length ? Math.round((tierCounts[tier] / cityClaims.length) * 100) : 0,
  }));

  const ramoMap = new Map<string, { total: number; sospechosos: number }>();
  for (const claim of cityClaims) {
    const row = ramoMap.get(claim.ramo) ?? { total: 0, sospechosos: 0 };
    row.total += 1;
    if (claim.nivel !== 'verde') row.sospechosos += 1;
    ramoMap.set(claim.ramo, row);
  }

  const ramoBreakdown: CityRamoRow[] = [...ramoMap.entries()]
    .map(([ramo, stats]) => ({
      ramo,
      label: ramoLabel(ramo),
      total: stats.total,
      sospechosos: stats.sospechosos,
      pct: stats.total ? Math.round((stats.sospechosos / stats.total) * 100) : 0,
    }))
    .sort((left, right) => right.pct - left.pct || right.total - left.total);

  const providerMap = new Map<string, CityProviderRow>();
  for (const claim of cityClaims) {
    if (!claim.proveedor || !claim.proveedor_id) continue;
    const row = providerMap.get(claim.proveedor_id) ?? {
      id: claim.proveedor_id,
      nombre: claim.proveedor,
      alertas: 0,
      casos: 0,
    };
    row.casos += 1;
    row.alertas += claim.alertas.length;
    providerMap.set(claim.proveedor_id, row);
  }

  const topProviders = [...providerMap.values()]
    .sort((left, right) => right.alertas - left.alertas || right.casos - left.casos)
    .slice(0, 5);

  const signalMap = new Map<string, number>();
  for (const claim of cityClaims) {
    for (const alert of claim.alertas) {
      signalMap.set(alert.code, (signalMap.get(alert.code) ?? 0) + 1);
    }
  }

  const topSignals: CitySignalRow[] = [...signalMap.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  const monthlyActivity = buildMonthlyActivity(cityClaims);
  const monthlyStacked = buildMonthlyStacked(cityClaims);
  const scatterPoints = cityClaims.map((claim) => ({
    id: claim.id,
    amount: claim.monto_reclamado,
    score: claim.score,
    tier: claim.nivel,
  }));
  const signalRadar = buildSignalRadar(topSignals);
  const nationalBenchmark = buildNationalBenchmark(cityClaims, allClaims);
  const avgScore = cityClaims.length
    ? Math.round(cityClaims.reduce((sum, claim) => sum + claim.score, 0) / cityClaims.length)
    : 0;
  const exposedAmount = alertClaims.reduce((sum, claim) => sum + claim.monto_reclamado, 0);
  const incompleteDocs = cityClaims.filter((claim) =>
    claim.documentos.some((doc) => doc.falta),
  ).length;

  const suspicionPct = cityClaims.length
    ? Math.round((alertClaims.length / cityClaims.length) * 100)
    : 0;

  const topRamo = ramoBreakdown[0];
  const narrative = buildNarrative({
    city,
    province: coords?.province ?? null,
    nationalRank,
    nationalAlertCount,
    suspicionPct,
    topRamoLabel: topRamo?.label ?? null,
    topRamoPct: topRamo?.pct ?? 0,
    topSignal: topSignals[0]?.code ?? null,
  });

  return {
    city,
    province: coords?.province ?? null,
    nationalRank,
    nationalAlertCount,
    kpis: {
      totalClaims: cityClaims.length,
      alertClaims: alertClaims.length,
      suspicionPct,
      avgScore,
      exposedAmount,
      incompleteDocs,
    },
    tierBreakdown,
    ramoBreakdown,
    topCases: [...cityClaims].sort((left, right) => right.score - left.score).slice(0, 10),
    topProviders,
    topSignals,
    monthlyActivity,
    monthlyStacked,
    scatterPoints,
    signalRadar,
    nationalBenchmark,
    narrative,
  };
}

function buildMonthlyActivity(claims: readonly Claim[]): CityMonthBar[] {
  const now = new Date();
  const buckets: { key: string; label: string; count: number }[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, label: MONTH_LABELS[date.getMonth()], count: 0 });
  }

  for (const claim of claims) {
    const raw = claim.fecha_ocurrencia || claim.fecha_reporte;
    if (!raw) continue;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.find((entry) => entry.key === key);
    if (bucket) bucket.count += 1;
  }

  const max = Math.max(...buckets.map((entry) => entry.count), 1);
  return buckets.map((entry) => ({
    label: entry.label,
    count: entry.count,
    heightPct: (entry.count / max) * 100,
  }));
}

function buildMonthlyStacked(claims: readonly Claim[]): CityMonthlyStacked {
  const now = new Date();
  const buckets: {
    key: string;
    label: string;
    verde: number;
    amarillo: number;
    rojo: number;
  }[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, label: MONTH_LABELS[date.getMonth()], verde: 0, amarillo: 0, rojo: 0 });
  }

  for (const claim of claims) {
    const raw = claim.fecha_ocurrencia || claim.fecha_reporte;
    if (!raw) continue;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.find((entry) => entry.key === key);
    if (!bucket) continue;
    bucket[claim.nivel] += 1;
  }

  return {
    labels: buckets.map((entry) => entry.label),
    verde: buckets.map((entry) => entry.verde),
    amarillo: buckets.map((entry) => entry.amarillo),
    rojo: buckets.map((entry) => entry.rojo),
  };
}

function buildSignalRadar(signals: readonly CitySignalRow[]): CitySignalRadar {
  if (!signals.length) return { indicators: [], values: [] };
  const max = Math.max(...signals.map((signal) => signal.count), 1);
  return {
    indicators: signals.map((signal) => ({ name: signal.code, max })),
    values: signals.map((signal) => signal.count),
  };
}

function buildNationalBenchmark(
  cityClaims: readonly Claim[],
  allClaims: readonly Claim[],
): CityNationalBenchmark {
  const citySuspicionPct = cityClaims.length
    ? Math.round((cityClaims.filter((claim) => claim.nivel !== 'verde').length / cityClaims.length) * 100)
    : 0;
  const nationalSuspicionPct = allClaims.length
    ? Math.round((allClaims.filter((claim) => claim.nivel !== 'verde').length / allClaims.length) * 100)
    : 0;
  return { citySuspicionPct, nationalSuspicionPct };
}

function buildNarrative(input: {
  city: string;
  province: string | null;
  nationalRank: number | null;
  nationalAlertCount: number | null;
  suspicionPct: number;
  topRamoLabel: string | null;
  topRamoPct: number;
  topSignal: string | null;
}): string {
  const parts: string[] = [];

  if (input.province) {
    parts.push(`${input.city} (${input.province})`);
  } else {
    parts.push(input.city);
  }

  if (input.nationalRank && input.nationalAlertCount) {
    parts.push(
      `ocupa el puesto #${input.nationalRank} nacional con ${input.nationalAlertCount} alertas activas en los últimos 12 meses`,
    );
  } else if (input.suspicionPct > 0) {
    parts.push(`concentra un ${input.suspicionPct}% de casos que requieren revisión`);
  } else {
    parts.push('no registra alertas activas en la ventana analizada');
  }

  if (input.topRamoLabel && input.topRamoPct > 0) {
    parts.push(
      `El ramo más expuesto es ${input.topRamoLabel.toLowerCase()} (${input.topRamoPct}% sospechoso)`,
    );
  }

  if (input.topSignal) {
    parts.push(`La señal más recurrente es ${input.topSignal}`);
  }

  return `${parts.join('. ')}. Los resultados son alertas para revisión humana, no conclusiones automáticas.`;
}
