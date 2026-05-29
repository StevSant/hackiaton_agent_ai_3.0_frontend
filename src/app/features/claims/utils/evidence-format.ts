import { formatMoney } from '@shared/utils';

export interface EvidenceRow {
  label: string;
  value: string;
}

type ValueKind = 'money' | 'pct' | 'bool' | 'hours' | 'days' | 'plain';

interface KeyMeta {
  label: string;
  kind: ValueKind;
}

// Presentation labels + value formatting for the evidence keys the rules emit
// (backend app/domain/rules/**). Keys not listed fall back to humanized labels,
// so a new rule's evidence still renders without a frontend change.
const KEY_META: Record<string, KeyMeta> = {
  demora_denuncia_horas: { label: 'Demora de la denuncia', kind: 'hours' },
  dias_entre_ocurrencia_reporte: { label: 'Días entre ocurrencia y reporte', kind: 'days' },
  threshold_dias: { label: 'Umbral de la regla', kind: 'days' },
  monto_reclamado: { label: 'Monto reclamado', kind: 'money' },
  suma_asegurada: { label: 'Suma asegurada', kind: 'money' },
  monto_vs_suma_pct: { label: 'Monto frente a la suma asegurada', kind: 'pct' },
  similitud_narrativa: { label: 'Similitud de narrativa', kind: 'pct' },
  proveedor_id: { label: 'Proveedor', kind: 'plain' },
  en_lista_restrictiva: { label: 'En lista restrictiva', kind: 'bool' },
  casos_observados: { label: 'Casos observados', kind: 'plain' },
  cobertura: { label: 'Cobertura', kind: 'plain' },
};

function humanizeKey(key: string): string {
  const text = key.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatValue(value: unknown, kind: ValueKind): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (kind === 'bool') return value ? 'Sí' : 'No';
  if (typeof value === 'number') {
    if (kind === 'money') return formatMoney(value);
    if (kind === 'pct') return `${(value * 100).toFixed(1)}%`;
    if (kind === 'hours') return `${value} h`;
    if (kind === 'days') return `${value} días`;
    return value.toLocaleString('es-EC');
  }
  return String(value);
}

export function formatEvidence(evidence: Record<string, unknown> | undefined): EvidenceRow[] {
  if (!evidence) return [];
  return Object.entries(evidence).map(([key, value]) => {
    const meta = KEY_META[key];
    return {
      label: meta?.label ?? humanizeKey(key),
      value: formatValue(value, meta?.kind ?? 'plain'),
    };
  });
}
