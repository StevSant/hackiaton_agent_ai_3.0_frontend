import type { ClaimSummaryDto, InboxRowDto } from '@core/api/clients/claim.dto';
import type { ExportColumnOption, ExportRequest } from '@shared/ui';
import { downloadExport, formatDateTime, ramoLabel } from '@shared/utils';

/** Columns for the "Activos" tab (escalated cases — `InboxRow` shape). */
export const INBOX_ACTIVE_EXPORT_COLUMNS: readonly ExportColumnOption[] = [
  { key: 'id_siniestro', label: 'ID Siniestro', defaultSelected: true },
  { key: 'asegurado', label: 'Asegurado', defaultSelected: true },
  { key: 'ramo', label: 'Ramo', defaultSelected: true },
  { key: 'nivel', label: 'Nivel IA', hint: 'rojo / amarillo / verde', defaultSelected: true },
  { key: 'score', label: 'Score', hint: '0-100', defaultSelected: true },
  { key: 'escalado_el', label: 'Escalado el', defaultSelected: true },
  { key: 'asignado_a', label: 'Asignado a', hint: 'Analista antifraude', defaultSelected: true },
  { key: 'rebotes', label: 'Rebotes', hint: 'Veces devuelto', defaultSelected: true },
  { key: 'nota_escalacion', label: 'Nota de escalación', defaultSelected: false },
];

/** Columns for the "Mi histórico" tab (dictaminated cases — `ClaimSummary` shape). */
export const INBOX_HISTORICO_EXPORT_COLUMNS: readonly ExportColumnOption[] = [
  { key: 'id_siniestro', label: 'ID Siniestro', defaultSelected: true },
  { key: 'asegurado', label: 'Asegurado', defaultSelected: true },
  { key: 'ramo', label: 'Ramo', defaultSelected: true },
  { key: 'ciudad', label: 'Ciudad', defaultSelected: true },
  { key: 'nivel', label: 'Nivel IA', hint: 'rojo / amarillo / verde', defaultSelected: true },
  { key: 'score', label: 'Score', hint: '0-100', defaultSelected: true },
  { key: 'dictamen', label: 'Dictamen', defaultSelected: true },
  { key: 'dictaminado_el', label: 'Dictaminado el', defaultSelected: true },
  { key: 'justificacion', label: 'Justificación', defaultSelected: false },
  { key: 'monto_reclamado', label: 'Monto reclamado', hint: 'USD', defaultSelected: false },
];

const ACTIVE_COLUMN_LABELS: Record<string, string> = {
  id_siniestro: 'id_siniestro',
  asegurado: 'asegurado',
  ramo: 'ramo',
  nivel: 'nivel_ia',
  score: 'score',
  escalado_el: 'escalado_el',
  asignado_a: 'asignado_a',
  rebotes: 'rebotes',
  nota_escalacion: 'nota_escalacion',
};

const HISTORICO_COLUMN_LABELS: Record<string, string> = {
  id_siniestro: 'id_siniestro',
  asegurado: 'asegurado',
  ramo: 'ramo',
  ciudad: 'ciudad',
  nivel: 'nivel_ia',
  score: 'score',
  dictamen: 'dictamen',
  dictaminado_el: 'dictaminado_el',
  justificacion: 'justificacion',
  monto_reclamado: 'monto_reclamado_usd',
};

const DICTAMEN_LABELS: Record<string, string> = {
  confirmado_sospecha: 'Sospecha confirmada',
  descartado: 'Sospecha descartada',
  requiere_mas_info: 'Requiere más información',
};

export function projectInboxActiveRow(r: InboxRowDto): Record<string, unknown> {
  return {
    id_siniestro: r.claim_id,
    asegurado: r.asegurado,
    ramo: ramoLabel(r.ramo),
    nivel: r.nivel,
    score: r.score,
    escalado_el: formatDateTime(r.escalated_at) ?? '',
    asignado_a: r.assigned_to_name ?? 'Sin asignar',
    rebotes: r.bounce_count,
    nota_escalacion: r.escalation_note_preview ?? '',
  };
}

export function projectInboxHistoricoRow(c: ClaimSummaryDto): Record<string, unknown> {
  return {
    id_siniestro: c.id,
    asegurado: c.asegurado,
    ramo: ramoLabel(c.ramo),
    ciudad: c.ciudad,
    nivel: c.nivel,
    score: c.score,
    dictamen: c.dictamen_outcome ? (DICTAMEN_LABELS[c.dictamen_outcome] ?? 'Dictamen emitido') : '',
    dictaminado_el: formatDateTime(c.dictaminado_at) ?? '',
    justificacion: c.dictamen_justificacion ?? '',
    monto_reclamado: c.monto_reclamado,
  };
}

export function exportInboxActiveRows(rows: readonly InboxRowDto[], req: ExportRequest): void {
  const data = rows.map(projectInboxActiveRow);
  downloadExport(data, req.columns, req.format, req.filename, ACTIVE_COLUMN_LABELS);
}

export function exportInboxHistoricoRows(
  rows: readonly ClaimSummaryDto[],
  req: ExportRequest,
): void {
  const data = rows.map(projectInboxHistoricoRow);
  downloadExport(data, req.columns, req.format, req.filename, HISTORICO_COLUMN_LABELS);
}
