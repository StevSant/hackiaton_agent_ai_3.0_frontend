import type { RiskTier } from '../../../shared/utils';

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
};
