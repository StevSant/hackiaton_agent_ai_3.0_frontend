import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { marked } from 'marked';

import { AgentApi } from '@core/api/clients/agent.api';
import { MarkdownPipe } from '@shared/pipes';
import { Icon } from '@shared/ui/icon';
import type { ConversationDocument } from '../models';
import { htmlToMarkdown } from '../utils/html-to-markdown';
import { slugify } from '../utils/message-to-markdown';

/**
 * Right-side artifact panel (Claude.ai-style canvas).
 * Rendered by the chat page — NOT inside a message.
 *
 * Edit mode is WYSIWYG: the SAME rendered document (headings, tables, lists) is
 * made `contenteditable` so the user never sees markdown syntax. On "Aplicar" the
 * edited HTML is converted back to markdown (turndown + gfm) and emitted via
 * `apply` so the store keeps a markdown source for download + improve.
 *
 * CHANGE 1 — "Mejorar con IA" emits `improveInMainChat({titulo, contenidoMarkdown})`.
 * The page prefills the MAIN chat input + focuses it (no separate panel input). The
 * analyst types the instruction in the main composer; the MAIN agent improves it.
 */
@Component({
  selector: 'document-canvas-panel',
  standalone: true,
  imports: [MarkdownPipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Outer shell: full height, flex column -->
    <div class="flex flex-col h-full bg-surface border-l border-line">

      <!-- ── Header bar ── -->
      <div class="flex items-center gap-2 px-4 py-3 border-b border-line bg-soft shrink-0">
        <ui-icon name="description" [size]="18" class="text-brand shrink-0" />
        <div class="flex-1 min-w-0">
          <span class="text-[13.5px] font-semibold text-ink truncate block">{{ doc().titulo }}</span>
          <span class="text-[11px] text-ink-3">· DOCX</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <!-- Mejorar con IA — routes through the MAIN chat (no separate input). -->
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-ink bg-brand-soft border border-brand/20 rounded-lg px-2.5 py-1.5 hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            (click)="onImprove()"
            [disabled]="downloading()"
            aria-label="Mejorar con IA"
          >
            <ui-icon name="auto_fix_high" [size]="14" />
            Mejorar con IA
          </button>

          <!-- Edit toggle -->
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-lg border border-line hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            [class.text-brand-ink]="editMode()"
            [class.bg-brand-soft]="editMode()"
            [class.border-brand/20]="editMode()"
            [attr.aria-pressed]="editMode()"
            (click)="toggleEdit()"
          >
            <ui-icon [name]="editMode() ? 'visibility' : 'edit'" [size]="14" />
            {{ editMode() ? 'Vista' : 'Editar' }}
          </button>

          <!-- Incluir gráfico — only when a chart image is available for the conversation. -->
          @if (chartImage()) {
            <label
              class="inline-flex items-center gap-1.5 text-[12px] text-ink-2 px-2.5 py-1.5 rounded-lg border border-line cursor-pointer hover:bg-hover"
              [class.text-brand-ink]="includeChart()"
              [class.bg-brand-soft]="includeChart()"
              title="Incluir el gráfico en el documento Word (si lo desactivás, se elimina la referencia)"
            >
              <input
                type="checkbox"
                class="accent-brand"
                [checked]="includeChart()"
                (change)="includeChart.set($any($event.target).checked)"
              />
              Incluir gráfico
            </label>
          }

          <!-- Incluir tablas — positive toggle (checked = tables in the Word + preview). -->
          <label
            class="inline-flex items-center gap-1.5 text-[12px] text-ink-2 px-2.5 py-1.5 rounded-lg border border-line cursor-pointer hover:bg-hover"
            [class.text-brand-ink]="includeTables()"
            [class.bg-brand-soft]="includeTables()"
            title="Incluir las tablas en el documento Word"
          >
            <input
              type="checkbox"
              class="accent-brand"
              [checked]="includeTables()"
              (change)="includeTables.set($any($event.target).checked)"
            />
            Incluir tablas
          </label>

          <!-- Download -->
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-lg border border-line hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            [disabled]="downloading()"
            (click)="onDownload()"
            aria-label="Descargar Word"
          >
            <ui-icon
              [name]="downloading() ? 'progress_activity' : 'download'"
              [size]="14"
              [class.animate-spin]="downloading()"
            />
            {{ downloading() ? 'Generando…' : 'Descargar' }}
          </button>

          <!-- Close -->
          <button
            type="button"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line text-ink-3 hover:text-ink hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            (click)="close.emit()"
            aria-label="Cerrar panel"
          >
            <ui-icon name="close" [size]="16" />
          </button>
        </div>
      </div>

      <!-- ── Edit toolbar (only in edit mode) ── -->
      @if (editMode()) {
        <div class="flex items-center gap-1 px-4 py-2 border-b border-line bg-soft shrink-0">
          <span class="text-[11px] text-ink-3 mr-1">Formato:</span>
          <button type="button" class="canvas-tool-btn" title="Negrita" (click)="fmt('bold')">
            <ui-icon name="format_bold" [size]="15" />
          </button>
          <button type="button" class="canvas-tool-btn" title="Cursiva" (click)="fmt('italic')">
            <ui-icon name="format_italic" [size]="15" />
          </button>
          <button type="button" class="canvas-tool-btn" title="Título" (click)="formatHeading()">
            <ui-icon name="title" [size]="15" />
          </button>
          <button type="button" class="canvas-tool-btn" title="Lista" (click)="fmt('insertUnorderedList')">
            <ui-icon name="format_list_bulleted" [size]="15" />
          </button>
          <span class="ml-auto text-[11px] text-ink-3">Editás el documento con formato</span>
        </div>
      }

      <!-- ── Body: scrollable page area ── -->
      <div class="flex-1 min-h-0 overflow-y-auto px-6 py-6 scroll-pretty">
        <!-- Paper page -->
        <div class="bg-white rounded-xl shadow-md border border-gray-200 mx-auto w-full max-w-[680px] min-h-[400px] px-8 py-8">
          @if (editMode()) {
            <!-- WYSIWYG: the SAME rendered markdown, made editable. No raw syntax. -->
            <div
              #editable
              class="canvas-content markdown-body text-[14px] text-gray-800 leading-relaxed min-h-[320px] overflow-auto outline-none focus:ring-2 focus:ring-brand rounded-lg"
              contenteditable="true"
              role="textbox"
              aria-multiline="true"
              aria-label="Editar contenido del documento"
              [innerHTML]="renderedHtml()"
            ></div>
            <div class="flex justify-end mt-4 gap-2">
              <button
                type="button"
                class="text-[12px] px-3 py-1.5 rounded-lg border border-line text-ink-2 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                (click)="cancelEdit()"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="text-[12px] px-3 py-1.5 rounded-lg bg-brand text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                (click)="applyEdit()"
              >
                Aplicar
              </button>
            </div>
          } @else {
            <div
              class="canvas-content markdown-body text-[14px] text-gray-800 leading-relaxed overflow-auto"
              [innerHTML]="previewContent() | markdown"
            ></div>
          }
        </div>
      </div>

      @if (downloadError()) {
        <div class="px-4 pb-3 text-[11.5px] text-red-500 shrink-0">
          No se pudo generar el archivo Word. Intentá de nuevo.
        </div>
      }
    </div>
  `,
  styles: [
    `
      .canvas-tool-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.75rem;
        height: 1.75rem;
        border-radius: 0.375rem;
        color: var(--ink-2, #444);
      }
      .canvas-tool-btn:hover {
        background: var(--hover, rgba(0, 0, 0, 0.05));
        color: var(--brand);
      }
      /* Wide tables scroll horizontally inside the page instead of being clipped.
         ::ng-deep reaches the [innerHTML]-injected table, which has no scoping attr. */
      .canvas-content ::ng-deep table {
        max-width: none;
        width: auto;
      }
      /* The embedded chart image must fit the page width in the preview. */
      .canvas-content ::ng-deep img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0.5rem 0;
      }
    `,
  ],
})
export class DocumentCanvasPanel implements OnChanges {
  /** The document attachment to display. Changes reset the view to the new content. */
  readonly doc = input.required<ConversationDocument>();
  /** CHANGE 2 — PNG data URL of the latest chart; null hides the "Incluir gráfico" option. */
  readonly chartImage = input<string | null>(null);

  readonly close = output<void>();
  /** Emitted on "Aplicar" with the edited content converted back to markdown. */
  readonly apply = output<string>();
  /** CHANGE 1 — "Mejorar con IA": the page prefills the MAIN chat input with this doc. */
  readonly improveInMainChat = output<{ titulo: string; contenidoMarkdown: string }>();

  private readonly agentApi = inject(AgentApi);
  private readonly editable = viewChild<ElementRef<HTMLDivElement>>('editable');

  protected readonly editMode = signal(false);
  protected readonly downloading = signal(false);
  protected readonly downloadError = signal(false);
  /** Embed the chart in the downloaded .docx — ON by default so it always comes out. */
  protected readonly includeChart = signal(true);
  /** Include pipe tables in the .docx — ON by default so tables always show. */
  protected readonly includeTables = signal(true);
  /** Snapshot of the rendered HTML used to seed the contenteditable on edit entry. */
  protected readonly renderedHtml = signal('');

  /**
   * Markdown shown in the read-only preview, transformed to MATCH what the
   * download will produce: the chart placeholder becomes the real chart image
   * (or is dropped), and tables are dropped when "Incluir tablas" is off. This
   * is why toggling a checkbox updates the canvas live.
   */
  protected readonly previewContent = computed(() => {
    let md = this.doc().contenidoMarkdown;
    if (!this.includeTables()) {
      md = md
        .split('\n')
        .filter((line) => !/^\s*\|/.test(line))
        .join('\n');
    }
    const chart = this.chartImage();
    // ![alt](url) placeholder → real chart image when included, else removed.
    md = md.replace(/!\[[^\]]*\]\([^)]*\)/g, () =>
      this.includeChart() && chart ? `![Gráfico](${chart})` : '',
    );
    return md;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['doc']) {
      // Switching documents (or an improved version arriving) exits edit mode.
      this.editMode.set(false);
    }
  }

  protected toggleEdit(): void {
    if (this.editMode()) {
      this.editMode.set(false);
      return;
    }
    this.enterEdit();
  }

  private enterEdit(): void {
    // Seed the editable surface with the rendered HTML of the current markdown.
    // Angular sanitizes this on [innerHTML] bind — formatting tags survive.
    const html = marked.parse(this.doc().contenidoMarkdown, { async: false }) as string;
    this.renderedHtml.set(html);
    this.editMode.set(true);
  }

  protected cancelEdit(): void {
    this.editMode.set(false);
  }

  protected applyEdit(): void {
    const el = this.editable()?.nativeElement;
    if (!el) {
      this.editMode.set(false);
      return;
    }
    const markdown = htmlToMarkdown(el.innerHTML);
    this.apply.emit(markdown);
    this.editMode.set(false);
  }

  /** Native rich-text command on the contenteditable surface. */
  protected fmt(command: string): void {
    document.execCommand(command, false);
    this.editable()?.nativeElement.focus();
  }

  protected formatHeading(): void {
    document.execCommand('formatBlock', false, 'h2');
    this.editable()?.nativeElement.focus();
  }

  protected async onDownload(): Promise<void> {
    if (this.downloading()) return;
    this.downloading.set(true);
    this.downloadError.set(false);
    try {
      const chart = this.chartImage();
      const blob = await firstValueFrom(
        this.agentApi.downloadDocumentDocx({
          titulo: this.doc().titulo,
          contenido_markdown: this.doc().contenidoMarkdown,
          chart_image_base64: this.includeChart() && chart ? chart : null,
          include_tables: this.includeTables(),
        }),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(this.doc().titulo) || 'documento'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.downloadError.set(true);
    } finally {
      this.downloading.set(false);
    }
  }

  /** CHANGE 1 — hand off to the page, which prefills + focuses the MAIN chat input. */
  protected onImprove(): void {
    this.improveInMainChat.emit({
      titulo: this.doc().titulo,
      contenidoMarkdown: this.doc().contenidoMarkdown,
    });
  }
}
