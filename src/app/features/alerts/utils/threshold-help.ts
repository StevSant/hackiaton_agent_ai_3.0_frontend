/**
 * Per-rule explanations for each editable threshold, in analyst language.
 * The same key means different things per rule ("Umbral alto" is hours in
 * FS-02 but a claims count in FS-03), so help is keyed `RULE.key` first and
 * falls back to a generic per-key description.
 *
 * Semantics mirror the backend's `app/domain/rules/config.yaml` comments.
 */
const RULE_HELP: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'FS-01': {
    tier1_days: 'Si el siniestro ocurre dentro de estos primeros días de la póliza, suma los puntos de la ventana alta.',
    tier1_points: 'Puntos que suma un siniestro dentro de la ventana de riesgo alto.',
    tier2_days: 'Si ocurre después de la ventana alta pero antes de este día, suma los puntos de la ventana media. Pasado este día la regla no suma.',
    tier2_points: 'Puntos que suma un siniestro dentro de la ventana de riesgo medio.',
  },
  'FS-02': {
    threshold_high_hours: 'Horas de demora en la denuncia desde las que se suman los puntos de riesgo alto.',
    threshold_mid_hours: 'Horas de demora desde las que se suman los puntos de riesgo medio (hasta el umbral alto).',
  },
  'FS-03': {
    threshold_high: 'Con esta cantidad de reclamos del asegurado en 18 meses (o más) se suman los puntos de riesgo alto.',
    threshold_mid: 'Con exactamente esta cantidad de reclamos se suman los puntos de riesgo medio.',
  },
  'FS-04': {
    threshold_high: 'Con esta cantidad de reclamos del mismo vehículo (o más) se suman los puntos de riesgo alto.',
    threshold_mid: 'Con exactamente esta cantidad de reclamos se suman los puntos de riesgo medio.',
  },
  'FS-05': {
    threshold_high: 'Con esta cantidad de reclamos del mismo conductor (o más) se suman los puntos de riesgo alto.',
    threshold_mid: 'Con exactamente esta cantidad de reclamos se suman los puntos de riesgo medio.',
  },
  'FS-06': {
    threshold_high: 'Con más de esta cantidad de eventos RC previos se suman los puntos de riesgo alto.',
    threshold_mid: 'Desde esta cantidad de eventos RC previos se suman los puntos de riesgo medio.',
  },
  'FS-07': {
    points_lista_restrictiva: 'Puntos cuando el beneficiario/proveedor figura en la lista restrictiva.',
    threshold_observed: 'Casos observados del proveedor a partir de los cuales (>) suma puntos por recurrencia.',
    points_observed: 'Puntos cuando el proveedor supera el umbral de casos observados.',
  },
  'FS-09': {
    points_illogical: 'Puntos cuando el relato del siniestro es ilógico.',
    points_midnight: 'Puntos por evento múltiple en horario de medianoche.',
  },
  'FS-11': {
    points_confirmed: 'Puntos por alteración documental confirmada o fechas previas al evento.',
    points_suspected: 'Puntos por inconsistencia documental sospechada (sin confirmar).',
  },
  'FS-12': {
    threshold_high_days: 'Con más de estos días entre ocurrencia y reporte se suman los puntos de riesgo alto.',
    threshold_mid_days: 'Desde estos días de demora se suman los puntos de riesgo medio (hasta el umbral alto).',
  },
  'FS-13': {
    threshold_clone: 'Similitud narrativa (0–1) desde la que el relato se considera clonado.',
    points_clone: 'Puntos cuando hay un relato clonado.',
    threshold_similar: 'Similitud (0–1) desde la que se marca un patrón similar, hasta el umbral de clonación.',
    points_similar: 'Puntos cuando hay un relato similar.',
  },
  'FS-14': {
    threshold_pct_high: 'Proporción monto reclamado / suma asegurada (0–1) que activa la señal.',
    threshold_repair_pct: 'Múltiplo del costo promedio de reparación que activa la señal.',
    points: 'Puntos cuando el monto supera cualquiera de los dos umbrales.',
  },
  'FS-17': {
    threshold_days_high: 'Si faltan estos días o menos para el fin de la póliza, se suman los puntos de riesgo alto.',
    threshold_days_mid: 'Hasta estos días antes del fin se suman los puntos de riesgo medio; más allá no se activa.',
  },
  'FS-18': {
    threshold_pair: 'Siniestros previos de la misma pareja proveedor–asegurado a partir de los cuales (>) aplica la señal fuerte.',
    points_pair: 'Puntos cuando la pareja proveedor–asegurado es recurrente.',
    threshold_provider: 'Total de siniestros del proveedor a partir del cual (>) aplica la señal de concentración.',
    points_provider: 'Puntos cuando el proveedor concentra demasiados siniestros.',
  },
  'RF-05': {
    threshold_hours: 'Un siniestro extremo dentro de estas horas tras el inicio de la póliza dispara la regla (fuerza al menos amarillo).',
  },
  'RF-06': {
    threshold_days: 'Una denuncia de robo con más de estos días de demora dispara la regla (fuerza al menos amarillo).',
  },
  'RF-07': {
    threshold_similarity: 'Similitud narrativa (0–1) desde la que el relato se considera clonado y dispara la regla (fuerza al menos amarillo).',
  },
};

// Fallback when the rule has no specific copy for the key.
const GENERIC_HELP: Readonly<Record<string, string>> = {
  points: 'Puntos que suma la regla cuando se activa.',
  points_high: 'Puntos que suma la regla cuando se supera el umbral de riesgo alto.',
  points_mid: 'Puntos que suma la regla en el rango de riesgo medio.',
  threshold_high: 'Valor desde el que el caso se considera de riesgo alto.',
  threshold_mid: 'Valor desde el que el caso se considera de riesgo medio.',
};

export function thresholdHelp(code: string, key: string): string {
  return RULE_HELP[code]?.[key] ?? GENERIC_HELP[key] ?? '';
}
