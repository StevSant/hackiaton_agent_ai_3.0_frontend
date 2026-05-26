export type RiskTier = 'verde' | 'amarillo' | 'rojo';

export function riskTier(score: number): RiskTier {
  if (score >= 76) return 'rojo';
  if (score >= 41) return 'amarillo';
  return 'verde';
}

export function riskTierLabel(tier: RiskTier): string {
  return tier === 'rojo' ? 'Alto' : tier === 'amarillo' ? 'Medio' : 'Bajo';
}
