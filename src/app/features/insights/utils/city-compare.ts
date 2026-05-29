import type { CityInsightsSnapshot } from './city-insights';

export interface CityCompareMetric {
  key: string;
  label: string;
  primaryValue: number;
  otherValue: number;
  primaryLabel: string;
  otherLabel: string;
  deltaLabel: string;
  /** True when a higher value means more exposure (alertas, score, etc.). */
  higherIsWorse: boolean;
  primaryLeads: boolean;
}

export function buildCityCompareMetrics(
  primary: CityInsightsSnapshot,
  other: CityInsightsSnapshot,
): CityCompareMetric[] {
  return [
    metric(
      'alertas',
      'Alertas activas',
      primary.kpis.alertClaims,
      other.kpis.alertClaims,
      String(primary.kpis.alertClaims),
      String(other.kpis.alertClaims),
      true,
    ),
    metric(
      'sospechoso',
      '% sospechoso',
      primary.kpis.suspicionPct,
      other.kpis.suspicionPct,
      `${primary.kpis.suspicionPct}%`,
      `${other.kpis.suspicionPct}%`,
      true,
    ),
    metric(
      'score',
      'Score promedio',
      primary.kpis.avgScore,
      other.kpis.avgScore,
      String(primary.kpis.avgScore),
      String(other.kpis.avgScore),
      true,
    ),
    metric(
      'casos',
      'Casos totales',
      primary.kpis.totalClaims,
      other.kpis.totalClaims,
      String(primary.kpis.totalClaims),
      String(other.kpis.totalClaims),
      false,
    ),
    metric(
      'monto',
      'Monto expuesto',
      primary.kpis.exposedAmount,
      other.kpis.exposedAmount,
      formatCompactMoney(primary.kpis.exposedAmount),
      formatCompactMoney(other.kpis.exposedAmount),
      true,
    ),
  ];
}

function metric(
  key: string,
  label: string,
  primaryValue: number,
  otherValue: number,
  primaryLabel: string,
  otherLabel: string,
  higherIsWorse: boolean,
): CityCompareMetric {
  const diff = primaryValue - otherValue;
  const primaryLeads = diff > 0;
  const absDiff = Math.abs(diff);
  let deltaLabel = 'Empate';

  if (absDiff > 0) {
    const leader = primaryLeads ? 'Esta ciudad' : 'Comparada';
    const unit =
      label.includes('%') ? ' pp' : label.includes('Monto') ? '' : label.includes('Score') ? ' pts' : '';
    const formattedDiff =
      label.includes('Monto') ? formatCompactMoney(absDiff) : label.includes('%') ? String(absDiff) : String(absDiff);
    deltaLabel = `${leader} +${formattedDiff}${unit}`;
  }

  return {
    key,
    label,
    primaryValue,
    otherValue,
    primaryLabel,
    otherLabel,
    deltaLabel,
    higherIsWorse,
    primaryLeads,
  };
}

function formatCompactMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value}`;
}

export function compareTierRows(
  primary: CityInsightsSnapshot,
  other: CityInsightsSnapshot,
): { label: string; primaryPct: number; otherPct: number; tier: string }[] {
  const tiers = ['rojo', 'amarillo', 'verde'] as const;
  const labels = { rojo: 'Alto', amarillo: 'Medio', verde: 'Bajo' };
  return tiers.map((tier) => ({
    tier,
    label: labels[tier],
    primaryPct: primary.tierBreakdown.find((row) => row.tier === tier)?.pct ?? 0,
    otherPct: other.tierBreakdown.find((row) => row.tier === tier)?.pct ?? 0,
  }));
}
