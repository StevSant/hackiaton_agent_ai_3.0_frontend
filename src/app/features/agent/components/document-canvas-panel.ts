import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  SimpleChanges,
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
 * "Mejorar con IA" emits `improve(instrucciones)` — the page calls the store, which
 * appends a NEW attachment + a chat reference card. It does NOT mutate in place.
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
          <!-- Mejorar con IA -->
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-ink bg-brand-soft border border-brand/20 rounded-lg px-2.5 py-1.5 hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            (click)="onImprove()"
            [disabled]="improving() || downloading()"
            aria-label="Mejorar con IA"
          >
            <ui-icon
              [name]="improving() ? 'progress_activity' : 'auto_fix_high'"
              [size]="14"
              [class.animate-spin]="improving()"
            />
            {{ improving() ? 'Mejorando…' : 'Mejorar con IA' }}
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

          <!-- Download -->
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-lg border border-line hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            [disabled]="downloading() || improving()"
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

      <!-- ── Instructions input (shown when user clicks "Mejorar con IA") ── -->
      @if (showInstructions()) {
        <div class="px-4 py-3 border-b border-line bg-soft shrink-0 flex flex-col gap-2">
          <label class="text-[12px] font-medium text-ink-2" for="improve-instructions">
            Instrucciones para la IA (opcional)
          </label>
          <textarea
            id="improve-instructions"
            rows="2"
            class="w-full text-[12.5px] border border-line rounded-lg px-3 py-2 resize-none bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Ej: Hacelo más conciso, agrega una sección de recomendaciones…"
            [value]="instructionsInput()"
            (input)="instructionsInput.set($any($event.target).value)"
          ></textarea>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="text-[12px] px-3 py-1.5 rounded-lg border border-line text-ink-2 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              (click)="cancelImprove()"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="text-[12px] px-3 py-1.5 rounded-lg bg-brand text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              (click)="confirmImprove()"
            >
              Mejorar
            </button>
          </div>
        </div>
      }

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
              class="markdown-body text-[14px] text-gray-800 leading-relaxed min-h-[320px] outline-none focus:ring-2 focus:ring-brand rounded-lg"
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
              class="markdown-body text-[14px] text-gray-800 leading-relaxed"
              [innerHTML]="doc().contenidoMarkdown | markdown"
            ></div>
          }
        </div>
      </div>

      @if (downloadError()) {
        <div class="px-4 pb-3 text-[11.5px] text-red-500 shrink-0">
          No se pudo generar el archivo Word. Intentá de nuevo.
        </div>
      }
      @if (improveError()) {
        <div class="px-4 pb-3 text-[11.5px] text-red-500 shrink-0">
          No se pudo mejorar el documento. Intentá de nuevo.
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
    `,
  ],
})
export class DocumentCanvasPanel implements OnChanges {
  /** The document attachment to display. Changes reset the view to the new content. */
  readonly doc = input.required<ConversationDocument>();

  readonly close = output<void>();
  /** Emitted on "Aplicar" with the edited content converted back to markdown. */
  readonly apply = output<string>();
  /** Emitted on "Mejorar" with optional instructions — the page calls the store. */
  readonly improve = output<{ instrucciones: string | null }>();

  private readonly agentApi = inject(AgentApi);
  private readonly editable = viewChild<ElementRef<HTMLDivElement>>('editable');

  protected readonly editMode = signal(false);
  protected readonly downloading = signal(false);
  protected readonly downloadError = signal(false);
  protected readonly improving = signal(false);
  protected readonly improveError = signal(false);
  protected readonly showInstructions = signal(false);
  protected readonly instructionsInput = signal('');
  /** Snapshot of the rendered HTML used to seed the contenteditable on edit entry. */
  protected readonly renderedHtml = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['doc']) {
      // Switching documents (or an improved version arriving) exits edit mode.
      this.editMode.set(false);
      this.improving.set(false);
      this.showInstructions.set(false);
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
      const blob = await firstValueFrom(
        this.agentApi.downloadDocumentDocx({
          titulo: this.doc().titulo,
          contenido_markdown: this.doc().contenidoMarkdown,
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

  /** First click: show the optional instructions bar. */
  protected onImprove(): void {
    if (this.improving()) return;
    this.improveError.set(false);
    this.instructionsInput.set('');
    this.showInstructions.set(true);
  }

  protected cancelImprove(): void {
    this.showInstructions.set(false);
    this.instructionsInput.set('');
  }

  /** Confirm: delegate to the page → store, which appends a chat reference. */
  protected confirmImprove(): void {
    this.showInstructions.set(false);
    this.improving.set(true);
    this.improveError.set(false);
    const instrucciones = this.instructionsInput().trim() || null;
    this.instructionsInput.set('');
    this.improve.emit({ instrucciones });
  }

  /** Called by the page when the improve request fails, to reset the spinner. */
  improveFailed(): void {
    this.improving.set(false);
    this.improveError.set(true);
  }
}
