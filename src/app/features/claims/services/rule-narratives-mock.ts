import type { RiskTier } from '@shared/utils';

export interface RuleNarrative {
  code: string;
  titulo: string;
  clasificacion: RiskTier;
  maxPts: number;
  narrative: string;
  whatTriggers: string[];
}

/**
 * Mockup rule catalog used by the RuleDetailDialog. Wiring will swap this for
 * the backend's `GET /api/v1/rules/{code}` endpoint per design spec V2.6.
 * Codes match the no-hyphen form used by ClaimAlert in mock claims.
 */
export const RULE_NARRATIVES: Record<string, RuleNarrative> = {
  RF01: {
    code: 'RF01',
    titulo: 'Pérdida total por robo (PTxRB)',
    clasificacion: 'rojo',
    maxPts: 14,
    narrative:
      'Cobertura de mayor riesgo histórico para fraude. Un siniestro con esta cobertura activa automáticamente la regla crítica y debe ser revisado por la Unidad Antifraude antes de cualquier liquidación. La sola activación no implica fraude — implica que el caso amerita revisión especializada.',
    whatTriggers: [
      'La cobertura del siniestro es "Pérdida Total por Robo" (PTxRB).',
      'El ramo es vehículos.',
    ],
  },
  RF02: {
    code: 'RF02',
    titulo: 'Documento posiblemente alterado',
    clasificacion: 'rojo',
    maxPts: 14,
    narrative:
      'Documentos con fechas inconsistentes, ediciones evidentes, sellos o firmas sospechosas. La regla se dispara cuando el módulo de validación documental marca al menos un documento con inconsistencias críticas.',
    whatTriggers: [
      'Documento marcado con `inconsistencia_detectada = true`.',
      'Fecha de emisión posterior a la fecha de ocurrencia.',
      'Diferencias entre copias digitales y físicas del mismo documento.',
    ],
  },
  RF03: {
    code: 'RF03',
    titulo: 'Coincidencia con lista restrictiva',
    clasificacion: 'rojo',
    maxPts: 10,
    narrative:
      'El asegurado, beneficiario o proveedor (APS) figura en la lista interna de actores observados por la Unidad Antifraude. La lista se mantiene manualmente y refleja casos previos con dictamen de sospecha confirmada o sanciones internas.',
    whatTriggers: [
      'id_asegurado, id_beneficiario o id_proveedor presente en `lista_restrictiva.csv`.',
      'La coincidencia es exacta (no parcial).',
    ],
  },
  RF04: {
    code: 'RF04',
    titulo: 'Dinámica del accidente inconsistente',
    clasificacion: 'rojo',
    maxPts: 12,
    narrative:
      'El relato del asegurado describe una dinámica que contradice la evidencia física: zonas dañadas que no corresponden al impacto descrito, ausencia de tercero cuando la narrativa lo implica, o trayectorias incompatibles con el croquis. Requiere validación cruzada con el parte policial y peritaje.',
    whatTriggers: [
      'Daño localizado no coincide con la dirección del impacto declarado.',
      'Narrativa de colisión múltiple sin tercero identificado.',
      'Velocidad o trayectoria físicamente imposibles según parte policial.',
    ],
  },
  RF05: {
    code: 'RF05',
    titulo: 'Siniestro al borde de vigencia',
    clasificacion: 'amarillo',
    maxPts: 8,
    narrative:
      'Eventos que ocurren en las primeras o últimas 48 horas de la póliza son atípicamente frecuentes en casos de fraude por simulación previa al inicio o forzamiento al final de vigencia.',
    whatTriggers: [
      'Ocurrencia ≤48h después del inicio de vigencia.',
      'Ocurrencia ≤48h antes del fin de vigencia.',
    ],
  },
  RF06: {
    code: 'RF06',
    titulo: 'Demora atípica en denuncia',
    clasificacion: 'amarillo',
    maxPts: 8,
    narrative:
      'En siniestros de robo, una denuncia fiscal presentada más de 4 días después del evento sugiere reconstrucción posterior o intento de armar el caso. No es una acusación — es una señal que pondera junto a otras.',
    whatTriggers: [
      '`dias_entre_ocurrencia_reporte > 4` para coberturas de robo.',
    ],
  },
  RF07: {
    code: 'RF07',
    titulo: 'Narrativa similar a otro reclamo',
    clasificacion: 'amarillo',
    maxPts: 8,
    narrative:
      'El modelo NLP encontró una descripción de siniestro con similitud textual >85% respecto a otro reclamo previo. Indica posibilidad de relato clonado o plantilla compartida — frecuente en redes de simulación.',
    whatTriggers: [
      'Similitud coseno >0.85 contra el corpus de descripciones previas.',
      'La coincidencia es contra un siniestro del mismo asegurado o de la misma red de proveedores.',
    ],
  },
  AF01: {
    code: 'AF01',
    titulo: 'Alta frecuencia de reclamos del asegurado',
    clasificacion: 'amarillo',
    maxPts: 8,
    narrative:
      'El asegurado presenta múltiples siniestros en los últimos 18 meses. La frecuencia por sí sola no es prueba de fraude, pero combinada con otras señales (narrativas similares, mismo proveedor) refuerza la sospecha.',
    whatTriggers: [
      '`reclamos_ultimos_18_meses >= 3`: 8 pts.',
      '`reclamos_ultimos_18_meses == 2`: 4 pts.',
    ],
  },
  AF02: {
    code: 'AF02',
    titulo: 'Documentos incompletos',
    clasificacion: 'verde',
    maxPts: 4,
    narrative:
      'Falta al menos un documento legal obligatorio (denuncia fiscal, acta policial, certificado de propiedad endosado). La regla sirve como recordatorio operativo más que como señal fuerte de fraude.',
    whatTriggers: [
      '`documentos_completos == "no"`.',
      'Documento marcado como `entregado = false` o `legible = false`.',
    ],
  },
  AF03: {
    code: 'AF03',
    titulo: 'Reporte tardío del evento',
    clasificacion: 'amarillo',
    maxPts: 5,
    narrative:
      'Reporte a la aseguradora con varios días de retraso frente a la fecha de ocurrencia. Sugiere demora en la decisión de reportar o reconstrucción posterior del relato.',
    whatTriggers: [
      '`dias_entre_ocurrencia_reporte > 7`: 5 pts.',
      '`dias_entre_ocurrencia_reporte` entre 4 y 7: 3 pts.',
    ],
  },
  AF04: {
    code: 'AF04',
    titulo: 'Monto cercano a suma asegurada',
    clasificacion: 'amarillo',
    maxPts: 5,
    narrative:
      'El monto reclamado representa una fracción muy alta de la suma asegurada o supera ampliamente el promedio de reparación del taller asignado. Patrón frecuente en simulaciones que buscan maximizar el cobro.',
    whatTriggers: [
      '`monto_reclamado / suma_asegurada > 0.95`.',
      '`monto_reclamado > 1.5 × monto_promedio_taller`.',
    ],
  },
  AF05: {
    code: 'AF05',
    titulo: 'Sin tercero identificado',
    clasificacion: 'amarillo',
    maxPts: 6,
    narrative:
      'Daño severo en el vehículo asegurado sin rastro del tercero involucrado, sin cámaras, sin testigos. Combinado con narrativa "perdí el control" es señal recurrente en autoaccidentes simulados.',
    whatTriggers: [
      'Daño severo declarado sin parte policial con identificación del tercero.',
      'Ausencia de cámaras o testigos en la zona del evento.',
    ],
  },
};
