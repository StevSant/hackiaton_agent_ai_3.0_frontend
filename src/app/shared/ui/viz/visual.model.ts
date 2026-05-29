// src/app/shared/ui/viz/visual.model.ts
export type Tier = 'verde' | 'amarillo' | 'rojo';

export type VizChartType =
  | 'bar'
  | 'horizontal_bar'
  | 'line'
  | 'pie'
  | 'doughnut'
  | 'scatter'
  | 'stacked_tier'
  | 'dotplot';

export interface VizChartSeries {
  name: string;
  data: number[];
}

export interface ChartVisual {
  kind: 'chart';
  data: {
    message_id: string;
    title: string;
    chart_type: VizChartType;
    available_types: VizChartType[];
    labels: string[];
    series: VizChartSeries[];
    unit?: string | null;
    citations?: string[];
    meta?: Record<string, string>[];
  };
}

export type ColumnAlign = 'left' | 'right' | 'center';
export type ColumnKind = 'text' | 'number' | 'money' | 'tier' | 'mono' | 'citation';

export interface TableColumn {
  key: string;
  label: string;
  align?: ColumnAlign;
  col_kind?: ColumnKind;
}

export interface TableVisual {
  kind: 'table';
  message_id: string;
  title: string;
  columns: TableColumn[];
  rows: Record<string, string | number | null>[];
  citations?: string[];
}

export interface KpiItem {
  label: string;
  value: string;
  delta?: string | null;
  delta_dir?: 'up' | 'down' | 'flat' | null;
  tier?: Tier | null;
}

export interface KpiVisual {
  kind: 'kpi';
  message_id: string;
  title: string;
  items: KpiItem[];
  citations?: string[];
}

export interface GaugeBand {
  to: number;
  tier: Tier;
}

export interface GaugeVisual {
  kind: 'gauge';
  message_id: string;
  title: string;
  value: number;
  tier: Tier;
  label?: string | null;
  bands?: GaugeBand[];
}

export interface HeatCell {
  x: number;
  y: number;
  value: number;
}

export interface HeatmapVisual {
  kind: 'heatmap';
  message_id: string;
  title: string;
  x_labels: string[];
  y_labels: string[];
  cells: HeatCell[];
  value_label?: string | null;
  citations?: string[];
}

export type AgentVisual =
  | ChartVisual
  | TableVisual
  | KpiVisual
  | GaugeVisual
  | HeatmapVisual;
