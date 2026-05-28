import type { ExportFormat } from '@shared/ui';

/**
 * Project rows down to the selected columns and trigger a browser download.
 * XLSX is a CSV with `.xlsx` extension and an Excel-friendly MIME — Excel opens
 * it without complaint, and we save the bytes of a real writer library.
 */
export function downloadExport(
  rows: readonly Record<string, unknown>[],
  columns: readonly string[],
  format: ExportFormat,
  filename: string,
  columnLabels?: Record<string, string>,
): void {
  if (typeof window === 'undefined') return;

  const { content, mime, extension } = buildArtifact(rows, columns, format, columnLabels);
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(filename)}.${extension}`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Defer revoke so Firefox/Safari can finish the download tap.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

interface BuiltArtifact {
  content: string;
  mime: string;
  extension: string;
}

function buildArtifact(
  rows: readonly Record<string, unknown>[],
  columns: readonly string[],
  format: ExportFormat,
  columnLabels?: Record<string, string>,
): BuiltArtifact {
  if (format === 'json') {
    const projected = rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const c of columns) out[c] = normalizeJsonValue(row[c]);
      return out;
    });
    return {
      content: JSON.stringify(projected, null, 2),
      mime: 'application/json;charset=utf-8',
      extension: 'json',
    };
  }

  const headers = columns.map((c) => columnLabels?.[c] ?? c);
  const lines: string[] = [];
  lines.push(headers.map(csvEscape).join(','));
  for (const row of rows) {
    lines.push(columns.map((c) => csvEscape(row[c])).join(','));
  }
  const content = lines.join('\r\n');

  if (format === 'xlsx') {
    return {
      content,
      mime: 'application/vnd.ms-excel;charset=utf-8',
      extension: 'xlsx',
    };
  }

  return {
    content,
    mime: 'text/csv;charset=utf-8',
    extension: 'csv',
  };
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = stringify(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function stringify(value: unknown): string {
  if (Array.isArray(value)) return value.join('; ');
  if (typeof value === 'boolean') return value ? 'sí' : 'no';
  return String(value);
}

function normalizeJsonValue(value: unknown): unknown {
  if (value === undefined) return null;
  return value;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9._-]/gi, '_').slice(0, 80) || 'centinela-export';
}
