export function formatMoney(n: number): string {
  return '$' + n.toLocaleString('es-EC', { maximumFractionDigits: 0 });
}

export function formatMoneyShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}
