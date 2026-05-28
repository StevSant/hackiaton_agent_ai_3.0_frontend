import type { Claim } from '@shared/models';
import type { ExportColumnOption, ExportRequest } from '@shared/ui';
import { downloadExport, ramoLabel, reviewStatusLabel } from '@shared/utils';

export const CLAIM_EXPORT_COLUMNS: readonly ExportColumnOption[] = [
  { key: 'id_siniestro', label: 'ID Siniestro', defaultSelected: true },
  { key: 'ramo', label: 'Ramo', defaultSelected: true },
  { key: 'cobertura', label: 'Cobertura', defaultSelected: false },
  { key: 'asegurado', label: 'Asegurado', defaultSelected: true },
  { key: 'poliza', label: 'Póliza', defaultSelected: false },
  { key: 'ciudad', label: 'Ciudad', defaultSelected: true },
  { key: 'fecha_ocurrencia', label: 'Fecha ocurrencia', defaultSelected: true },
  { key: 'fecha_reporte', label: 'Fecha reporte', defaultSelected: false },
  {
    key: 'monto_reclamado',
    label: 'Monto reclamado',
    hint: 'USD',
    defaultSelected: true,
  },
  { key: 'suma_asegurada', label: 'Suma asegurada', hint: 'USD', defaultSelected: false },
  { key: 'nivel', label: 'Nivel IA', hint: 'rojo / amarillo / verde', defaultSelected: true },
  { key: 'score', label: 'Score', hint: '0-100', defaultSelected: true },
  {
    key: 'estado_revision',
    label: 'Estado revisión',
    hint: 'Pendiente, Escalado…',
    defaultSelected: true,
  },
  { key: 'estado', label: 'Estado siniestro', defaultSelected: false },
  { key: 'sucursal', label: 'Sucursal', defaultSelected: false },
  { key: 'proveedor', label: 'Proveedor', defaultSelected: false },
  { key: 'descripcion', label: 'Descripción', hint: 'Narrativa', defaultSelected: false },
];

const COLUMN_LABELS: Record<string, string> = {
  id_siniestro: 'id_siniestro',
  ramo: 'ramo',
  cobertura: 'cobertura',
  asegurado: 'asegurado',
  poliza: 'poliza',
  ciudad: 'ciudad',
  fecha_ocurrencia: 'fecha_ocurrencia',
  fecha_reporte: 'fecha_reporte',
  monto_reclamado: 'monto_reclamado_usd',
  suma_asegurada: 'suma_asegurada_usd',
  nivel: 'nivel_ia',
  score: 'score',
  estado_revision: 'estado_revision',
  estado: 'estado_siniestro',
  sucursal: 'sucursal',
  proveedor: 'proveedor',
  descripcion: 'descripcion',
};

export function projectClaim(c: Claim): Record<string, unknown> {
  return {
    id_siniestro: c.id,
    ramo: ramoLabel(c.ramo),
    cobertura: c.cobertura,
    asegurado: c.asegurado,
    poliza: c.poliza,
    ciudad: c.ciudad,
    fecha_ocurrencia: c.fecha_ocurrencia,
    fecha_reporte: c.fecha_reporte,
    monto_reclamado: c.monto_reclamado,
    suma_asegurada: c.suma_asegurada,
    nivel: c.nivel,
    score: c.score,
    estado_revision: reviewStatusLabel(c.review.status),
    estado: c.estado,
    sucursal: c.sucursal,
    proveedor: c.proveedor ?? '',
    descripcion: c.descripcion,
  };
}

export function exportClaims(claims: readonly Claim[], req: ExportRequest): void {
  const rows = claims.map(projectClaim);
  downloadExport(rows, req.columns, req.format, req.filename, COLUMN_LABELS);
}
