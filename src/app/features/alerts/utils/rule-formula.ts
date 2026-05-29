/**
 * Builds a plain-Spanish, live "with the current values" sentence for a rule's
 * threshold set, so the analyst sees exactly what the numbers do without
 * understanding engine jargon. Recomputed from the edited values as they type.
 *
 * Returns null for unknown rules (the modal simply hides the line).
 * Semantics mirror the backend's `app/domain/rules/config.yaml`.
 */
type Values = Readonly<Record<string, number>>;

function pct(v: number | undefined): string {
  return v === undefined ? '—' : `${Math.round(v * 100)}%`;
}

function n(v: number | undefined): string {
  return v === undefined ? '—' : String(v);
}

const FORMULAS: Readonly<Record<string, (v: Values) => string>> = {
  'FS-01': (v) =>
    `Ocurrido entre el día 0 y ${n(v['tier1_days'])} tras el inicio de la póliza: +${n(v['tier1_points'])} pts · ` +
    `entre el día ${n((v['tier1_days'] ?? 0) + 1)} y ${n(v['tier2_days'])}: +${n(v['tier2_points'])} pts · después no suma.`,
  'FS-02': (v) =>
    `Denuncia con más de ${n(v['threshold_high_hours'])} h de demora: +${n(v['points_high'])} pts · ` +
    `entre ${n(v['threshold_mid_hours'])} y ${n(v['threshold_high_hours'])} h: +${n(v['points_mid'])} pts · menos no suma.`,
  'FS-03': (v) =>
    `${n(v['threshold_high'])} o más reclamos del asegurado en 18 meses: +${n(v['points_high'])} pts · ` +
    `${n(v['threshold_mid'])} reclamos: +${n(v['points_mid'])} pts · menos no suma.`,
  'FS-04': (v) =>
    `${n(v['threshold_high'])} o más reclamos del vehículo: +${n(v['points_high'])} pts · ` +
    `${n(v['threshold_mid'])} reclamos: +${n(v['points_mid'])} pts · menos no suma.`,
  'FS-05': (v) =>
    `${n(v['threshold_high'])} o más reclamos del conductor: +${n(v['points_high'])} pts · ` +
    `${n(v['threshold_mid'])} reclamos: +${n(v['points_mid'])} pts · menos no suma.`,
  'FS-06': (v) =>
    `Más de ${n(v['threshold_high'])} eventos RC previos: +${n(v['points_high'])} pts · ` +
    `desde ${n(v['threshold_mid'])}: +${n(v['points_mid'])} pts.`,
  'FS-07': (v) =>
    `Proveedor/beneficiario en lista restrictiva: +${n(v['points_lista_restrictiva'])} pts · ` +
    `más de ${n(v['threshold_observed'])} casos observados: +${n(v['points_observed'])} pts.`,
  'FS-09': (v) =>
    `Relato ilógico: +${n(v['points_illogical'])} pts · evento múltiple de medianoche: +${n(v['points_midnight'])} pts.`,
  'FS-11': (v) =>
    `Alteración documental confirmada: +${n(v['points_confirmed'])} pts · sospechada: +${n(v['points_suspected'])} pts.`,
  'FS-12': (v) =>
    `Reporte con más de ${n(v['threshold_high_days'])} días de demora: +${n(v['points_high'])} pts · ` +
    `entre ${n(v['threshold_mid_days'])} y ${n(v['threshold_high_days'])} días: +${n(v['points_mid'])} pts.`,
  'FS-13': (v) =>
    `Narrativa con similitud ≥ ${pct(v['threshold_clone'])}: +${n(v['points_clone'])} pts (clon) · ` +
    `entre ${pct(v['threshold_similar'])} y ${pct(v['threshold_clone'])}: +${n(v['points_similar'])} pts.`,
  'FS-14': (v) =>
    `Monto ≥ ${pct(v['threshold_pct_high'])} de la suma asegurada, o mayor a ${pct(v['threshold_repair_pct'])} ` +
    `del costo promedio de reparación: +${n(v['points'])} pts.`,
  'FS-17': (v) =>
    `Ocurrido a ${n(v['threshold_days_high'])} días o menos del fin de la póliza: +${n(v['points_high'])} pts · ` +
    `entre ${n((v['threshold_days_high'] ?? 0) + 1)} y ${n(v['threshold_days_mid'])} días: +${n(v['points_mid'])} pts.`,
  'FS-18': (v) =>
    `Misma pareja proveedor–asegurado vista más de ${n(v['threshold_pair'])} veces: +${n(v['points_pair'])} pts · ` +
    `proveedor con más de ${n(v['threshold_provider'])} siniestros: +${n(v['points_provider'])} pts.`,
  'RF-05': (v) =>
    `Siniestro extremo a menos de ${n(v['threshold_hours'])} h del inicio de la póliza → el caso queda al menos en amarillo.`,
  'RF-06': (v) =>
    `Denuncia de robo con más de ${n(v['threshold_days'])} días de demora → el caso queda al menos en amarillo.`,
  'RF-07': (v) =>
    `Narrativa con similitud ≥ ${pct(v['threshold_similarity'])} se considera clonada → el caso queda al menos en amarillo.`,
};

export function ruleFormula(code: string, values: Values): string | null {
  const build = FORMULAS[code];
  if (build) return build(values);
  // Single flat-points rules (FS-08, FS-10, FS-15, FS-16, FS-19, …).
  if (Object.keys(values).length === 1 && values['points'] !== undefined) {
    return `Cuando la regla se activa suma +${values['points']} pts al score del siniestro.`;
  }
  return null;
}
