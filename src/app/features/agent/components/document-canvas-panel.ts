import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  SimpleChanges,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AgentApi } from '@core/api/clients/agent.api';
import { MarkdownPipe } from '@shared/pipes';
import { Icon } from '@shared/ui/icon';
import type { DocumentPayload } from '../models';
import { slugify } from '../utils/message-to-markdown';

/**
 * Right-side artifact panel (Claude.ai-style canvas).
 * Rendered by the chat page — NOT inside a message.
 *
 * Presents the document as a white "page" with edit + download + "Mejorar con IA".
 * Emits (close) when the user dismisses and (improve) when they request AI refinement.
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
            class="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-ink bg-brand-soft border border-brand/20 rounded-lg px-2.5 py-1.5 hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            (click)="onImprove()"
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

      <!-- ── Body: scrollable page area ── -->
      <div class="flex-1 min-h-0 overflow-y-auto px-6 py-6 scroll-pretty">
        <!-- Paper page -->
        <div class="bg-white rounded-xl shadow-md border border-gray-200 mx-auto w-full max-w-[680px] min-h-[400px] px-8 py-8">
          @if (editMode()) {
            <textarea
              class="w-full min-h-[360px] text-[13px] font-mono text-gray-800 border border-line rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-brand bg-white"
              [value]="draft()"
              (input)="onDraftInput($event)"
              aria-label="Editar contenido del documento"
            ></textarea>
            <div class="flex justify-end mt-3 gap-2">
              <button
                type="button"
                class="text-[12px] px-3 py-1.5 rounded-lg border border-line text-ink-2 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                (click)="editMode.set(false)"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="text-[12px] px-3 py-1.5 rounded-lg bg-brand text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                (click)="editMode.set(false)"
              >
                Aplicar
              </button>
            </div>
          } @else {
            <div
              class="markdown-body text-[14px] text-gray-800 leading-relaxed"
              [innerHTML]="draft() | markdown"
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
})
export class DocumentCanvasPanel implements OnChanges {
  /** The document to display. Changes reset draft to the new content. */
  readonly doc = input.required<DocumentPayload>();

  readonly close = output<void>();
  /** Emitted with current draft text when user clicks "Mejorar con IA". */
  readonly improve = output<string>();

  private readonly agentApi = inject(AgentApi);

  protected readonly editMode = signal(false);
  protected readonly downloading = signal(false);
  protected readonly downloadError = signal(false);
  protected readonly draft = signal('');

  private draftInitialized = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['doc']) {
      // When the document input changes (new doc from AI), reset draft to new content.
      this.draft.set(this.doc().contenido_markdown);
      this.draftInitialized = true;
      this.editMode.set(false);
    }
  }

  protected toggleEdit(): void {
    this.ensureDraft();
    this.editMode.update((v) => !v);
  }

  protected onDraftInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.draft.set(target.value);
  }

  protected async onDownload(): Promise<void> {
    if (this.downloading()) return;
    this.ensureDraft();
    this.downloading.set(true);
    this.downloadError.set(false);
    try {
      const blob = await firstValueFrom(
        this.agentApi.downloadDocumentDocx({
          titulo: this.doc().titulo,
          contenido_markdown: this.draft(),
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

  protected onImprove(): void {
    this.ensureDraft();
    this.improve.emit(this.draft());
  }

  private ensureDraft(): void {
    if (!this.draftInitialized) {
      this.draftInitialized = true;
      this.draft.set(this.doc().contenido_markdown);
    }
  }
}
