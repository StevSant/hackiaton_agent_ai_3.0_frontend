import type { Provider } from '@shared/models';
import type { ExportColumnOption, ExportRequest } from '@shared/ui';
import { downloadExport } from './download-export';
import { ramoLabel } from './ramos';

export const PROVIDER_EXPORT_COLUMNS: readonly ExportColumnOption[] = [
  { key: 'id', label: 'ID', hint: 'Identificador interno', defaultSelected: true },
  { key: 'nombre', label: 'Nombre', defaultSelected: true },
  { key: 'tipo', label: 'Tipo', hint: 'Taller, clínica…', defaultSelected: true },
  { key: 'ciudad', label: 'Ciudad', defaultSelected: true },
  { key: 'ramos', label: 'Ramos', hint: 'Listado separado por «;»', defaultSelected: true },
  { key: 'casos', label: 'Casos', hint: 'Total observados', defaultSelected: true },
  { key: 'alertas', label: 'Alertas', hint: 'Casos con alerta', defaultSelected: true },
  { key: 'monto', label: 'Monto observado', hint: 'Suma reclamada (USD)', defaultSelected: true },
  {
    key: 'lista_restrictiva',
    label: 'Lista restrictiva',
    hint: 'Sí / No',
    defaultSelected: true,
  },
  { key: 'tasa_alertas', label: 'Tasa de alertas', hint: 'alertas / casos', defaultSelected: false },
];

const COLUMN_LABELS: Record<string, string> = {
  id: 'id',
  nombre: 'nombre',
  tipo: 'tipo',
  ciudad: 'ciudad',
  ramos: 'ramos',
  casos: 'casos',
  alertas: 'alertas',
  monto: 'monto_observado_usd',
  lista_restrictiva: 'lista_restrictiva',
  tasa_alertas: 'tasa_alertas',
};

export function projectProvider(p: Provider): Record<string, unknown> {
  const ramos = (p.ramos ?? []).map((r) => ramoLabel(r)).join('; ');
  const tasa = p.casos > 0 ? Math.round((p.alertas / p.casos) * 100) / 100 : 0;
  return {
    id: p.id,
    nombre: p.nombre,
    tipo: p.tipo,
    ciudad: p.ciudad,
    ramos,
    casos: p.casos,
    alertas: p.alertas,
    monto: p.monto,
    lista_restrictiva: p.listaRestrictiva,
    tasa_alertas: tasa,
  };
}

export function exportProviders(providers: readonly Provider[], req: ExportRequest): void {
  const rows = providers.map(projectProvider);
  downloadExport(rows, req.columns, req.format, req.filename, COLUMN_LABELS);
}
