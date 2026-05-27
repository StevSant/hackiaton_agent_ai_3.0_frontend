import { ramoLabel } from '@shared/utils';
import { ALERT_CATALOG } from '../models/alert-catalog';
import type { Claim } from '../models/claim.model';

export function aiExplanation(c: Claim): string {
  if (c.nivel === 'verde') {
    return `Este siniestro de ${ramoLabel(c.ramo).toLowerCase()} en ${c.ciudad} presenta un perfil de riesgo bajo (${c.score}/100). La documentación está completa, los tiempos de reporte son razonables y no se detectan patrones atípicos en el historial del asegurado ni del proveedor asociado. Recomendación: continuar el flujo normal del siniestro.`;
  }
  const sorted = [...c.alertas].sort((a, b) => b.puntos - a.puntos);
  const top = sorted[0];
  if (!top) {
    return `El siniestro ${c.id} obtuvo un score de ${c.score}/100. Sin reglas específicas activadas, pero el score sugiere revisión.`;
  }
  const topCat = ALERT_CATALOG[top.code] ?? { titulo: top.code };
  const others = c.alertas.length - 1;
  const total = c.alertas.reduce((s, a) => s + a.puntos, 0);
  const otherPts = total - top.puntos;
  const tierWord = c.nivel === 'rojo' ? 'alto' : 'medio';
  const extra =
    others > 0
      ? `Adicionalmente se activaron ${others} señales más que sumaron ${otherPts} puntos.`
      : '';
  const closing =
    c.nivel === 'rojo'
      ? 'Recomendamos escalar a la Unidad Antifraude para revisión especializada de campo antes de procesar pagos.'
      : 'Sugerimos revisión documental por un analista antes de proceder con el pago.';
  return `El siniestro ${c.id} obtuvo un score de ${c.score}/100 (${tierWord}). La señal de mayor peso es "${topCat.titulo}" (${top.code}, +${top.puntos} pts): ${top.detalle.toLowerCase()} ${extra} ${closing}`;
}

export function suggestedAction(c: Claim): string {
  return c.nivel === 'rojo'
    ? 'Escalar a Unidad Antifraude — revisión especializada de campo.'
    : c.nivel === 'amarillo'
      ? 'Escalar a Unidad Antifraude — revisión documental.'
      : 'Continuar flujo normal del siniestro.';
}
