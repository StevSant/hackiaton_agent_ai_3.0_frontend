/**
 * Single source of truth for the multi-agent panel personas (Leslie, Naomi,
 * Ámbar, Iris, Naelis). Keyed by the backend `agent_id` so the landing hero,
 * the claim-detail summary chips and the full debate cards all render the same
 * name, accent color and animated eye. Identity lives here; layout/positioning
 * (orbit slots, stagger delays) stays in each consumer.
 */
export interface AgentPersona {
  /** Backend agent_id — 'reglas' | 'ml' | 'narrativa' | 'documentos_red' | 'consenso'. */
  id: string;
  /** Persona name shown as the headline ("Leslie"). */
  name: string;
  /** Role line under the name ("Analista de Reglas"). */
  role: string;
  /** Short specialty tag, rendered in the persona accent color. */
  tag: string;
  /** Glow / stroke / iris-outer color. */
  accent: string;
  /** Iris inner gradient stop. */
  irisInner: string;
  /** Autonomous eye-movement animation class. */
  gazeClass: string;
  /** Brow animation class. */
  browAnimClass: string;
  highlightX: number;
  highlightY: number;
  irisRadius: number;
  /** SVG path for the left brow. */
  browLeft: string;
  /** SVG path for the right brow. */
  browRight: string;
  browCrease?: string;
  /** Optional upper-lid squint shape. */
  lidPath?: string;
}

export const AGENT_PERSONAS: Record<string, AgentPersona> = {
  reglas: {
    id: 'reglas',
    name: 'Leslie',
    role: 'Analista de Reglas',
    tag: 'Reglas FS / RF',
    accent: '#60a5fa',
    irisInner: '#1e40af',
    gazeClass: 'ma-gaze--centinela',
    browAnimClass: 'ma-brows--calm',
    highlightX: 47.2,
    highlightY: 48,
    irisRadius: 11.5,
    browLeft: 'M 23 20 L 42 19',
    browRight: 'M 77 20 L 58 19',
  },
  ml: {
    id: 'ml',
    name: 'Naomi',
    role: 'Analista de ML',
    tag: 'Modelo y anomalía',
    accent: '#a78bfa',
    irisInner: '#5b21b6',
    gazeClass: 'ma-gaze--vigia',
    browAnimClass: 'ma-brows--vigia',
    highlightX: 48.8,
    highlightY: 46.2,
    irisRadius: 10.5,
    browLeft: 'M 21 15 L 39 23',
    browRight: 'M 79 15 L 61 23',
    lidPath: 'M 24 41 Q 50 35 76 41 L 72 47 Q 50 43 28 47 Z',
  },
  narrativa: {
    id: 'narrativa',
    name: 'Ámbar',
    role: 'Analista de Narrativa',
    tag: 'Relato y similares',
    accent: '#fbbf24',
    irisInner: '#b45309',
    gazeClass: 'ma-gaze--relato',
    browAnimClass: 'ma-brows--sorpresa',
    highlightX: 48.5,
    highlightY: 47,
    irisRadius: 12,
    browLeft: 'M 24 18 L 41 17',
    browRight: 'M 76 11 L 59 13',
  },
  documentos_red: {
    id: 'documentos_red',
    name: 'Iris',
    role: 'Analista de Documentos',
    tag: 'Documentos y red',
    accent: '#fb7185',
    irisInner: '#be123c',
    gazeClass: 'ma-gaze--rastreador',
    browAnimClass: 'ma-brows--rastreador',
    highlightX: 45.2,
    highlightY: 46.2,
    irisRadius: 12.5,
    browLeft: 'M 20 12 Q 34 8 43 11',
    browRight: 'M 77 17 L 59 16',
  },
  consenso: {
    id: 'consenso',
    name: 'Naelis',
    role: 'Moderador de consenso',
    tag: 'Consenso',
    accent: '#22d3ee',
    irisInner: '#0e7490',
    gazeClass: 'ma-gaze--centinela',
    browAnimClass: 'ma-brows--calm',
    highlightX: 47.2,
    highlightY: 48,
    irisRadius: 12,
    browLeft: 'M 23 20 L 42 19',
    browRight: 'M 77 20 L 58 19',
  },
};

/** Ordered persona ids for the four specialists (excludes the moderator). */
export const SPECIALIST_AGENT_IDS = ['reglas', 'ml', 'narrativa', 'documentos_red'] as const;

const NEUTRAL_ACCENT = '#94a3b8';

/**
 * Resolve a persona by backend agent_id. Unknown ids fall back to a neutral
 * eye that keeps the backend-provided display name/role so new agents still
 * render without a crash.
 */
export function resolveAgentPersona(
  agentId: string,
  fallback?: { name?: string; role?: string },
): AgentPersona {
  const persona = AGENT_PERSONAS[agentId];
  if (persona) return persona;
  return {
    id: agentId,
    name: fallback?.name ?? 'Especialista',
    role: fallback?.role ?? agentId,
    tag: agentId,
    accent: NEUTRAL_ACCENT,
    irisInner: '#475569',
    gazeClass: 'ma-gaze--centinela',
    browAnimClass: 'ma-brows--calm',
    highlightX: 47.2,
    highlightY: 48,
    irisRadius: 11.5,
    browLeft: 'M 23 20 L 42 19',
    browRight: 'M 77 20 L 58 19',
  };
}
