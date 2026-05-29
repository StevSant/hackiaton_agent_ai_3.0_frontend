import type { EChartsOption, SeriesOption } from 'echarts';

import type { CityInsightsSnapshot } from './city-insights';
import {
  INSIGHTS_CHART as C,
  brandBarColor,
  tierFill,
  type AlertTier,
} from './insights-chart-theme';

const BRAND = C.brand;
const BRAND_GLOW = C.brandLight;
const BRAND_SOFT = C.brandSoft;
const TIER_RED = C.tierRed;
const TIER_RED_SOFT = C.tierRedSoft;
const TIER_YELLOW = C.tierYellow;
const TIER_YELLOW_SOFT = C.tierYellowSoft;
const TIER_GREEN = C.tierGreen;
const TIER_GREEN_SOFT = C.tierGreenSoft;
const INK = C.ink;
const INK_DARK = C.inkDark;
const GRID = C.grid;
const BG_SOFT = C.bgSoft;

const BASE_ANIMATION = {
  animationDuration: 900,
  animationEasing: 'cubicOut' as const,
};

function buildTierDonutSlices(view: CityInsightsSnapshot) {
  const tierOrder: Array<{ tier: AlertTier; label: string }> = [
    { tier: 'rojo', label: 'Alto' },
    { tier: 'amarillo', label: 'Medio' },
    { tier: 'verde', label: 'Bajo' },
  ];

  return tierOrder
    .map(({ tier, label }) => {
      const slice = view.tierBreakdown.find((row) => row.tier === tier);
      const count = slice?.count ?? 0;
      if (count <= 0) return null;
      return {
        name: label,
        value: count,
        itemStyle: { color: tierFill(tier) },
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

const TIER_DONUT_RADIUS: [string, string] = ['38%', '58%'];
const TIER_DONUT_COMPARE_RADIUS: [string, string] = ['22%', '34%'];
const COMPARE_DONUT_PRIMARY_CENTER: [string, string] = ['25%', '38%'];
const COMPARE_DONUT_OTHER_CENTER: [string, string] = ['75%', '38%'];

function tierDonutSeries(
  name: string,
  center: [string, string],
  data: ReturnType<typeof buildTierDonutSlices>,
  radius: [string, string] = TIER_DONUT_RADIUS,
  showCenterTitle = false,
): SeriesOption {
  return {
    name,
    type: 'pie',
    center,
    radius,
    avoidLabelOverlap: true,
    itemStyle: { borderRadius: 4, borderColor: C.surface, borderWidth: 2 },
    label: showCenterTitle
      ? {
          show: true,
          position: 'center',
          formatter: name,
          color: INK_DARK,
          fontSize: 10,
          fontWeight: 600,
        }
      : { show: false },
    labelLine: { show: false },
    data,
  };
}

function cardGrid(show: boolean) {
  return {
    left: 48,
    right: 20,
    top: 36,
    bottom: 28,
    containLabel: false,
    show,
  };
}

export function buildCityHeadToHeadOption(
  primary: CityInsightsSnapshot,
  other: CityInsightsSnapshot,
): EChartsOption {
  const categories = ['Alertas', '% sospechoso', 'Score', 'Casos'];
  return {
    ...BASE_ANIMATION,
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: INK, fontSize: 11 },
    },
    grid: { left: 12, right: 12, top: 36, bottom: 12, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: INK, fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: GRID, type: 'dashed' } },
      axisLabel: { color: INK, fontSize: 10 },
    },
    series: [
      {
        name: primary.city,
        type: 'bar',
        barGap: '20%',
        barWidth: '28%',
        data: [
          primary.kpis.alertClaims,
          primary.kpis.suspicionPct,
          primary.kpis.avgScore,
          primary.kpis.totalClaims,
        ],
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: BRAND,
        },
      },
      {
        name: other.city,
        type: 'bar',
        barWidth: '28%',
        data: [
          other.kpis.alertClaims,
          other.kpis.suspicionPct,
          other.kpis.avgScore,
          other.kpis.totalClaims,
        ],
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: TIER_RED,
        },
      },
    ],
  };
}

export function buildRegionalFraudBarOption(
  points: readonly { region: string; value: number; label: string }[],
): EChartsOption {
  const peak = Math.max(...points.map((point) => point.value), 1);

  return {
    ...BASE_ANIMATION,
    animationDuration: 1100,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const row = Array.isArray(params) ? params[0] : params;
        if (!row || typeof row !== 'object' || !('name' in row) || !('value' in row)) return '';
        return `${String(row.name)}<br/><b>${String(row.value)}</b> alertas activas`;
      },
    },
    grid: { left: 2, right: 2, top: 20, bottom: 18, containLabel: false },
    xAxis: {
      type: 'category',
      data: points.map((point) => point.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: INK, fontSize: 9, interval: 0, margin: 6 },
    },
    yAxis: {
      type: 'value',
      show: false,
      max: Math.ceil(peak * 1.06),
    },
    series: [
      {
        type: 'bar',
        data: points.map((point, index) => ({
          name: point.region,
          value: point.value,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: brandBarColor(index, points.length),
          },
        })),
        barWidth: '72%',
        barCategoryGap: '14%',
        label: {
          show: true,
          position: 'top',
          distance: 2,
          color: C.ink2,
          fontSize: 10,
          fontFamily: C.fontMono,
        },
        emphasis: {
          itemStyle: { color: C.brandInk },
        },
      },
    ],
  };
}

function buildSingleScoreGaugeSeries(
  score: number,
  center: [string, string],
  radius: string,
  detailFontSize: number,
): SeriesOption {
  const tone = score >= 76 ? TIER_RED : score >= 41 ? TIER_YELLOW : TIER_GREEN;

  return {
    type: 'gauge',
    startAngle: 210,
    endAngle: -30,
    min: 0,
    max: 100,
    splitNumber: 5,
    radius,
    center,
    progress: {
      show: true,
      width: 10,
      roundCap: true,
      itemStyle: { color: tone },
    },
    axisLine: {
      lineStyle: {
        width: 10,
        color: [[1, BG_SOFT]],
      },
    },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    pointer: { show: false },
    anchor: { show: false },
    detail: {
      valueAnimation: true,
      fontSize: detailFontSize,
      fontWeight: 700,
      color: INK_DARK,
      offsetCenter: [0, '4%'],
      formatter: '{value}',
    },
    title: { show: false },
    data: [{ value: score, name: 'Score' }],
  };
}

export function buildCityScoreGaugeOption(view: CityInsightsSnapshot): EChartsOption {
  return {
    ...BASE_ANIMATION,
    series: [buildSingleScoreGaugeSeries(view.kpis.avgScore, ['50%', '56%'], '86%', 32)],
  };
}

export function buildCityTierCompareRoseOption(
  primary: CityInsightsSnapshot,
  other: CityInsightsSnapshot,
): EChartsOption {
  return {
    ...BASE_ANIMATION,
    tooltip: { trigger: 'item', formatter: '{a}<br/>{b}: {c} ({d}%)' },
    legend: {
      bottom: 4,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: INK, fontSize: 10 },
      data: ['Alto', 'Medio', 'Bajo'],
    },
    series: [
      tierDonutSeries(
        primary.city,
        COMPARE_DONUT_PRIMARY_CENTER,
        buildTierDonutSlices(primary),
        TIER_DONUT_COMPARE_RADIUS,
        true,
      ),
      tierDonutSeries(
        other.city,
        COMPARE_DONUT_OTHER_CENTER,
        buildTierDonutSlices(other),
        TIER_DONUT_COMPARE_RADIUS,
        true,
      ),
    ],
  };
}

export function buildCityRamoCompareOption(
  primary: CityInsightsSnapshot,
  other: CityInsightsSnapshot,
): EChartsOption {
  const ramoKeys = new Map<string, string>();
  for (const row of [...primary.ramoBreakdown, ...other.ramoBreakdown]) {
    ramoKeys.set(row.ramo, row.label);
  }

  const ordered = [...ramoKeys.entries()]
    .map(([ramo, label]) => {
      const primaryPct = primary.ramoBreakdown.find((row) => row.ramo === ramo)?.pct ?? 0;
      const otherPct = other.ramoBreakdown.find((row) => row.ramo === ramo)?.pct ?? 0;
      return { ramo, label, primaryPct, otherPct, max: Math.max(primaryPct, otherPct) };
    })
    .sort((left, right) => right.max - left.max)
    .slice(0, 6);

  return {
    ...BASE_ANIMATION,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      top: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: INK, fontSize: 10 },
    },
    grid: { left: 4, right: 16, top: 32, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: INK, fontSize: 10 },
      splitLine: { lineStyle: { color: GRID, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: ordered.map((row) => row.label),
      axisLabel: { color: INK_DARK, fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: primary.city,
        type: 'bar',
        barGap: '18%',
        barWidth: 10,
        data: ordered.map((row) => row.primaryPct),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: BRAND },
        label: { show: false },
      },
      {
        name: other.city,
        type: 'bar',
        barWidth: 10,
        data: ordered.map((row) => row.otherPct),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: TIER_RED },
        label: { show: false },
      },
    ],
  };
}

export function buildCityTierRoseOption(view: CityInsightsSnapshot): EChartsOption {
  return {
    ...BASE_ANIMATION,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [tierDonutSeries(view.city, ['50%', '50%'], buildTierDonutSlices(view))],
  };
}

export function buildCityStackedTrendOption(view: CityInsightsSnapshot): EChartsOption {
  const labels = view.monthlyStacked.labels;
  return {
    ...BASE_ANIMATION,
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: INK, fontSize: 11 },
    },
    grid: cardGrid(true),
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: GRID } },
      axisLabel: { color: INK, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: GRID, type: 'dashed' } },
      axisLabel: { color: INK, fontSize: 10 },
    },
    series: [
      {
        name: 'Alto',
        type: 'line',
        stack: 'total',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 0 },
        areaStyle: { color: TIER_RED_SOFT, opacity: 1 },
        itemStyle: { color: TIER_RED },
        data: view.monthlyStacked.rojo,
      },
      {
        name: 'Medio',
        type: 'line',
        stack: 'total',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 0 },
        areaStyle: { color: TIER_YELLOW_SOFT, opacity: 1 },
        itemStyle: { color: TIER_YELLOW },
        data: view.monthlyStacked.amarillo,
      },
      {
        name: 'Bajo',
        type: 'line',
        stack: 'total',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 0 },
        areaStyle: { color: TIER_GREEN_SOFT, opacity: 1 },
        itemStyle: { color: TIER_GREEN },
        data: view.monthlyStacked.verde,
      },
    ],
  };
}

function monthlyStackedPeak(stacked: CityInsightsSnapshot['monthlyStacked']): number {
  return Math.max(
    ...stacked.labels.map(
      (_, index) => stacked.rojo[index] + stacked.amarillo[index] + stacked.verde[index],
    ),
    1,
  );
}

function stackedTrendSeries(
  view: CityInsightsSnapshot,
  stackId: string,
  xAxisIndex: number,
  yAxisIndex: number,
): SeriesOption[] {
  return [
    {
      name: 'Alto',
      type: 'line',
      stack: stackId,
      xAxisIndex,
      yAxisIndex,
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { width: 0 },
      areaStyle: { color: TIER_RED_SOFT, opacity: 1 },
      itemStyle: { color: TIER_RED },
      data: view.monthlyStacked.rojo,
    },
    {
      name: 'Medio',
      type: 'line',
      stack: stackId,
      xAxisIndex,
      yAxisIndex,
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { width: 0 },
      areaStyle: { color: TIER_YELLOW_SOFT, opacity: 1 },
      itemStyle: { color: TIER_YELLOW },
      data: view.monthlyStacked.amarillo,
    },
    {
      name: 'Bajo',
      type: 'line',
      stack: stackId,
      xAxisIndex,
      yAxisIndex,
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { width: 0 },
      areaStyle: { color: TIER_GREEN_SOFT, opacity: 1 },
      itemStyle: { color: TIER_GREEN },
      data: view.monthlyStacked.verde,
    },
  ];
}

export function buildCityStackedTrendCompareOption(
  primary: CityInsightsSnapshot,
  other: CityInsightsSnapshot,
): EChartsOption {
  const labels = primary.monthlyStacked.labels;
  const yMax = Math.ceil(Math.max(monthlyStackedPeak(primary.monthlyStacked), monthlyStackedPeak(other.monthlyStacked)) * 1.12);

  return {
    ...BASE_ANIMATION,
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: INK, fontSize: 11 },
      data: ['Alto', 'Medio', 'Bajo'],
    },
    grid: [
      { left: 48, right: '54%', top: 40, bottom: 44 },
      { left: '54%', right: 20, top: 40, bottom: 44 },
    ],
    xAxis: [
      {
        type: 'category',
        gridIndex: 0,
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: GRID } },
        axisLabel: { color: INK, fontSize: 10 },
      },
      {
        type: 'category',
        gridIndex: 1,
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: GRID } },
        axisLabel: { color: INK, fontSize: 10 },
      },
    ],
    yAxis: [
      {
        type: 'value',
        gridIndex: 0,
        max: yMax,
        splitLine: { lineStyle: { color: GRID, type: 'dashed' } },
        axisLabel: { color: INK, fontSize: 10 },
      },
      {
        type: 'value',
        gridIndex: 1,
        max: yMax,
        splitLine: { lineStyle: { color: GRID, type: 'dashed' } },
        axisLabel: { color: INK, fontSize: 10 },
      },
    ],
    series: [
      ...stackedTrendSeries(primary, 'primary', 0, 0),
      ...stackedTrendSeries(other, 'other', 1, 1),
    ],
    graphic: [
      {
        type: 'text',
        left: '26%',
        bottom: 8,
        style: { text: primary.city, fill: INK_DARK, fontSize: 12, fontWeight: 700, align: 'center' },
      },
      {
        type: 'text',
        left: '74%',
        bottom: 8,
        style: { text: other.city, fill: INK_DARK, fontSize: 12, fontWeight: 700, align: 'center' },
      },
    ],
  };
}

export function buildCitySignalRadarOption(view: CityInsightsSnapshot): EChartsOption {
  const radar = view.signalRadar;
  if (!radar.indicators.length) {
    return { title: { text: 'Sin señales', left: 'center', top: 'center', textStyle: { color: INK } } };
  }

  return {
    ...BASE_ANIMATION,
    tooltip: {},
    radar: {
      center: ['50%', '54%'],
      radius: '62%',
      indicator: radar.indicators,
      axisName: { color: INK, fontSize: 10 },
      splitLine: { lineStyle: { color: GRID } },
      splitArea: {
        areaStyle: {
          color: [BRAND_SOFT, 'rgba(241, 245, 249, 0.6)'],
        },
      },
    },
    series: [
      {
        type: 'radar',
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: BRAND_GLOW },
        areaStyle: {
          color: {
            type: 'radial',
            x: 0.5,
            y: 0.5,
            r: 0.8,
            colorStops: [
              { offset: 0, color: 'rgba(98, 134, 184, 0.45)' },
              { offset: 1, color: 'rgba(98, 134, 184, 0.05)' },
            ],
          },
        },
        itemStyle: { color: BRAND },
        data: [{ value: radar.values, name: 'Frecuencia' }],
      },
    ],
  };
}

export function buildCityExposureScatterOption(view: CityInsightsSnapshot): EChartsOption {
  const groups = {
    rojo: view.scatterPoints.filter((point) => point.tier === 'rojo'),
    amarillo: view.scatterPoints.filter((point) => point.tier === 'amarillo'),
    verde: view.scatterPoints.filter((point) => point.tier === 'verde'),
  };

  return {
    ...BASE_ANIMATION,
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        if (!params || typeof params !== 'object' || !('data' in params)) return '';
        const data = (params as { data?: { name?: string; value?: [number, number] } }).data;
        if (!data?.value) return '';
        return `${data.name ?? 'Caso'}<br/>Monto: $${data.value[0].toLocaleString('es-EC')}<br/>Score: ${data.value[1]}`;
      },
    },
    grid: cardGrid(true),
    xAxis: {
      name: 'Monto (USD)',
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { color: INK, fontSize: 10 },
      splitLine: { lineStyle: { color: GRID, type: 'dashed' } },
      axisLabel: {
        color: INK,
        fontSize: 10,
        formatter: (value: number) => `$${Math.round(value / 1000)}k`,
      },
    },
    yAxis: {
      name: 'Score',
      max: 100,
      splitLine: { lineStyle: { color: GRID, type: 'dashed' } },
      axisLabel: { color: INK, fontSize: 10 },
    },
    series: (['rojo', 'amarillo', 'verde'] as const).map((tier) => ({
      name: tier === 'rojo' ? 'Alto' : tier === 'amarillo' ? 'Medio' : 'Bajo',
      type: 'scatter',
      symbolSize: (data: number[]) => 8 + data[1] / 18,
      itemStyle: {
        color: tierFill(tier),
        opacity: 0.78,
      },
      data: groups[tier].map((point) => ({
        name: point.id,
        value: [point.amount, point.score],
      })),
    })),
  };
}

export function buildCityRamoPolarOption(view: CityInsightsSnapshot): EChartsOption {
  const rows = view.ramoBreakdown.slice(0, 6);
  return {
    ...BASE_ANIMATION,
    tooltip: { trigger: 'axis' },
    polar: { radius: [16, '78%'] },
    angleAxis: {
      type: 'category',
      data: rows.map((row) => row.label),
      axisLabel: { color: INK, fontSize: 10, interval: 0 },
    },
    radiusAxis: {
      max: 100,
      axisLabel: { color: INK, fontSize: 9 },
      splitLine: { lineStyle: { color: GRID } },
    },
    series: [
      {
        type: 'bar',
        coordinateSystem: 'polar',
        roundCap: true,
        data: rows.map((row, index) => ({
          value: row.pct,
          itemStyle: {
            color: brandBarColor(index, rows.length),
          },
        })),
      },
    ],
  };
}

export function buildCityBenchmarkOption(view: CityInsightsSnapshot): EChartsOption {
  const bench = view.nationalBenchmark;
  return {
    ...BASE_ANIMATION,
    tooltip: { trigger: 'axis' },
    grid: { left: 12, right: 12, top: 28, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Esta ciudad', 'Promedio nacional'],
      axisLabel: { color: INK, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: Math.max(bench.citySuspicionPct, bench.nationalSuspicionPct, 10) + 8,
      axisLabel: { formatter: '{value}%', color: INK, fontSize: 10 },
      splitLine: { lineStyle: { color: GRID, type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        barWidth: '42%',
        data: [
          {
            value: bench.citySuspicionPct,
            itemStyle: { borderRadius: [6, 6, 0, 0], color: C.tierRed },
          },
          {
            value: bench.nationalSuspicionPct,
            itemStyle: { borderRadius: [6, 6, 0, 0], color: C.brand },
          },
        ],
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          color: INK_DARK,
          fontSize: 12,
          fontWeight: 600,
        },
      },
    ],
  };
}

export function buildCityRamoBarOption(view: CityInsightsSnapshot): EChartsOption {
  const rows = view.ramoBreakdown.slice(0, 6);
  return {
    ...BASE_ANIMATION,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 4, right: 28, top: 4, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: INK, fontSize: 10 },
      splitLine: { lineStyle: { color: GRID, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: rows.map((row) => row.label),
      axisLabel: { color: INK_DARK, fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: rows.map((row, index) => ({
          value: row.pct,
          itemStyle: {
            borderRadius: [0, 5, 5, 0],
            color: brandBarColor(index, rows.length),
          },
        })),
        barWidth: 14,
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          color: INK_DARK,
          fontSize: 11,
          fontWeight: 600,
        },
      },
    ],
  };
}

export interface SavingsBucketChartPoint {
  nivel: string;
  label: string;
  casos: number;
  ahorro: number;
  riesgo: number;
  color: string;
}

function formatSavingsAxis(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

export function buildSavingsBarOption(
  buckets: readonly SavingsBucketChartPoint[],
): EChartsOption {
  const active = buckets.filter((bucket) => bucket.ahorro > 0 || bucket.casos > 0);
  const peak = Math.max(...active.map((bucket) => bucket.ahorro), 1);

  return {
    ...BASE_ANIMATION,
    animationDuration: 1000,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const row = Array.isArray(params) ? params[0] : params;
        if (!row || typeof row !== 'object' || !('dataIndex' in row)) return '';
        const bucket = active[Number(row.dataIndex)];
        if (!bucket) return '';
        return [
          `<b>${bucket.label}</b>`,
          `${bucket.casos} casos`,
          `Ahorro: ${formatSavingsAxis(bucket.ahorro)}`,
          `En riesgo: ${formatSavingsAxis(bucket.riesgo)}`,
        ].join('<br/>');
      },
    },
    grid: { left: 4, right: 52, top: 8, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      show: false,
      max: Math.ceil(peak * 1.08),
    },
    yAxis: {
      type: 'category',
      data: active.map((bucket) => bucket.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: INK, fontSize: 11, margin: 8 },
    },
    series: [
      {
        type: 'bar',
        data: active.map((bucket) => ({
          value: bucket.ahorro,
          itemStyle: {
            borderRadius: [0, 5, 5, 0],
            color: tierFill(bucket.nivel as AlertTier),
          },
        })),
        barWidth: 14,
        label: {
          show: true,
          position: 'right',
          formatter: (params: unknown) => {
            if (!params || typeof params !== 'object' || !('value' in params)) return '';
            const value = Number(params.value);
            return Number.isFinite(value) ? formatSavingsAxis(value) : '';
          },
          color: INK_DARK,
          fontSize: 10,
          fontWeight: 600,
        },
      },
    ],
  };
}
