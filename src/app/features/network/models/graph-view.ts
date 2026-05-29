import type { NetworkNodeKind } from '@core/api/clients/network.api';

/** Which entities the relationship graph connects. */
export type RelationMode = 'prov_aseg' | 'prov_caso' | 'aseg_caso' | 'tripartito';

/** A directed link between two graph nodes, identified by node id. */
export interface GraphEdge {
  source: string;
  target: string;
  casos: number;
  alertas: number;
  monto: number;
}

/** One vertical column of the layout — a node kind pinned to an x position. */
export interface ColumnSpec {
  kind: NetworkNodeKind;
  label: string;
  x: number; // 0-100 viewBox coordinate
}
