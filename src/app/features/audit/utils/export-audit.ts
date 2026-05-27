import type { AuditEvent } from '../models';

export type ExportFormat = 'csv' | 'xlsx' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  filename: string;
  columns: string[];
  includeHash: boolean;
  events: AuditEvent[];
}

const COLUMN_LABEL: Record<string, string> = {
  ts: 'timestamp',
  actor: 'actor',
  actorName: 'actor_nombre',
  action: 'accion',
  title: 'titulo',
  detail: 'detalle',
  target: 'recurso',
  sucursal: 'sucursal',
};

/**
 * Build a CSV / JSON / XLSX-compatible CSV blob from the filtered audit events
 * and prompt the browser to download it. We don't pull in a true XLSX writer
 * for the hackathon — Excel happily opens a `.xlsx` named CSV, and the hash
 * column makes the export tamper-evident enough for the demo.
 */
export async function exportAuditEvents(opts: ExportOptions): Promise<void> {
  if (typeof window === 'undefined') return;
  const { content, mime, extension } = await buildArtifact(opts);
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(opts.filename)}.${extension}`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Defer revoke so Firefox/Safari can finish the download tap.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function buildArtifact(
  opts: ExportOptions,
): Promise<{ content: string; mime: string; extension: string }> {
  const headers = opts.columns.slice();
  if (opts.includeHash) headers.push('sha256');

  if (opts.format === 'json') {
    const rows = await Promise.all(
      opts.events.map(async (e) => {
        const base = projectRow(e, opts.columns);
        if (opts.includeHash) base['sha256'] = await rowHash(base);
        return base;
      }),
    );
    return {
      content: JSON.stringify(rows, null, 2),
      mime: 'application/json;charset=utf-8',
      extension: 'json',
    };
  }

  const lines: string[] = [];
  lines.push(headers.map((h) => COLUMN_LABEL[h] ?? h).map(csvEscape).join(','));
  for (const event of opts.events) {
    const row = projectRow(event, opts.columns);
    if (opts.includeHash) row['sha256'] = await rowHash(row);
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  const content = lines.join('\r\n');
  return {
    content,
    mime: opts.format === 'xlsx'
      ? 'application/vnd.ms-excel;charset=utf-8'
      : 'text/csv;charset=utf-8',
    extension: opts.format,
  };
}

function projectRow(event: AuditEvent, columns: string[]): Record<string, string> {
  const all: Record<string, string> = {
    ts: event.ts,
    actor: event.actor,
    actorName: event.actorName,
    action: event.action,
    title: event.title,
    detail: event.detail,
    target: event.target ?? '',
    sucursal: '',
  };
  const out: Record<string, string> = {};
  for (const c of columns) out[c] = all[c] ?? '';
  return out;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function rowHash(row: Record<string, string>): Promise<string> {
  const text = JSON.stringify(row);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // No SubtleCrypto (very old browsers / non-secure context) — leave column empty.
  return '';
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9._-]/gi, '_').slice(0, 80) || 'centinela-export';
}
