import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import type { ECharts, EChartsOption } from 'echarts';

import { Icon } from '@shared/ui/icon';
import { claimHref, handleEntityLinkClick, isClaimRef } from '@shared/utils';
import { loadECharts } from './echarts-loader';
import type { ChartVisual, VizChartType } from './visual.model';
import {
  VIZ_PALETTE as PALETTE,
  AXIS_TEXT,
  TIER_COLOR,
  TOOLTIP_BG,
  TOOLTIP_BORDER,
} from './viz-theme';

const TYPE_ICON: Record<VizChartType, string> = {
  bar: 'bar_chart',
  horizontal_bar: 'align_horizontal_left',
  line: 'show_chart',
  pie: 'pie_chart',
  doughnut: 'donut_large',
  scatter: 'scatter_plot',
  stacked_tier: 'stacked_bar_chart',
  dotplot: 'scatter_plot',
};

const TYPE_LABEL: Record<VizChartType, string> = {
  bar: 'Barras',
  horizontal_bar: 'Barras horizontales',
  line: 'Línea',
  pie: 'Torta',
  doughnut: 'Dona',
  scatter: 'Dispersión',
  stacked_tier: 'Composición por nivel',
  dotplot: 'Distribución',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Best entity reference for a data point: a claim id found in the point's
 * meta (timeline charts label points by DATE, the claim id lives in meta),
 * then the aligned citation, then the raw label (provider/asegurado names
 * are resolved by the page).
 */
function resolveCaseRef(payload: ChartVisual['data'], idx: number): string {
  if (idx < 0) return '';
  const meta = payload.meta?.[idx];
  if (meta) {
    const fromMeta = Object.values(meta).find((v) => isClaimRef(v));
    if (fromMeta) return fromMeta;
  }
  const cite = payload.citations?.[idx];
  if (cite && isClaimRef(cite)) return cite;
  return payload.labels[idx] ?? '';
}

function buildTooltipHtml(
  label: string,
  meta: Record<string, string> | undefined,
  seriesRows: { name: string; value: string; color: string }[],
  caseRef = label,
): string {
  const header = `<div style="font-weight:600;font-size:12.5px;color:#e2e8f0;margin-bottom:6px">${escapeHtml(
    label,
  )}</div>`;

  const seriesHtml = seriesRows
    .map(
      (r) =>
        `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;margin-top:2px">` +
        `<span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${r.color}"></span>` +
        `<span style="flex:1">${escapeHtml(r.name)}</span>` +
        `<span style="font-weight:600;color:#f8fafc">${escapeHtml(r.value)}</span>` +
        `</div>`,
    )
    .join('');

  const metaEntries = meta ? Object.entries(meta) : [];
  const metaHtml = metaEntries.length
    ? `<div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(148,163,184,0.25)">` +
      metaEntries
        .map(
          ([k, v]) =>
            `<div style="display:flex;gap:10px;font-size:11.5px;line-height:1.5;color:#cbd5e1">` +
            `<span style="flex:0 0 auto;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;font-size:10.5px;min-width:96px">${escapeHtml(
              k,
            )}</span>` +
            `<span style="flex:1;color:#f1f5f9;font-weight:500">${escapeHtml(v)}</span>` +
            `</div>`,
        )
        .join('') +
      `</div>`
    : '';

  const hint = isClaimRef(caseRef)
    ? `<div style="margin-top:8px;font-size:10.5px;color:#a5b4fc">Clic para abrir el caso · Ctrl+clic en nueva pestaña</div>`
    : '';

  return `<div style="min-width:200px;max-width:320px">${header}${seriesHtml}${metaHtml}${hint}</div>`;
}

function buildOption(payload: ChartVisual['data'], type: VizChartType): EChartsOption {
  if (type === 'stacked_tier') {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: TOOLTIP_BG,
        borderColor: TOOLTIP_BORDER,
        borderWidth: 1,
        textStyle: { color: '#e2e8f0' },
      },
      legend: { top: 0, textStyle: { color: AXIS_TEXT } },
      grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: AXIS_TEXT },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.18)' } },
      },
      yAxis: { type: 'category', data: payload.labels, axisLabel: { color: AXIS_TEXT }, inverse: true },
      series: payload.series.map((s) => ({
        name: s.name,
        type: 'bar',
        stack: 'tier',
        data: s.data,
        itemStyle: {
          color: TIER_COLOR[s.name.toLowerCase() as 'verde' | 'amarillo' | 'rojo'] ?? undefined,
        },
        barMaxWidth: 28,
      })),
    } as EChartsOption;
  }

  if (type === 'dotplot') {
    const first = payload.series[0];
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: TOOLTIP_BG,
        borderColor: TOOLTIP_BORDER,
        borderWidth: 1,
        textStyle: { color: '#e2e8f0' },
        formatter: (p: unknown) => {
          const pt = p as { value: [number, number, number]; color: string; dataIndex: number };
          const idx = pt.dataIndex ?? -1;
          const label = idx >= 0 ? payload.labels[idx] : '';
          const meta = idx >= 0 ? payload.meta?.[idx] : undefined;
          return buildTooltipHtml(
            label,
            meta,
            [{ name: first?.name ?? '', value: String(pt.value?.[0] ?? ''), color: pt.color }],
            resolveCaseRef(payload, idx),
          );
        },
      },
      grid: { left: 8, right: 16, top: 12, bottom: 24, containLabel: true },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: payload.unit ?? undefined,
        nameTextStyle: { color: AXIS_TEXT },
        axisLabel: { color: AXIS_TEXT },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.18)' } },
      },
      yAxis: { type: 'category', data: [''], axisLine: { show: false }, axisTick: { show: false } },
      series: [
        {
          type: 'scatter',
          symbolSize: 13,
          data: (first?.data ?? []).map((v, idx) => [v, 0, idx]),
          itemStyle: {
            color: (params: unknown) => {
              const value = (params as { value: number[] }).value[0];
              if (value <= 40) return TIER_COLOR.verde;
              if (value <= 75) return TIER_COLOR.amarillo;
              return TIER_COLOR.rojo;
            },
            opacity: 0.85,
            borderColor: 'rgba(2,6,23,0.6)',
            borderWidth: 1.5,
          },
        },
      ],
    } as EChartsOption;
  }

  if (type === 'pie' || type === 'doughnut') {
    const first = payload.series[0];
    return {
      color: [...PALETTE],
      tooltip: {
        trigger: 'item',
        backgroundColor: TOOLTIP_BG,
        borderColor: TOOLTIP_BORDER,
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: '#e2e8f0' },
        extraCssText: 'box-shadow: 0 10px 24px rgba(15,23,42,0.45); border-radius: 10px;',
        formatter: (params: unknown) => {
          const p = params as {
            name: string;
            value: number;
            color: string;
            seriesName: string;
            dataIndex: number;
          };
          const idx = p.dataIndex ?? payload.labels.indexOf(p.name);
          const meta = idx >= 0 ? payload.meta?.[idx] : undefined;
          return buildTooltipHtml(
            p.name,
            meta,
            [{ name: p.seriesName, value: String(p.value), color: p.color }],
            resolveCaseRef(payload, idx),
          );
        },
      },
      legend: { type: 'scroll', bottom: 0, textStyle: { color: AXIS_TEXT } },
      series: [
        {
          type: 'pie',
          radius: type === 'doughnut' ? ['45%', '70%'] : '68%',
          center: ['50%', '46%'],
          data: payload.labels.map((label, i) => ({ name: label, value: first?.data[i] ?? 0 })),
          label: { color: AXIS_TEXT },
        },
      ],
    } as EChartsOption;
  }

  const categoryAxis = {
    type: 'category',
    data: payload.labels,
    axisLabel: { color: AXIS_TEXT, hideOverlap: true },
    axisLine: { lineStyle: { color: AXIS_TEXT } },
  };
  const valueAxis = {
    type: 'value',
    name: payload.unit ?? undefined,
    nameTextStyle: { color: AXIS_TEXT },
    axisLabel: { color: AXIS_TEXT },
    splitLine: { lineStyle: { color: 'rgba(148,163,184,0.18)' } },
  };
  const legend =
    payload.series.length > 1 ? { top: 0, textStyle: { color: AXIS_TEXT } } : undefined;
  const series = payload.series.map((s, i) => {
    const color = PALETTE[i % PALETTE.length];
    if (type === 'scatter') {
      return {
        name: s.name,
        type: 'scatter',
        data: s.data.map((v, idx) => [idx, v]),
        symbolSize: 14,
        itemStyle: {
          color,
          opacity: 0.85,
          borderColor: 'rgba(15,23,42,0.5)',
          borderWidth: 1,
        },
        emphasis: { scale: 1.25 },
      };
    }
    return {
      name: s.name,
      type: type === 'line' ? 'line' : 'bar',
      data: s.data,
      smooth: type === 'line',
      barMaxWidth: 28,
      itemStyle: { color, borderRadius: type === 'line' ? 0 : 4 },
    };
  });

  const scatterXAxis = {
    type: 'category',
    data: payload.labels,
    axisLabel: { color: AXIS_TEXT, hideOverlap: true, rotate: payload.labels.length > 6 ? 30 : 0 },
    axisLine: { lineStyle: { color: AXIS_TEXT } },
    boundaryGap: true,
  };

  return {
    color: [...PALETTE],
    tooltip: {
      trigger: type === 'scatter' ? 'item' : 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: TOOLTIP_BG,
      borderColor: TOOLTIP_BORDER,
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: '#e2e8f0' },
      extraCssText: 'box-shadow: 0 10px 24px rgba(15,23,42,0.45); border-radius: 10px;',
      formatter: (params: unknown) => {
        if (type === 'scatter') {
          const p = params as {
            seriesName: string;
            value: [number, number];
            color: string;
            dataIndex: number;
          };
          const idx = p.dataIndex ?? p.value?.[0] ?? -1;
          const label = idx >= 0 ? payload.labels[idx] : '';
          const meta = idx >= 0 ? payload.meta?.[idx] : undefined;
          return buildTooltipHtml(
            label,
            meta,
            [{ name: p.seriesName, value: String(p.value?.[1] ?? ''), color: p.color }],
            resolveCaseRef(payload, idx),
          );
        }
        const arr = Array.isArray(params) ? params : [params];
        if (arr.length === 0) return '';
        const first = arr[0] as { axisValue?: string; name?: string; dataIndex?: number };
        const label = String(first.axisValue ?? first.name ?? '');
        // dataIndex over labels.indexOf — timeline labels (dates) can repeat,
        // and indexOf would pin every duplicate to the first point's meta.
        const idx = typeof first.dataIndex === 'number' ? first.dataIndex : payload.labels.indexOf(label);
        const meta = idx >= 0 ? payload.meta?.[idx] : undefined;
        const rows = (arr as { seriesName: string; value: number; color: string }[]).map((p) => ({
          name: p.seriesName,
          value: String(p.value),
          color: p.color,
        }));
        return buildTooltipHtml(label, meta, rows, resolveCaseRef(payload, idx));
      },
    },
    legend,
    grid: { left: 8, right: 16, top: legend ? 28 : 12, bottom: 8, containLabel: true },
    xAxis: type === 'horizontal_bar' ? valueAxis : type === 'scatter' ? scatterXAxis : categoryAxis,
    yAxis: type === 'horizontal_bar' ? { ...categoryAxis, inverse: true } : valueAxis,
    series,
  } as EChartsOption;
}

/** Renders a ChartVisual['data'] with ECharts and lets the user switch chart types. */
@Component({
  selector: 'viz-chart',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-line bg-surface p-3 mt-1 w-full max-w-[640px]">
      <div class="flex items-center justify-between gap-2 mb-2">
        <span class="text-[12.5px] font-semibold text-ink">{{ payload().title }}</span>
        @if (payload().available_types.length > 1) {
          <div class="flex gap-0.5">
            @for (t of payload().available_types; track t) {
              <button
                type="button"
                class="w-6 h-6 grid place-items-center rounded text-ink-3 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                [class.bg-brand-soft]="t === selectedType()"
                [class.text-brand-ink]="t === selectedType()"
                [attr.aria-label]="label(t)"
                [attr.aria-pressed]="t === selectedType()"
                (click)="selectedType.set(t)"
              >
                <ui-icon [name]="icon(t)" [size]="15" />
              </button>
            }
          </div>
        }
      </div>
      <div #host class="w-full h-[280px]"></div>
      @if (citations().length > 0) {
        <div class="flex flex-wrap gap-1 mt-2">
          @for (c of citations(); track c) {
            <a
              [href]="hrefFor(c)"
              class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-brand-soft text-brand-ink no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              (click)="onCitationClick($event, c)"
            >
              {{ c }}
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class VizChart implements OnDestroy {
  readonly payload = input.required<ChartVisual['data']>();
  readonly openCase = output<string>();
  /** Emits the chart as a PNG data URL whenever it (re)renders. */
  readonly chartRendered = output<string>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  protected readonly selectedType = linkedSignal<VizChartType>(() => this.payload().chart_type);
  protected readonly citations = computed(() => this.payload().citations ?? []);
  private readonly option = computed(() => buildOption(this.payload(), this.selectedType()));

  private chart: ECharts | null = null;
  private observer: ResizeObserver | null = null;
  private setOptionRaf: number | null = null;

  constructor() {
    afterNextRender(async () => {
      const echarts = await loadECharts();
      this.chart = echarts.init(this.host().nativeElement, undefined, { renderer: 'canvas' });
      this.chart.setOption(this.option());
      this.chart.on('finished', () => this.emitChartImage());
      this.chart.on('click', (params) => {
        if (params.componentType !== 'series') return;
        const payload = this.payload();
        let idx = typeof params.dataIndex === 'number' ? params.dataIndex : -1;
        if (idx < 0 && params.name) idx = payload.labels.indexOf(String(params.name));
        // Timeline points are labeled by date — resolveCaseRef digs the claim
        // id out of the point's meta/citations so the click actually routes.
        const ref = resolveCaseRef(payload, idx) || String(params.name ?? '');
        if (!ref) return;
        const raw = (params.event?.event ?? null) as MouseEvent | null;
        if (raw && (raw.ctrlKey || raw.metaKey) && isClaimRef(ref)) {
          window.open(claimHref(ref), '_blank', 'noopener');
          return;
        }
        this.openCase.emit(ref);
      });
      this.observer = new ResizeObserver(() => {
        requestAnimationFrame(() => this.chart?.resize());
      });
      this.observer.observe(this.host().nativeElement);
    });
    effect(() => {
      const option = this.option();
      if (this.setOptionRaf !== null) cancelAnimationFrame(this.setOptionRaf);
      this.setOptionRaf = requestAnimationFrame(() => {
        this.setOptionRaf = null;
        this.chart?.setOption(option, { notMerge: true, lazyUpdate: true });
      });
    });
  }

  private emitChartImage(): void {
    if (!this.chart) return;
    const dataUrl = this.chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
    if (dataUrl) this.chartRendered.emit(dataUrl);
  }

  ngOnDestroy(): void {
    if (this.setOptionRaf !== null) cancelAnimationFrame(this.setOptionRaf);
    this.observer?.disconnect();
    this.chart?.dispose();
  }

  protected hrefFor(citation: string): string {
    return isClaimRef(citation) ? claimHref(citation) : '#';
  }

  protected onCitationClick(event: MouseEvent, citation: string): void {
    handleEntityLinkClick(event, () => this.openCase.emit(citation));
  }

  protected icon(type: VizChartType): string {
    return TYPE_ICON[type];
  }

  protected label(type: VizChartType): string {
    return TYPE_LABEL[type];
  }
}
