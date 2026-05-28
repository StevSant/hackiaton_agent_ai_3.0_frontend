import type { Claim } from '@shared/models';
import type { ExportColumnOption, ExportRequest } from '@shared/ui';
import { downloadExport, ramoLabel, riskTierLabel } from '@shared/utils';

/**
 * Insights export — the analyzed siniestros as flat rows, so the page uses the
 * same shared ExportModal (format + columns + preview + filename) as every
 * other listing. The executive KPI rollup is now delivered by the agent's
 * "resumen ejecutivo" (NL question #11), not a bespoke CSV.
 */
export const INSIGHTS_EXPORT_COLUMNS: readonly ExportColumnOption[] = [
  { key: 'id', label: 'ID Siniestro', defaultSelected: true },
  { key: 'nivel', label: 'Nivel', hint: 'Verde / Amarillo / Rojo', defaultSelected: true },
  { key: 'score', label: 'Score', hint: '0-100', defaultSelected: true },
  { key: 'ramo', label: 'Ramo', defaultSelected: true },
  { key: 'ciudad', label: 'Ciudad', defaultSelected: true },
  { key: 'sucursal', label: 'Sucursal', defaultSelected: false },
  { key: 'estado', label: 'Estado', defaultSelected: false },
  { key: 'asegurado', label: 'Asegurado', defaultSelected: true },
  { key: 'proveedor', label: 'Proveedor', hint: 'Beneficiario / proveedor', defaultSelected: false },
  {
    key: 'monto_reclamado',
    label: 'Monto reclamado',
    hint: 'USD',
    defaultSelected: true,
  },
  { key: 'suma_asegurada', label: 'Suma asegurada', hint: 'USD', defaultSelected: false },
  {
    key: 'fecha_ocurrencia',
    label: 'Fecha ocurrencia',
    defaultSelected: true,
  },
  { key: 'fecha_reporte', label: 'Fecha reporte', defaultSelected: false },
];

const COLUMN_LABELS: Record<string, string> = {
  id: 'id_siniestro',
  nivel: 'nivel',
  score: 'score',
  ramo: 'ramo',
  ciudad: 'ciudad',
  sucursal: 'sucursal',
  estado: 'estado',
  asegurado: 'asegurado',
  proveedor: 'proveedor',
  monto_reclamado: 'monto_reclamado_usd',
  suma_asegurada: 'suma_asegurada_usd',
  fecha_ocurrencia: 'fecha_ocurrencia',
  fecha_reporte: 'fecha_reporte',
};

export function projectInsightClaim(c: Claim): Record<string, unknown> {
  return {
    id: c.id,
    nivel: riskTierLabel(c.nivel),
    score: c.score,
    ramo: ramoLabel(c.ramo),
    ciudad: c.ciudad,
    sucursal: c.sucursal,
    estado: c.estado,
    asegurado: c.asegurado,
    proveedor: c.proveedor ?? '',
    monto_reclamado: c.monto_reclamado,
    suma_asegurada: c.suma_asegurada,
    fecha_ocurrencia: c.fecha_ocurrencia,
    fecha_reporte: c.fecha_reporte,
  };
}

export function exportInsightsClaims(claims: readonly Claim[], req: ExportRequest): void {
  const rows = claims.map(projectInsightClaim);
  downloadExport(rows, req.columns, req.format, req.filename, COLUMN_LABELS);
}
