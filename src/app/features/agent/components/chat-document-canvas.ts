import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AgentApi } from '@core/api/clients/agent.api';
import { MarkdownPipe } from '@shared/pipes';
import { Icon } from '@shared/ui/icon';
import { slugify } from '../utils/message-to-markdown';

/**
 * Renders an agent-generated document artifact with an editable canvas.
 * Inputs mirror the `DocumentPayload` shape from the SSE event.
 * Presentational: no router, no store — actions are outputs.
 */
@Component({
  selector: 'chat-document-canvas',
  standalone: true,
  imports: [MarkdownPipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-line bg-surface mt-1 w-full max-w-[720px] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-soft">
        <ui-icon name="description" [size]="16" class="text-brand shrink-0" />
        <span class="text-[13px] font-semibold text-ink flex-1 truncate">{{ titulo() }}</span>
        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[11.5px] text-ink-2 px-2 py-1 rounded hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            [class.text-brand]="editMode()"
            [attr.aria-pressed]="editMode()"
            (click)="toggleEdit()"
          >
            <ui-icon name="edit" [size]="13" />
            {{ editMode() ? 'Vista previa' : 'Editar' }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[11.5px] text-ink-2 px-2 py-1 rounded hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            [disabled]="downloading()"
            (click)="onDownload()"
          >
            <ui-icon
              name="download"
              [size]="13"
              [class.animate-spin]="downloading()"
            />
            {{ downloading() ? 'Generando…' : 'Descargar Word' }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[11.5px] text-ink-2 px-2 py-1 rounded hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            (click)="onImprove()"
          >
            <ui-icon name="auto_fix_high" [size]="13" />
            Mejorar con IA
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-4 py-3">
        @if (editMode()) {
          <textarea
            class="w-full min-h-[240px] text-[12.5px] font-mono text-ink bg-transparent border border-line rounded-lg p-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-brand"
            [value]="draft()"
            (input)="onDraftInput($event)"
          ></textarea>
        } @else {
          <div class="markdown-body text-[13px]" [innerHTML]="draft() | markdown"></div>
        }
      </div>

      @if (downloadError()) {
        <div class="px-3.5 pb-2.5 text-[11.5px] text-red-500">
          No se pudo generar el archivo Word. Intentá de nuevo.
        </div>
      }
    </div>
  `,
})
export class ChatDocumentCanvas {
  readonly titulo = input.required<string>();
  readonly contenidoMarkdown = input.required<string>();

  /** Emitted when "Mejorar con IA" is clicked — payload is the current draft text. */
  readonly improve = output<string>();

  private readonly agentApi = inject(AgentApi);

  protected readonly editMode = signal(false);
  protected readonly downloading = signal(false);
  protected readonly downloadError = signal(false);

  /**
   * draft is a writable copy of `contenidoMarkdown`. Initialized lazily on first
   * interaction so the input signal is read after view init.
   */
  protected readonly draft = signal('');

  private draftInitialized = false;

  protected toggleEdit(): void {
    // Ensure draft is initialized before toggling.
    if (!this.draftInitialized) {
      this.draftInitialized = true;
      this.draft.set(this.contenidoMarkdown());
    }
    this.editMode.update((v) => !v);
  }

  protected onDraftInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.draft.set(target.value);
  }

  protected async onDownload(): Promise<void> {
    if (this.downloading()) return;
    if (!this.draftInitialized) {
      this.draftInitialized = true;
      this.draft.set(this.contenidoMarkdown());
    }
    this.downloading.set(true);
    this.downloadError.set(false);
    try {
      const blob = await firstValueFrom(
        this.agentApi.downloadDocumentDocx({
          titulo: this.titulo(),
          contenido_markdown: this.draft(),
        }),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(this.titulo()) || 'documento'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.downloadError.set(true);
    } finally {
      this.downloading.set(false);
    }
  }

  protected onImprove(): void {
    if (!this.draftInitialized) {
      this.draftInitialized = true;
      this.draft.set(this.contenidoMarkdown());
    }
    this.improve.emit(this.draft());
  }
}
