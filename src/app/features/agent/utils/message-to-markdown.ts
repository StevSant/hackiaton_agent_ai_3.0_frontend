import type { AgentMessage, TableRow } from '../models';

/** Build a slug from a title for the download filename. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/** Convert table rows to a GFM pipe table string. */
export function tableRowsToMarkdown(rows: TableRow[]): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const header = `| ${cols.join(' | ')} |`;
  const sep = `| ${cols.map(() => '---').join(' | ')} |`;
  const body = rows
    .map((r) => `| ${cols.map((c) => String(r[c] ?? '')).join(' | ')} |`)
    .join('\n');
  return `${header}\n${sep}\n${body}`;
}

/** Derive markdown content for a message (text + optional table). */
export function messageToMarkdown(msg: AgentMessage): string {
  const parts: string[] = [];
  if (msg.content.trim()) parts.push(msg.content.trim());
  if (msg.tablePayload && msg.tablePayload.length > 0) {
    parts.push(tableRowsToMarkdown(msg.tablePayload));
  }
  return parts.join('\n\n');
}

/** Derive a document title from the first non-empty line of a message. */
export function messageTitulo(msg: AgentMessage): string {
  const first = msg.content.trim().split('\n')[0] ?? '';
  const clean = first.replace(/^#{1,6}\s*/, '').trim();
  return clean.slice(0, 80) || 'Informe del agente';
}
