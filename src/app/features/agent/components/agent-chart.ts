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
import type { ChartPayload, ChartType } from '../models';

const PALETTE = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#ef4444',
  '#84cc16',
];

const TYPE_ICON: Record<ChartType, string> = {
  bar: 'bar_chart',
  horizontal_bar: 'align_horizontal_left',
  line: 'show_chart',
  pie: 'pie_chart',
  doughnut: 'donut_large',
  scatter: 'scatter_plot',
};

const TYPE_LABEL: Record<ChartType, string> = {
  bar: 'Barras',
  horizontal_bar: 'Barras horizontales',
  line: 'Línea',
  pie: 'Torta',
  doughnut: 'Dona',
  scatter: 'Dispersión',
};

const AXIS_TEXT = '#94a3b8'; // slate-400 — readable on light and dark surfaces

const CLAIM_ID_RE = /^(SIN|IMP|CL)-/i;

// Loaded once on first chart render and reused across instances — ECharts is
// ~1.2 MB gzipped so we keep it out of the initial app bundle.
type EChartsModule = typeof import('echarts');
let echartsModulePromise: Promise<EChartsModule> | null = null;

function loadECharts(): Promise<EChartsModule> {
  if (echartsModulePromise === null) {
    echartsModulePromise = import('echarts');
  }
  return echartsModulePromise;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isClaimId(label: string): boolean {
  return CLAIM_ID_RE.test(label);
}

function buildTooltipHtml(
  label: string,
  meta: Record<string, string> | undefined,
  seriesRows: { name: string; value: string; color: string }[],
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

  const hint = isClaimId(label)
    ? `<div style="margin-top:8px;font-size:10.5px;color:#a5b4fc">Clic para abrir el caso</div>`
    : '';

  return `<div style="min-width:200px;max-width:320px">${header}${seriesHtml}${metaHtml}${hint}</div>`;
}

function buildOption(payload: ChartPayload, type: ChartType): EChartsOption {
  if (type === 'pie' || type === 'doughnut') {
    const first = payload.series[0];
    return {
      color: PALETTE,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15,23,42,0.96)',
        borderColor: 'rgba(99,102,241,0.45)',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: '#e2e8f0' },
        extraCssText: 'box-shadow: 0 10px 24px rgba(15,23,42,0.45); border-radius: 10px;',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; color: string; seriesName: string };
          const idx = payload.labels.indexOf(p.name);
          const meta = idx >= 0 ? payload.meta?.[idx] : undefined;
          return buildTooltipHtml(p.name, meta, [
            { name: p.seriesName, value: String(p.value), color: p.color },
          ]);
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
    color: PALETTE,
    tooltip: {
      trigger: type === 'scatter' ? 'item' : 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15,23,42,0.96)',
      borderColor: 'rgba(99,102,241,0.45)',
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
          };
          const idx = p.value?.[0] ?? -1;
          const label = idx >= 0 ? payload.labels[idx] : '';
          const meta = idx >= 0 ? payload.meta?.[idx] : undefined;
          return buildTooltipHtml(label, meta, [
            { name: p.seriesName, value: String(p.value?.[1] ?? ''), color: p.color },
          ]);
        }
        const arr = Array.isArray(params) ? params : [params];
        if (arr.length === 0) return '';
        const first = arr[0] as { axisValue?: string; name?: string };
        const label = String(first.axisValue ?? first.name ?? '');
        const idx = payload.labels.indexOf(label);
        const meta = idx >= 0 ? payload.meta?.[idx] : undefined;
        const rows = (arr as { seriesName: string; value: number; color: string }[]).map((p) => ({
          name: p.seriesName,
          value: String(p.value),
          color: p.color,
        }));
        return buildTooltipHtml(label, meta, rows);
      },
    },
    legend,
    grid: { left: 8, right: 16, top: legend ? 28 : 12, bottom: 8, containLabel: true },
    xAxis: type === 'horizontal_bar' ? valueAxis : type === 'scatter' ? scatterXAxis : categoryAxis,
    yAxis: type === 'horizontal_bar' ? { ...categoryAxis, inverse: true } : valueAxis,
    series,
  } as EChartsOption;
}

/** Renders a ChartPayload with ECharts and lets the user switch chart types. */
@Component({
  selector: 'agent-chart',
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
            <button
              type="button"
              class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-brand-soft text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              (click)="openCase.emit(c)"
            >
              {{ c }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class AgentChart implements OnDestroy {
  readonly payload = input.required<ChartPayload>();
  readonly openCase = output<string>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  protected readonly selectedType = linkedSignal<ChartType>(() => this.payload().chart_type);
  protected readonly citations = computed(() => this.payload().citations ?? []);
  private readonly option = computed(() => buildOption(this.payload(), this.selectedType()));

  private chart: ECharts | null = null;
  private echartsModule: EChartsModule | null = null;
  private observer: ResizeObserver | null = null;
  private setOptionRaf: number | null = null;

  constructor() {
    afterNextRender(async () => {
      const echarts = await loadECharts();
      this.echartsModule = echarts;
      this.chart = echarts.init(this.host().nativeElement, undefined, { renderer: 'canvas' });
      this.chart.setOption(this.option());
      this.chart.on('click', (params) => {
        if (params.componentType !== 'series') return;
        let label = String(params.name ?? '');
        if (!label && Array.isArray(params.value)) {
          const idx = params.value[0];
          if (typeof idx === 'number') label = this.payload().labels[idx] ?? '';
        }
        if (!label && typeof params.dataIndex === 'number') {
          label = this.payload().labels[params.dataIndex] ?? '';
        }
        if (label) this.openCase.emit(label);
      });
      // Defer resize to next frame so the resize call can't synchronously
      // trigger the layout that retriggers the observer — otherwise the
      // browser logs "ResizeObserver loop completed with undelivered
      // notifications" which Angular's global error listener picks up.
      this.observer = new ResizeObserver(() => {
        requestAnimationFrame(() => this.chart?.resize());
      });
      this.observer.observe(this.host().nativeElement);
    });
    effect(() => {
      const option = this.option();
      // Coalesce rapid option changes into one rAF flush so that streamed
      // input updates don't trigger a layout thrash inside ECharts.
      if (this.setOptionRaf !== null) cancelAnimationFrame(this.setOptionRaf);
      this.setOptionRaf = requestAnimationFrame(() => {
        this.setOptionRaf = null;
        this.chart?.setOption(option, { notMerge: true, lazyUpdate: true });
      });
    });
  }

  ngOnDestroy(): void {
    if (this.setOptionRaf !== null) cancelAnimationFrame(this.setOptionRaf);
    this.observer?.disconnect();
    this.chart?.dispose();
  }

  protected icon(type: ChartType): string {
    return TYPE_ICON[type];
  }

  protected label(type: ChartType): string {
    return TYPE_LABEL[type];
  }
}
