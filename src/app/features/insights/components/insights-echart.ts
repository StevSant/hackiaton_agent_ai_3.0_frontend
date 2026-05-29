import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { ECharts, EChartsOption } from 'echarts';

type EChartsModule = typeof import('echarts');
let echartsModulePromise: Promise<EChartsModule> | null = null;

function loadECharts(): Promise<EChartsModule> {
  if (echartsModulePromise === null) {
    echartsModulePromise = import('echarts');
  }
  return echartsModulePromise;
}

@Component({
  selector: 'insights-echart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="insights-echart-host w-full h-full"></div>`,
})
export class InsightsEchart implements OnDestroy {
  readonly option = input.required<EChartsOption>();
  readonly height = input<string>('240px');
  readonly barClick = output<string>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private chart: ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private clickBound = false;

  constructor() {
    afterNextRender(() => {
      void this.initChart();
    });

    effect(() => {
      const option = this.option();
      const host = this.host()?.nativeElement;
      if (host) host.style.height = this.height();
      this.chart?.setOption(option, { notMerge: true, lazyUpdate: true });
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
    this.chart = null;
  }

  private async initChart(): Promise<void> {
    const host = this.host().nativeElement;
    host.style.height = this.height();
    const echarts = await loadECharts();
    this.chart = echarts.init(host, undefined, { renderer: 'canvas' });
    this.chart.setOption(this.option());
    if (!this.clickBound) {
      this.chart.on('click', (params) => {
        if (params && typeof params === 'object' && 'name' in params && params.name) {
          this.barClick.emit(String(params.name));
        }
      });
      this.clickBound = true;
    }
    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(host);
  }
}
