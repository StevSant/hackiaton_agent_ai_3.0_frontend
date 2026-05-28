import type { Asegurado } from '@shared/models';

export function buildAseguradoWelcomeMessage(asegurado: Asegurado): string {
  const nombre = asegurado.nombre || asegurado.id;
  const moraNote = asegurado.mora_actual ? ' — **mora actual**' : '';
  const segmento = asegurado.segmento ? ` · ${asegurado.segmento}` : '';
  const riskPct =
    asegurado.casos > 0 ? Math.round((asegurado.alertas / asegurado.casos) * 100) : 0;

  return (
    `Estoy revisando al asegurado **${nombre}** (${asegurado.ciudad}${segmento})${moraNote}.\n\n` +
    `Tiene **${asegurado.casos} siniestros** registrados, de los cuales **${asegurado.alertas} generaron alertas** ` +
    `(${riskPct}% de riesgo). Reclamos en los últimos 12 meses: **${asegurado.reclamos_ultimos_12_meses}**.\n\n` +
    `¿Qué te gustaría revisar de este asegurado?`
  );
}

export const ASEGURADO_CHAT_SUGGESTIONS = [
  '¿Por qué este asegurado es atípico?',
  '¿En qué ramos reclama?',
  '¿Qué casos suyos debería revisar primero?',
  '¿Tiene siniestros cerca del inicio de póliza?',
  '¿Cuántas alertas acumula en los últimos 12 meses?',
] as const;
