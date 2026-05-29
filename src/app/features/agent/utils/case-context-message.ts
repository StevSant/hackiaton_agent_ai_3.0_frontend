import type { Claim } from '@shared/models';
import { aiExplanation, ramoLabel, riskTierLabel } from '@shared/utils';

export function buildCaseWelcomeMessage(claim: Claim): string {
  const explanation = aiExplanation(claim);
  return (
    `Estoy analizando el caso **${claim.id}** — *${claim.cobertura}* ` +
    `(${ramoLabel(claim.ramo)}, score **${claim.score}/100**, riesgo **${riskTierLabel(claim.nivel)}**).\n\n` +
    `${explanation}\n\n` +
    `¿Qué te gustaría revisar de este siniestro?`
  );
}

export const CASE_CHAT_SUGGESTIONS = [
  '¿Por qué tiene este score de riesgo?',
  '¿Qué documentos faltan en este caso?',
  '¿Hay casos similares sospechosos?',
  'Resume las señales activadas',
  '¿Qué debería revisar primero?',
] as const;
