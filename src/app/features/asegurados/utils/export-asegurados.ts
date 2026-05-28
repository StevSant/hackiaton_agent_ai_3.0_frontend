import type { Asegurado } from '@shared/models';
import type { ExportColumnOption, ExportRequest } from '@shared/ui';
import { downloadExport, ramoLabel } from '@shared/utils';

export const ASEGURADO_EXPORT_COLUMNS: readonly ExportColumnOption[] = [
  { key: 'id', label: 'ID Asegurado', defaultSelected: true },
  { key: 'nombre', label: 'Nombre', defaultSelected: true },
  { key: 'segmento', label: 'Segmento', defaultSelected: true },
  { key: 'ciudad', label: 'Ciudad', defaultSelected: true },
  { key: 'antiguedad', label: 'Antigüedad', hint: 'Años como cliente', defaultSelected: true },
  { key: 'num_polizas', label: 'Pólizas', hint: 'Pólizas activas', defaultSelected: true },
  {
    key: 'reclamos_ultimos_12_meses',
    label: 'Reclamos 12 m',
    hint: 'Reclamos en los últimos 12 meses',
    defaultSelected: true,
  },
  { key: 'mora_actual', label: 'En mora', hint: 'Sí / No', defaultSelected: true },
  {
    key: 'score_cliente_simulado',
    label: 'Score cliente',
    hint: '0-100 simulado',
    defaultSelected: false,
  },
  { key: 'casos', label: 'Casos', hint: 'Siniestros observados', defaultSelected: true },
  { key: 'alertas', label: 'Alertas', hint: 'Casos con alerta', defaultSelected: true },
  { key: 'monto', label: 'Monto observado', hint: 'Suma reclamada (USD)', defaultSelected: true },
  { key: 'ramos', label: 'Ramos', hint: 'Listado separado por «;»', defaultSelected: false },
  {
    key: 'tasa_alertas',
    label: 'Tasa de alertas',
    hint: 'alertas / casos',
    defaultSelected: false,
  },
];

const COLUMN_LABELS: Record<string, string> = {
  id: 'id_asegurado',
  nombre: 'nombre',
  segmento: 'segmento',
  ciudad: 'ciudad',
  antiguedad: 'antiguedad_anios',
  num_polizas: 'num_polizas',
  reclamos_ultimos_12_meses: 'reclamos_ultimos_12_meses',
  mora_actual: 'mora_actual',
  score_cliente_simulado: 'score_cliente_simulado',
  casos: 'casos',
  alertas: 'alertas',
  monto: 'monto_observado_usd',
  ramos: 'ramos',
  tasa_alertas: 'tasa_alertas',
};

export function projectAsegurado(a: Asegurado): Record<string, unknown> {
  const ramos = (a.ramos ?? []).map((r) => ramoLabel(r)).join('; ');
  const tasa = a.casos > 0 ? Math.round((a.alertas / a.casos) * 100) / 100 : 0;
  return {
    id: a.id,
    nombre: a.nombre,
    segmento: a.segmento ?? '',
    ciudad: a.ciudad,
    antiguedad: a.antiguedad ?? '',
    num_polizas: a.num_polizas,
    reclamos_ultimos_12_meses: a.reclamos_ultimos_12_meses,
    mora_actual: a.mora_actual,
    score_cliente_simulado: a.score_cliente_simulado ?? '',
    casos: a.casos,
    alertas: a.alertas,
    monto: a.monto,
    ramos,
    tasa_alertas: tasa,
  };
}

export function exportAsegurados(asegurados: readonly Asegurado[], req: ExportRequest): void {
  const rows = asegurados.map(projectAsegurado);
  downloadExport(rows, req.columns, req.format, req.filename, COLUMN_LABELS);
}
