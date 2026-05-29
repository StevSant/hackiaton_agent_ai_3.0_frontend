import TurndownService from 'turndown';
// turndown-plugin-gfm ships no types — declared locally below.
import { gfm } from 'turndown-plugin-gfm';

/**
 * Converts edited canvas HTML back to GitHub-flavored Markdown so the document's
 * `contenido_markdown` source stays the single source of truth (download + improve
 * keep working). The gfm plugin restores tables + strikethrough that core turndown
 * drops. Table round-trip is best-effort; prose fidelity is the priority.
 */
const turndown = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});
turndown.use(gfm);

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim();
}
