/**
 * Spanish labels for the rule threshold keys exposed by `GET /rules/config`.
 * The backend is the source of truth for WHICH keys a rule has (the modal
 * renders whatever arrives); this map only translates the key to analyst
 * language. Unknown keys fall back to a prettified version of the raw key.
 *
 * Keys mirror `app/domain/rules/config.yaml` on the backend.
 */
const THRESHOLD_LABELS: Readonly<Record<string, string>> = {
  // FS-01 banding
  tier1_days: 'Ventana de riesgo alto (días)',
  tier1_points: 'Puntos en la ventana alta',
  tier2_days: 'Ventana de riesgo medio (días)',
  tier2_points: 'Puntos en la ventana media',
  // generic high/mid bands
  threshold_high: 'Umbral de riesgo alto',
  threshold_mid: 'Umbral de riesgo medio',
  points_high: 'Puntos (riesgo alto)',
  points_mid: 'Puntos (riesgo medio)',
  threshold_high_hours: 'Umbral alto (horas)',
  threshold_mid_hours: 'Umbral medio (horas)',
  threshold_high_days: 'Umbral alto (días)',
  threshold_mid_days: 'Umbral medio (días)',
  threshold_days_high: 'Umbral alto (días)',
  threshold_days_mid: 'Umbral medio (días)',
  // flat-point rules
  points: 'Puntos al activarse',
  // FS-07
  points_lista_restrictiva: 'Puntos por lista restrictiva',
  threshold_observed: 'Umbral de casos observados',
  points_observed: 'Puntos por casos observados',
  // FS-09
  points_illogical: 'Puntos por relato ilógico',
  points_midnight: 'Puntos por evento de medianoche',
  // FS-11
  points_confirmed: 'Puntos por alteración confirmada',
  points_suspected: 'Puntos por inconsistencia sospechada',
  // FS-13
  threshold_clone: 'Umbral de clonación (0–1)',
  points_clone: 'Puntos por narrativa clonada',
  threshold_similar: 'Umbral de similitud (0–1)',
  points_similar: 'Puntos por narrativa similar',
  // FS-14
  threshold_pct_high: 'Umbral sobre suma asegurada (0–1)',
  threshold_repair_pct: 'Umbral vs. promedio de reparación',
  // FS-18
  threshold_pair: 'Umbral pareja proveedor–asegurado',
  points_pair: 'Puntos por pareja recurrente',
  threshold_provider: 'Umbral de siniestros del proveedor',
  points_provider: 'Puntos por concentración del proveedor',
  // RF-05..07
  threshold_hours: 'Umbral (horas)',
  threshold_days: 'Umbral (días)',
  threshold_similarity: 'Umbral de similitud (0–1)',
};

export function thresholdLabel(key: string): string {
  return THRESHOLD_LABELS[key] ?? key.replaceAll('_', ' ');
}
