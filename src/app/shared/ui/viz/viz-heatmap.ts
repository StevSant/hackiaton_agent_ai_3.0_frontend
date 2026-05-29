// src/app/shared/ui/viz/viz-heatmap.ts
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { ECharts, EChartsOption } from 'echarts';

import { loadECharts } from './echarts-loader';
import { AXIS_TEXT, TOOLTIP_BG, TOOLTIP_BORDER } from './viz-theme';
import type { HeatmapVisual } from './visual.model';

function buildOption(p: HeatmapVisual): EChartsOption {
  const max = p.cells.reduce((m, c) => Math.max(m, c.value), 0);
  return {
    tooltip: {
      position: 'top',
      backgroundColor: TOOLTIP_BG,
      borderColor: TOOLTIP_BORDER,
      borderWidth: 1,
      textStyle: { color: '#e2e8f0' },
      formatter: (params: unknown) => {
        const d = (params as { data: [number, number, number] }).data;
        return `${p.x_labels[d[0]]} · ${p.y_labels[d[1]]}<br/><b>${d[2]}</b> ${p.value_label ?? ''}`;
      },
    },
    grid: { left: 8, right: 8, top: 8, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: p.x_labels,
      axisLabel: { color: AXIS_TEXT },
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: p.y_labels,
      axisLabel: { color: AXIS_TEXT },
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: max || 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#bbf7d0', '#fde68a', '#f59e0b', '#ef4444'] },
      textStyle: { color: AXIS_TEXT },
    },
    series: [
      {
        type: 'heatmap',
        data: p.cells.map((c) => [c.x, c.y, c.value]),
        label: { show: true, color: '#0b1220', fontWeight: 600 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.4)' } },
      },
    ],
  } as EChartsOption;
}

@Component({
  selector: 'viz-heatmap',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-line bg-surface p-3 w-full">
      <div class="text-[12.5px] font-semibold text-ink mb-2">{{ payload().title }}</div>
      <div #host class="w-full h-[300px]"></div>
    </div>
  `,
})
export class VizHeatmap implements OnDestroy {
  readonly payload = input.required<HeatmapVisual>();
  readonly cellClick = output<{ x: number; y: number }>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly option = computed(() => buildOption(this.payload()));
  private chart: ECharts | null = null;
  private observer: ResizeObserver | null = null;
  private setOptionRaf: number | null = null;

  constructor() {
    afterNextRender(async () => {
      const echarts = await loadECharts();
      this.chart = echarts.init(this.host().nativeElement, undefined, { renderer: 'canvas' });
      this.chart.setOption(this.option());
      this.chart.on('click', (params) => {
        if (Array.isArray(params.data)) {
          this.cellClick.emit({ x: Number(params.data[0]), y: Number(params.data[1]) });
        }
      });
      this.observer = new ResizeObserver(() => requestAnimationFrame(() => this.chart?.resize()));
      this.observer.observe(this.host().nativeElement);
    });
    effect(() => {
      const option = this.option();
      // Coalesce rapid option changes into one rAF flush so streamed input
      // updates don't trigger a layout thrash inside ECharts.
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
}
