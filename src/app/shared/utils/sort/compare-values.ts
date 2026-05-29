/**
 * Ascending comparator for the values an accessor returns. Numbers compare
 * numerically; everything else compares as a locale-aware string (es, numeric)
 * so "Caso 2" sorts before "Caso 10". Null / undefined always sort last.
 */
export function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): number {
  const aNil = a === null || a === undefined;
  const bNil = b === null || b === undefined;
  if (aNil && bNil) return 0;
  if (aNil) return 1;
  if (bNil) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}
