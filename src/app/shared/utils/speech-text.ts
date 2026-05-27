/**
 * Strip Markdown syntax down to readable plain text for speech synthesis,
 * so the reader doesn't pronounce asterisks, pipes, link URLs, etc.
 */
export function markdownToPlainText(md: string): string {
  let t = md.replace(/\r/g, '');
  t = t.replace(/```[\s\S]*?```/g, ' '); // fenced code blocks
  t = t.replace(/`([^`]+)`/g, '$1'); // inline code
  t = t.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1'); // images -> alt
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'); // links -> text
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, ''); // headings
  t = t.replace(/^\s{0,3}>\s?/gm, ''); // blockquotes
  t = t.replace(/^\s{0,3}[-*+]\s+/gm, ''); // unordered list markers
  t = t.replace(/^\s{0,3}\d+\.\s+/gm, ''); // ordered list markers
  t = t.replace(/(\*\*|__)(.*?)\1/g, '$2'); // bold
  t = t.replace(/(\*|_)(.*?)\1/g, '$2'); // italic
  t = t.replace(/~~(.*?)~~/g, '$1'); // strikethrough
  t = t.replace(/\|/g, ' '); // table pipes
  t = t.replace(/[ \t]+/g, ' '); // collapse inline whitespace
  t = t.replace(/\n{2,}/g, '\n'); // collapse blank lines
  return t.trim();
}
