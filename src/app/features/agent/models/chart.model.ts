export type ChartType = 'bar' | 'horizontal_bar' | 'line' | 'pie' | 'doughnut' | 'scatter';

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
  /**
   * Optional per-label tooltip rows. `meta[i]` is a flat key→value map rendered
   * under labels[i] (e.g. ramo / ciudad / monto). Values are pre-formatted by
   * the backend — the frontend renders them verbatim.
   */
  meta?: Record<string, string>[];
}
