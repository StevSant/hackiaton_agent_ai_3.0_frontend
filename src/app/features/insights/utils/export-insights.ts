import type { Claim } from '@features/claims/models';

/**
 * Export an insights snapshot (KPIs + per-tier counts + per-ramo counts +
 * per-city counts) as a CSV download. Computed off the same claims signal
 * that powers the dashboard so what the user exports is exactly what they
 * see on screen.
 */
export function exportInsightsCsv(claims: readonly Claim[]): void {
  if (typeof window === 'undefined') return;

  const total = claims.length;
  const rojo = claims.filter((c) => c.nivel === 'rojo').length;
  const amarillo = claims.filter((c) => c.nivel === 'amarillo').length;
  const verde = claims.filter((c) => c.nivel === 'verde').length;
  const exposed = claims
    .filter((c) => c.nivel !== 'verde')
    .reduce((s, c) => s + c.monto_reclamado, 0);
  const avgScore = total ? Math.round(claims.reduce((s, c) => s + c.score, 0) / total) : 0;

  const byRamo = countBy(claims, (c) => c.ramo || 'desconocido');
  const byCiudad = countBy(claims, (c) => c.ciudad || 'desconocido');

  const lines: string[] = [];
  lines.push('seccion,clave,valor');
  lines.push(`resumen,total_casos,${total}`);
  lines.push(`resumen,rojo,${rojo}`);
  lines.push(`resumen,amarillo,${amarillo}`);
  lines.push(`resumen,verde,${verde}`);
  lines.push(`resumen,score_promedio,${avgScore}`);
  lines.push(`resumen,exposicion_no_verde_usd,${exposed.toFixed(2)}`);
  for (const [k, v] of byRamo) lines.push(`por_ramo,${csv(k)},${v}`);
  for (const [k, v] of byCiudad) lines.push(`por_ciudad,${csv(k)},${v}`);

  triggerDownload(lines.join('\r\n'), `centinela-insights-${todayStamp()}.csv`, 'text/csv;charset=utf-8');
}

function countBy<T>(items: readonly T[], key: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return new Map([...map.entries()].sort((a, b) => b[1] - a[1]));
}

function csv(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
