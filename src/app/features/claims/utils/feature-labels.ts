/**
 * Spanish labels for the supervised model's raw feature names.
 *
 * The backend's `extract_features()` emits 23 features whose names are
 * snake_case English (e.g. `narrativa_similar_score`, `monto_vs_suma_pct`).
 * The UI shows friendly Spanish labels via this map. Unknown features fall
 * back to a humanized version of the raw name so the UI never crashes when
 * the model adds a feature ahead of the frontend.
 *
 * Keep in sync with `app/domain/ml/feature_names.py` in the backend.
 */
const LABELS: Record<string, string> = {
  // numeric: temporal + amounts
  monto_reclamado: 'Monto reclamado',
  suma_asegurada: 'Suma asegurada',
  monto_vs_suma_pct: 'Monto vs. suma asegurada (%)',
  monto_vs_reparacion_avg_pct: 'Monto vs. reparación promedio (%)',
  dias_entre_ocurrencia_reporte: 'Días entre ocurrencia y reporte',
  dias_desde_inicio_poliza: 'Días desde inicio de póliza',
  dias_desde_fin_poliza: 'Días desde fin de póliza',
  demora_denuncia_horas: 'Demora denuncia (horas)',
  // numeric: frequency
  historial_siniestros_asegurado: 'Historial de siniestros del asegurado',
  frecuencia_vehiculo: 'Frecuencia del vehículo',
  frecuencia_conductor: 'Frecuencia del conductor',
  eventos_rc_previos: 'Eventos RC previos',
  proveedor_casos_observados: 'Casos observados del proveedor',
  // numeric: narrative
  narrativa_similar_score: 'Similitud narrativa',
  // booleans
  documentos_incompletos: 'Documentos incompletos',
  inconsistencia_documental: 'Inconsistencia documental',
  narrativa_clonada: 'Narrativa clonada',
  evento_medianoche: 'Evento de medianoche',
  es_robo: 'Cobertura de robo',
  cobertura_rc: 'Cobertura RC',
  proveedor_en_lista_restrictiva: 'Proveedor en lista restrictiva',
  beneficiario_en_lista_restrictiva: 'Beneficiario en lista restrictiva',
  narrativa_ilogica: 'Narrativa ilógica',
};

function humanize(feature: string): string {
  return feature
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export function featureLabel(feature: string): string {
  return LABELS[feature] ?? humanize(feature);
}
