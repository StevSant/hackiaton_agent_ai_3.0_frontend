import { formatMoneyShort } from '@shared/utils';

import type { CityInsightsSnapshot } from './city-insights';

/** Payload sent to the LLM to explain one chart. `resumen` carries the real numbers as text. */
export interface ChartExplainContext {
  chartId: string;
  ciudad: string;
  chartKind: string;
  chartTitle: string;
  resumen: string;
}

interface ChartMeta {
  kind: string;
  title: string;
  detail: (view: CityInsightsSnapshot) => string;
}

function kpiHeader(view: CityInsightsSnapshot): string {
  const k = view.kpis;
  return (
    `Ciudad: ${view.city}${view.province ? ` (${view.province})` : ''}.\n` +
    (view.nationalRank ? `Ranking nacional: #${view.nationalRank} por alertas.\n` : '') +
    `Casos totales: ${k.totalClaims}. Casos con alerta: ${k.alertClaims} (${k.suspicionPct}% sospechoso).\n` +
    `Score promedio: ${k.avgScore}/100. Monto expuesto: ${formatMoneyShort(k.exposedAmount)}. ` +
    `Casos con documentación incompleta: ${k.incompleteDocs}.`
  );
}

function stackedDetail(view: CityInsightsSnapshot): string {
  const s = view.monthlyStacked;
  const rows = s.labels.map(
    (label, i) =>
      `- ${label}: ${s.rojo[i] ?? 0} alto, ${s.amarillo[i] ?? 0} medio, ${s.verde[i] ?? 0} bajo`,
  );
  return `Evolución mensual apilada por nivel de riesgo (últimos 6 meses):\n${rows.join('\n')}`;
}

function scatterDetail(view: CityInsightsSnapshot): string {
  const pts = view.scatterPoints;
  if (!pts.length) return 'Sin casos para graficar la dispersión monto vs. score.';

  const byTier = { rojo: 0, amarillo: 0, verde: 0 };
  for (const p of pts) byTier[p.tier] += 1;

  const amounts = pts.map((p) => p.amount);
  const scores = pts.map((p) => p.score);
  const minAmount = Math.min(...amounts);
  const maxAmount = Math.max(...amounts);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  // "Monto alto" = cuartil superior de montos (umbral derivado de los datos, no fijo).
  const sortedAmounts = [...amounts].sort((a, b) => a - b);
  const q3 = sortedAmounts[Math.floor((sortedAmounts.length - 1) * 0.75)] ?? maxAmount;
  const highAmount = pts.filter((p) => p.amount >= q3);
  const rest = pts.filter((p) => p.amount < q3);
  const highElevated = highAmount.filter((p) => p.tier !== 'verde').length;
  const avg = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0;
  const avgScoreHigh = avg(highAmount.map((p) => p.score));
  const avgScoreRest = avg(rest.map((p) => p.score));

  const top = [...pts]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((p) => `- ${p.id}: ${formatMoneyShort(p.amount)} reclamado, score ${p.score}/100 (${p.tier})`);

  return (
    `Cada punto es un siniestro — eje X: monto reclamado, eje Y: score, color: nivel ` +
    `(${pts.length} casos: ${byTier.rojo} alto, ${byTier.amarillo} medio, ${byTier.verde} bajo).\n` +
    `Rango de montos: ${formatMoneyShort(minAmount)}–${formatMoneyShort(maxAmount)}. ` +
    `Rango de scores: ${minScore}–${maxScore}/100.\n` +
    `Relación monto↔score: score promedio de los casos de monto alto (cuartil superior, ≥ ${formatMoneyShort(q3)}) ` +
    `= ${avgScoreHigh}/100 vs. ${avgScoreRest}/100 en el resto. ` +
    `${highAmount.length} casos de monto alto, de ellos ${highElevated} con score medio/alto.\n` +
    `Casos de mayor monto:\n${top.join('\n')}`
  );
}

function gaugeDetail(view: CityInsightsSnapshot): string {
  const tiers = view.tierBreakdown
    .map((t) => `${t.label} ${t.count} (${t.pct}%)`)
    .join(', ');
  return `Score de alerta promedio: ${view.kpis.avgScore}/100. Distribución por nivel: ${tiers}. (Bandas: 0-40 bajo, 41-75 medio, 76-100 alto.)`;
}

function roseDetail(view: CityInsightsSnapshot): string {
  const rows = view.tierBreakdown.map((t) => `- ${t.label}: ${t.count} casos (${t.pct}%)`);
  return `Semáforo de priorización por nivel de riesgo:\n${rows.join('\n')}`;
}

function ramoDetail(view: CityInsightsSnapshot): string {
  if (!view.ramoBreakdown.length) return 'Sin datos de ramos para esta ciudad.';
  const rows = view.ramoBreakdown
    .slice(0, 6)
    .map((r) => `- ${r.label}: ${r.pct}% sospechoso (${r.sospechosos}/${r.total} casos)`);
  return `Porcentaje de casos sospechosos por ramo:\n${rows.join('\n')}`;
}

function signalDetail(view: CityInsightsSnapshot): string {
  if (!view.topSignals.length) return 'Sin señales (reglas) activadas en esta ciudad.';
  const rows = view.topSignals.map((s) => `- ${s.code}: ${s.count} activaciones`);
  return `Reglas (señales FS/RF) más activadas en la ciudad:\n${rows.join('\n')}`;
}

function benchmarkDetail(view: CityInsightsSnapshot): string {
  const b = view.nationalBenchmark;
  return `Comparativa nacional: ${view.city} tiene ${b.citySuspicionPct}% de casos sospechosos vs. ${b.nationalSuspicionPct}% del promedio nacional.`;
}

function savingsDetail(view: CityInsightsSnapshot): string {
  const s = view.savings;
  const buckets = s.buckets
    .map(
      (b) =>
        `- ${b.nivel === 'rojo' ? 'Alto' : 'Medio'}: ${b.casos} casos, riesgo ${formatMoneyShort(b.riesgo)}, ahorro potencial ${formatMoneyShort(b.ahorro)}`,
    )
    .join('\n');
  return (
    `Ahorro potencial estimado al revisar casos con alerta (${s.casos} casos): ` +
    `riesgo total ${formatMoneyShort(s.totalRiesgo)}, ahorro potencial total ${formatMoneyShort(s.totalAhorro)}.\n${buckets}`
  );
}

const CHART_META: Record<string, ChartMeta> = {
  stacked_trend: { kind: 'stacked_area', title: 'Ola de alertas — 6 meses', detail: stackedDetail },
  exposure_scatter: { kind: 'scatter', title: 'Mapa de exposición', detail: scatterDetail },
  score_gauge: { kind: 'gauge', title: 'Score promedio', detail: gaugeDetail },
  tier_rose: { kind: 'rose', title: 'Semáforo', detail: roseDetail },
  ramo_polar: { kind: 'polar', title: 'Riesgo por ramo', detail: ramoDetail },
  signal_radar: { kind: 'radar', title: 'Radar de señales', detail: signalDetail },
  national_benchmark: { kind: 'bar', title: 'Comparativa nacional', detail: benchmarkDetail },
  savings: { kind: 'savings', title: 'Ahorro potencial', detail: savingsDetail },
};

export function buildChartExplainContext(
  chartId: string,
  view: CityInsightsSnapshot,
): ChartExplainContext {
  const meta = CHART_META[chartId] ?? CHART_META['tier_rose'];
  return {
    chartId,
    ciudad: view.city,
    chartKind: meta.kind,
    chartTitle: meta.title,
    // Chart-specific data first (the graphic), city KPIs second (reference) — the LLM is
    // instructed to read the graphic and mix in the city context, not just recite KPIs.
    resumen:
      `## Lo que muestra el gráfico\n${meta.detail(view)}\n\n` +
      `## Contexto de la ciudad (referencia)\n${kpiHeader(view)}`,
  };
}
