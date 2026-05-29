import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

// Claim IDs come in three shapes across the dataset: SIN-0049 (short),
// IMP-00257 (imported), and SIN-2026-08412 (year-prefixed). The old pattern
// only matched the last one, so IMP- and short SIN- IDs rendered as plain text
// in most messages — the links were inconsistent. Match all three.
const SIN_PATTERN = /\b(?:SIN|IMP)-\d{4,6}(?:-\d{4,6})?\b/g;

marked.setOptions({ breaks: true, gfm: true });

@Pipe({ name: 'markdown', standalone: true, pure: true })
export class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    const html = marked.parse(value, { async: false }) as string;
    const withChips = html.replace(
      SIN_PATTERN,
      '<span class="sin-chip" data-sin-id="$&">$&</span>',
    );
    return this.sanitizer.bypassSecurityTrustHtml(withChips);
  }
}
