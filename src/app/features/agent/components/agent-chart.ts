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
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

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
};

const TYPE_LABEL: Record<ChartType, string> = {
  bar: 'Barras',
  horizontal_bar: 'Barras horizontales',
  line: 'Línea',
  pie: 'Torta',
  doughnut: 'Dona',
};

const AXIS_TEXT = '#94a3b8'; // slate-400 — readable on light and dark surfaces

function buildOption(payload: ChartPayload, type: ChartType): EChartsOption {
  if (type === 'pie' || type === 'doughnut') {
    const first = payload.series[0];
    return {
      color: PALETTE,
      tooltip: { trigger: 'item' },
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
  const series = payload.series.map((s, i) => ({
    name: s.name,
    type: type === 'line' ? 'line' : 'bar',
    data: s.data,
    smooth: type === 'line',
    barMaxWidth: 28,
    itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: type === 'line' ? 0 : 4 },
  }));

  return {
    color: PALETTE,
    tooltip: { trigger: 'axis' },
    legend,
    grid: { left: 8, right: 16, top: legend ? 28 : 12, bottom: 8, containLabel: true },
    xAxis: type === 'horizontal_bar' ? valueAxis : categoryAxis,
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

  private chart: echarts.ECharts | null = null;
  private observer: ResizeObserver | null = null;

  constructor() {
    afterNextRender(() => {
      this.chart = echarts.init(this.host().nativeElement, undefined, { renderer: 'canvas' });
      this.chart.setOption(this.option());
      this.observer = new ResizeObserver(() => this.chart?.resize());
      this.observer.observe(this.host().nativeElement);
    });
    effect(() => {
      const option = this.option();
      this.chart?.setOption(option, true);
    });
  }

  ngOnDestroy(): void {
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
