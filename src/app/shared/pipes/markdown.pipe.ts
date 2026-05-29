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
    // Real anchors (not spans) so ctrl/cmd/middle-click opens the case in a
    // new tab. Plain left clicks are intercepted in ChatMessage.onBubbleClick
    // and routed through the SPA router.
    const withChips = html.replace(
      SIN_PATTERN,
      '<a class="sin-chip" data-sin-id="$&" href="/claims/$&">$&</a>',
    );
    // External links written by the agent open in a new tab instead of
    // navigating the SPA away mid-conversation.
    const withTargets = withChips.replace(
      /<a href="(https?:\/\/[^"]*)"/g,
      '<a target="_blank" rel="noopener" href="$1"',
    );
    return this.sanitizer.bypassSecurityTrustHtml(withTargets);
  }
}
