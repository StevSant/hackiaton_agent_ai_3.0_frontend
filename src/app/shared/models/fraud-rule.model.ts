import type { RiskTier } from '@shared/utils';

export type RuleKind = 'critica' | 'amarilla' | 'scored';

export interface FraudRule {
  code: string;
  titulo: string;
  descripcion: string;
  clasificacion: RiskTier;
  kind: RuleKind;
  maxPts: number;
  activaciones30d: number;
  enabled: boolean;
  /** Effective tunable thresholds (e.g. { tier1_days: 10 }); empty when none. */
  thresholds: Record<string, number>;
}
