import type { AiAnomaly, ClaimTypeSlice, RegionalFraudPoint } from '../models';

export const MOCK_ANOMALIES: AiAnomaly[] = [
  {
    id: 'med-cluster',
    title: 'Reclamos médicos agrupados',
    description: 'Correlación multi-proveedor detectada en Santo Domingo.',
    severity: 'critical',
    confidence: 98.2,
  },
  {
    id: 'identity-fabrication',
    title: 'Fabricación de identidad',
    description: 'Creación secuencial de pólizas con RUC generados sintéticamente.',
    severity: 'potential',
    confidence: 74.5,
  },
];

export const MOCK_REGIONAL_FRAUD: RegionalFraudPoint[] = [
  { region: 'Pichincha', value: 88, color: '#1e293b' },
  { region: 'Guayas', value: 72, color: '#334155' },
  { region: 'Azuay', value: 58, color: '#475569' },
  { region: 'Manabí', value: 64, color: '#64748b' },
  { region: 'El Oro', value: 46, color: '#94a3b8' },
];

export const MOCK_CLAIM_TYPE_SLICES: ClaimTypeSlice[] = [
  { key: 'auto', label: 'Automotriz', pct: 60, color: '#1e293b' },
  { key: 'health', label: 'Salud', pct: 25, color: '#3b82f6' },
  { key: 'life', label: 'Vida/PYMES', pct: 15, color: '#6366f1' },
];

export const MOCK_TOTAL_CLAIMS_LABEL = '12.4k';

export const MOCK_QUARTERLY_OUTLOOK = {
  body: 'Se proyecta un incremento del 4,2% en la exposición al riesgo estratégico en regiones costeras por patrones estacionales de migración.',
  systematicFraudDelta: '-2,1%',
};
