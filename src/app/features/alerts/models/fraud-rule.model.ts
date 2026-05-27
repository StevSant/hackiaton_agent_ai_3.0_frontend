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
}
