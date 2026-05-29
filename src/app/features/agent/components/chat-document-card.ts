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
import { Icon } from '@shared/ui/icon';
import { slugify } from '../utils/message-to-markdown';

/**
 * Compact document attachment chip shown inside an assistant message.
 * Clicking the card body opens the side panel; the download button saves
 * the document without opening the panel.
 *
 * Presentational except for the AgentApi injection for download — no store, no router.
 */
@Component({
  selector: 'chat-document-card',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-0 rounded-xl border border-line bg-soft mt-1 overflow-hidden max-w-[420px] cursor-pointer hover:border-brand/40 hover:bg-brand-soft/30 transition-colors group"
      role="button"
      tabindex="0"
      [attr.aria-label]="'Abrir documento: ' + titulo()"
      (click)="openCanvas.emit()"
      (keydown.enter)="openCanvas.emit()"
      (keydown.space)="$event.preventDefault(); openCanvas.emit()"
    >
      <!-- Icon col -->
      <div class="flex items-center justify-center w-11 h-11 shrink-0 bg-brand/10 self-stretch">
        <ui-icon name="description" [size]="20" class="text-brand" />
      </div>

      <!-- Text col -->
      <div class="flex-1 min-w-0 px-3 py-2.5">
        <p class="text-[13px] font-semibold text-ink truncate m-0 leading-snug">{{ titulo() }}</p>
        <p class="text-[11px] text-ink-3 m-0 leading-snug">Documento · DOCX</p>
      </div>

      <!-- Download button — stops propagation so clicking it doesn't open the panel -->
      <button
        type="button"
        class="flex items-center justify-center w-10 h-10 shrink-0 mr-1 rounded-lg text-ink-3 hover:text-brand hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
        [disabled]="downloading()"
        [attr.aria-label]="'Descargar ' + titulo()"
        (click)="$event.stopPropagation(); onDownload()"
      >
        <ui-icon
          [name]="downloading() ? 'progress_activity' : 'download'"
          [size]="17"
          [class.animate-spin]="downloading()"
        />
      </button>
    </div>

    @if (downloadError()) {
      <p class="text-[11px] text-red-500 mt-1 ml-1">
        No se pudo generar el archivo Word. Intentá de nuevo.
      </p>
    }
  `,
})
export class ChatDocumentCard {
  readonly titulo = input.required<string>();
  readonly contenidoMarkdown = input.required<string>();

  /** Emitted when the user clicks the card body → the page opens the side panel. */
  readonly openCanvas = output<void>();

  private readonly agentApi = inject(AgentApi);

  protected readonly downloading = signal(false);
  protected readonly downloadError = signal(false);

  protected async onDownload(): Promise<void> {
    if (this.downloading()) return;
    this.downloading.set(true);
    this.downloadError.set(false);
    try {
      const blob = await firstValueFrom(
        this.agentApi.downloadDocumentDocx({
          titulo: this.titulo(),
          contenido_markdown: this.contenidoMarkdown(),
          include_tables: true,
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
}
