import type { RiskTier } from '@shared/utils';

export interface AlertCatalogEntry {
  code: string;
  titulo: string;
  clasificacion: RiskTier;
}

export const ALERT_CATALOG: Record<string, AlertCatalogEntry> = {
  RF01: { code: 'RF01', titulo: 'Pérdida total por robo', clasificacion: 'rojo' },
  RF02: { code: 'RF02', titulo: 'Documento posiblemente alterado', clasificacion: 'rojo' },
  RF03: { code: 'RF03', titulo: 'Coincidencia con lista restrictiva', clasificacion: 'rojo' },
  RF04: { code: 'RF04', titulo: 'Dinámica del accidente inconsistente', clasificacion: 'rojo' },
  RF05: { code: 'RF05', titulo: 'Siniestro al borde de vigencia', clasificacion: 'amarillo' },
  RF06: { code: 'RF06', titulo: 'Demora atípica en denuncia', clasificacion: 'amarillo' },
  RF07: { code: 'RF07', titulo: 'Narrativa similar a otro reclamo', clasificacion: 'amarillo' },
  AF01: { code: 'AF01', titulo: 'Alta frecuencia de reclamos del asegurado', clasificacion: 'amarillo' },
  AF02: { code: 'AF02', titulo: 'Documentos incompletos', clasificacion: 'verde' },
  AF03: { code: 'AF03', titulo: 'Reporte tardío del evento', clasificacion: 'amarillo' },
  AF04: { code: 'AF04', titulo: 'Monto cercano a suma asegurada', clasificacion: 'amarillo' },
  AF05: { code: 'AF05', titulo: 'Sin tercero identificado', clasificacion: 'amarillo' },
  'FS-01': { code: 'FS-01', titulo: 'Siniestro cerca del inicio de póliza', clasificacion: 'amarillo' },
  'FS-02': { code: 'FS-02', titulo: 'Demora en denuncia por robo', clasificacion: 'amarillo' },
  'FS-03': { code: 'FS-03', titulo: 'Alta frecuencia de siniestros — asegurado', clasificacion: 'amarillo' },
  'FS-04': { code: 'FS-04', titulo: 'Alta frecuencia de siniestros — vehículo', clasificacion: 'amarillo' },
  'FS-05': { code: 'FS-05', titulo: 'Alta frecuencia de siniestros — conductor', clasificacion: 'amarillo' },
  'FS-06': { code: 'FS-06', titulo: 'Alta frecuencia de eventos solo RC', clasificacion: 'amarillo' },
  'FS-07': { code: 'FS-07', titulo: 'Proveedor o beneficiario recurrente', clasificacion: 'amarillo' },
  'FS-08': { code: 'FS-08', titulo: 'Documentos legales incompletos', clasificacion: 'amarillo' },
  'FS-09': { code: 'FS-09', titulo: 'Dinámica sospechosa del siniestro', clasificacion: 'amarillo' },
  'FS-10': { code: 'FS-10', titulo: 'Daño grave sin rastro de tercero', clasificacion: 'amarillo' },
  'FS-11': { code: 'FS-11', titulo: 'Documentos inconsistentes', clasificacion: 'amarillo' },
  'FS-12': { code: 'FS-12', titulo: 'Reporte tardío', clasificacion: 'amarillo' },
  'FS-13': { code: 'FS-13', titulo: 'Narrativas similares detectadas', clasificacion: 'amarillo' },
  'FS-14': { code: 'FS-14', titulo: 'Monto cercano o superior a la suma asegurada', clasificacion: 'amarillo' },
  'FS-15': { code: 'FS-15', titulo: 'Inconsistencia de datos del vehículo', clasificacion: 'amarillo' },
  'RF-01': { code: 'RF-01', titulo: 'Cobertura Pérdida Total por Robo', clasificacion: 'rojo' },
  'RF-02': { code: 'RF-02', titulo: 'Falsificación evidente de documentos', clasificacion: 'rojo' },
  'RF-03': { code: 'RF-03', titulo: 'Coincidencia con lista restrictiva', clasificacion: 'rojo' },
  'RF-04': { code: 'RF-04', titulo: 'Dinámica del accidente físicamente imposible', clasificacion: 'rojo' },
  'RF-05': { code: 'RF-05', titulo: 'Siniestro extremo al inicio de póliza', clasificacion: 'amarillo' },
  'RF-06': { code: 'RF-06', titulo: 'Demora atípica en denuncia de robo', clasificacion: 'amarillo' },
  'RF-07': { code: 'RF-07', titulo: 'Narrativa idéntica (clonada)', clasificacion: 'amarillo' },
};
