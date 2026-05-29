/**
 * Expands insurance acronyms that appear inside free-text narratives so a
 * non-technical analyst doesn't hit opaque jargon ("PTxRB" → "Pérdida Total
 * por Robo (PTxRB)"). Only the FIRST occurrence per text is expanded; later
 * mentions keep the acronym to avoid bloating the snippet.
 */
const JARGON: ReadonlyArray<{ acronym: RegExp; expansion: string }> = [
  { acronym: /\bPTxRB\b/, expansion: 'Pérdida Total por Robo (PTxRB)' },
  { acronym: /\bPTxDM\b/, expansion: 'Pérdida Total por Daños Materiales (PTxDM)' },
  { acronym: /\bRC\b(?!-)/, expansion: 'Responsabilidad Civil (RC)' },
];

export function expandInsuranceJargon(text: string | null | undefined): string {
  if (!text) return '';
  let out = text;
  for (const { acronym, expansion } of JARGON) {
    out = out.replace(acronym, expansion);
  }
  return out;
}
