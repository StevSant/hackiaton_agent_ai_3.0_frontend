import type { EChartsOption, SeriesOption } from 'echarts';

import type { CityInsightsSnapshot } from './city-insights';

const BRAND = '#6286B8';
const BRAND_GLOW = '#7A9CC9';
const BRAND_SOFT = 'rgba(98, 134, 184, 0.18)';
const TIER_RED = '#e5484d';
const TIER_RED_SOFT = 'rgba(229, 72, 77, 0.22)';
const TIER_YELLOW = '#f5a524';
const TIER_YELLOW_SOFT = 'rgba(245, 165, 36, 0.22)';
const TIER_GREEN = '#30a46c';
const TIER_GREEN_SOFT = 'rgba(48, 164, 108, 0.18)';
const INK = '#64748b';
const INK_DARK = '#0f172a';
const GRID = '#e2e8f0';
const BG_SOFT = '#f1f5f9';

const BASE_ANIMATION = {
  animationDuration: 900,
  animationEasing: 'cubicOut' as const,
};

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
            borderRadius: [5, 5, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: index === 0 ? '#1e3a5f' : BRAND_GLOW },
                { offset: 1, color: index === 0 ? BRAND : 'rgba(98, 134, 184, 0.35)' },
              ],
            },
            shadowBlur: index === 0 ? 10 : 4,
            shadowColor: 'rgba(98, 134, 184, 0.35)',
          },
        })),
        barWidth: '76%',
        barCategoryGap: '12%',
        label: {
          show: true,
          position: 'top',
          distance: 2,
          color: INK,
          fontSize: 10,
          fontFamily: 'ui-monospace, monospace',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 18,
            shadowColor: 'rgba(98, 134, 184, 0.55)',
          },
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
      width: 12,
      roundCap: true,
      itemStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: BRAND },
            { offset: 0.55, color: tone },
            { offset: 1, color: TIER_RED },
          ],
        },
        shadowBlur: 12,
        shadowColor: 'rgba(98, 134, 184, 0.3)',
      },
    },
    axisLine: {
      lineStyle: {
        width: 12,
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
  const tierSeries = (view: CityInsightsSnapshot) =>
    view.tierBreakdown
      .filter((slice) => slice.count > 0)
      .map((slice) => ({
        name: slice.label,
        value: slice.count,
        itemStyle: {
          color:
            slice.tier === 'rojo' ? TIER_RED : slice.tier === 'amarillo' ? TIER_YELLOW : TIER_GREEN,
        },
      }));

  return {
    ...BASE_ANIMATION,
    tooltip: { trigger: 'item', formatter: '{a}<br/>{b}: {c} ({d}%)' },
    legend: {
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: INK, fontSize: 10 },
    },
    series: [
      {
        name: primary.city,
        type: 'pie',
        roseType: 'area',
        center: ['28%', '46%'],
        radius: ['16%', '50%'],
        itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: tierSeries(primary),
      },
      {
        name: other.city,
        type: 'pie',
        roseType: 'area',
        center: ['72%', '46%'],
        radius: ['16%', '50%'],
        itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2, opacity: 0.92 },
        label: { show: false },
        data: tierSeries(other),
      },
    ],
    graphic: [
      {
        type: 'text',
        left: '22%',
        top: '82%',
        style: { text: primary.city, fill: INK_DARK, fontSize: 11, fontWeight: 600, align: 'center' },
      },
      {
        type: 'text',
        left: '66%',
        top: '82%',
        style: { text: other.city, fill: INK_DARK, fontSize: 11, fontWeight: 600, align: 'center' },
      },
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
  const data = view.tierBreakdown
    .filter((slice) => slice.count > 0)
    .map((slice) => ({
      name: slice.label,
      value: slice.count,
      itemStyle: {
        color:
          slice.tier === 'rojo' ? TIER_RED : slice.tier === 'amarillo' ? TIER_YELLOW : TIER_GREEN,
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.12)',
      },
    }));

  return {
    ...BASE_ANIMATION,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [
      {
        type: 'pie',
        radius: ['28%', '68%'],
        center: ['50%', '50%'],
        roseType: 'area',
        itemStyle: { borderRadius: 6, borderColor: '#ffffff', borderWidth: 2 },
        label: { color: INK_DARK, fontSize: 11 },
        data,
      },
    ],
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
        areaStyle: {
          opacity: 0.92,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: TIER_RED_SOFT },
              { offset: 1, color: 'rgba(229, 72, 77, 0.04)' },
            ],
          },
        },
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
        areaStyle: {
          opacity: 0.88,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: TIER_YELLOW_SOFT },
              { offset: 1, color: 'rgba(245, 165, 36, 0.04)' },
            ],
          },
        },
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
        areaStyle: {
          opacity: 0.85,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: TIER_GREEN_SOFT },
              { offset: 1, color: 'rgba(48, 164, 108, 0.04)' },
            ],
          },
        },
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
      areaStyle: {
        opacity: 0.92,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: TIER_RED_SOFT },
            { offset: 1, color: 'rgba(229, 72, 77, 0.04)' },
          ],
        },
      },
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
      areaStyle: {
        opacity: 0.88,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: TIER_YELLOW_SOFT },
            { offset: 1, color: 'rgba(245, 165, 36, 0.04)' },
          ],
        },
      },
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
      areaStyle: {
        opacity: 0.85,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: TIER_GREEN_SOFT },
            { offset: 1, color: 'rgba(48, 164, 108, 0.04)' },
          ],
        },
      },
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
        splitLine: { show: false },
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
        color: tier === 'rojo' ? TIER_RED : tier === 'amarillo' ? TIER_YELLOW : TIER_GREEN,
        opacity: 0.82,
        shadowBlur: 8,
        shadowColor: 'rgba(0,0,0,0.15)',
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
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 1,
              colorStops: [
                { offset: 0, color: BRAND },
                { offset: 1, color: index % 2 === 0 ? BRAND_GLOW : TIER_YELLOW },
              ],
            },
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
            itemStyle: {
              borderRadius: [8, 8, 0, 0],
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: TIER_RED },
                  { offset: 1, color: '#9b4dca' },
                ],
              },
            },
          },
          {
            value: bench.nationalSuspicionPct,
            itemStyle: {
              borderRadius: [8, 8, 0, 0],
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: BRAND_GLOW },
                  { offset: 1, color: BRAND },
                ],
              },
            },
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
            borderRadius: [0, 6, 6, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: BRAND },
                { offset: 1, color: index % 2 === 0 ? TIER_YELLOW : TIER_RED },
              ],
            },
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
