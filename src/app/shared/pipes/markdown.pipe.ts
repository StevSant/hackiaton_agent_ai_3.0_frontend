import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

const SIN_PATTERN = /SIN-\d{4}-\d{4,6}/g;

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
