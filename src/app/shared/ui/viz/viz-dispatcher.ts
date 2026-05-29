// src/app/shared/ui/viz/viz-dispatcher.ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { AgentVisual } from './visual.model';
import { VizChart } from './viz-chart';
import { VizGauge } from './viz-gauge';
import { VizHeatmap } from './viz-heatmap';
import { VizKpiGroup } from './viz-kpi-group';
import { VizTable } from './viz-table';

/** Renders one AgentVisual by switching on its `kind`. Re-emits child events. */
@Component({
  selector: 'viz-dispatcher',
  standalone: true,
  imports: [VizChart, VizHeatmap, VizGauge, VizTable, VizKpiGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (visual().kind) {
      @case ('chart') {
        <viz-chart [payload]="asChart(visual()).data"
                   (openCase)="openCase.emit($event)"
                   (chartRendered)="chartRendered.emit($event)" />
      }
      @case ('heatmap') {
        <viz-heatmap [payload]="asHeatmap(visual())"
                     (cellClick)="cellClick.emit($event)" />
      }
      @case ('gauge') {
        <viz-gauge [payload]="asGauge(visual())" />
      }
      @case ('table') {
        <viz-table [payload]="asTable(visual())" (openCase)="openCase.emit($event)" />
      }
      @case ('kpi') {
        <viz-kpi-group [payload]="asKpi(visual())" />
      }
    }
  `,
})
export class VizDispatcher {
  readonly visual = input.required<AgentVisual>();
  readonly openCase = output<string>();
  readonly chartRendered = output<string>();
  readonly cellClick = output<{ x: number; y: number }>();

  protected asChart(v: AgentVisual) {
    return v as Extract<AgentVisual, { kind: 'chart' }>;
  }
  protected asHeatmap(v: AgentVisual) {
    return v as Extract<AgentVisual, { kind: 'heatmap' }>;
  }
  protected asGauge(v: AgentVisual) {
    return v as Extract<AgentVisual, { kind: 'gauge' }>;
  }
  protected asTable(v: AgentVisual) {
    return v as Extract<AgentVisual, { kind: 'table' }>;
  }
  protected asKpi(v: AgentVisual) {
    return v as Extract<AgentVisual, { kind: 'kpi' }>;
  }
}
