export type ChartType = 'bar' | 'horizontal_bar' | 'line' | 'pie' | 'doughnut';

export interface ChartSeries {
  name: string;
  data: number[];
}

/** Library-agnostic chart payload emitted by the agent's `chart` SSE event. */
export interface ChartPayload {
  message_id: string;
  title: string;
  chart_type: ChartType;
  available_types: ChartType[];
  labels: string[];
  series: ChartSeries[];
  unit?: string | null;
  citations?: string[];
}
