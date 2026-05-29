import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';

import type { TtsState } from '@core/tts/text-to-speech.service';
import { MarkdownPipe } from '@shared/pipes';
import { Icon } from '@shared/ui/icon';
import { VizDispatcher } from '@shared/ui/viz';
import { AgentEyeIcon } from './agent-eye-icon';
import { AgentSteps } from './agent-steps';
import { AgentTable } from './agent-table';
import { ChatDocumentCard } from './chat-document-card';
import type { AgentMessage } from '../models';
import { ChatUiPrefsStore } from '../services/chat-ui-prefs.store';

@Component({
  selector: 'agent-chat-message',
  standalone: true,
  imports: [AgentSteps, MarkdownPipe, Icon, VizDispatcher, AgentEyeIcon, AgentTable, ChatDocumentCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full flex gap-3 items-start" [class.justify-end]="isUser()">
      @if (!isUser()) {
        <div
          class="w-11 h-11 sm:w-12 sm:h-12 rounded-full grid place-items-center shrink-0 font-semibold text-[12px] text-white"
          [style.background]="avatarBg()"
        >
          <agent-eye-icon [size]="24" [tracking]="tracking()" />
        </div>
      }

      @if (isUser()) {
        <div
          class="chat-message__bubble chat-message__bubble--user text-[13.5px] leading-relaxed px-3.5 py-2.5 rounded-2xl border bg-brand text-white border-transparent whitespace-pre-wrap break-words"
        >
          {{ message().content }}
        </div>
        <div
          class="w-8 h-8 sm:w-10 sm:h-10 rounded-full grid place-items-center shrink-0 font-semibold text-[12px] text-white"
          [style.background]="avatarBg()"
        >
          LV
        </div>
      } @else {
        <div class="flex flex-col items-start gap-1.5 min-w-0 chat-message__bubble">
          <div
            class="text-[13.5px] leading-relaxed px-3.5 py-2.5 rounded-2xl border bg-surface text-ink border-line break-words w-full"
            (click)="onBubbleClick($event)"
          >
            @if (steps().length > 0) {
              <agent-steps [steps]="steps()" [hasContent]="hasContent()" />
            }
            @if (isEmpty()) {
              <span class="dots"><span></span><span></span><span></span></span>
            } @else {
              <div class="markdown-body" [innerHTML]="message().content | markdown"></div>
            }

            <!-- Structured visuals rendered via viz-dispatcher (Phase 2). -->
            @if (uiPrefs.showCharts() && visuals().length) {
              @for (v of visuals(); track $index + '-' + (v.kind === 'chart' ? v.data.message_id : v.message_id)) {
                <viz-dispatcher
                  class="block mt-2"
                  [visual]="v"
                  (openCase)="openCase.emit($event)"
                  (chartRendered)="chartRendered.emit($event)"
                />
              }
            }
            @if (visualsPending() && uiPrefs.showCharts()) {
              <div class="rounded-xl border border-line bg-soft p-3 mt-2 w-full">
                <div class="flex items-center gap-2 mb-2">
                  <ui-icon name="bar_chart" [size]="14" class="text-ink-3" />
                  <span class="text-[12.5px] font-semibold text-ink-3">Preparando visualización…</span>
                </div>
                <div class="w-full h-[280px] rounded-lg bg-surface animate-pulse"></div>
              </div>
            }

            <!-- Fallback table: only when the prose has none AND the server emitted
                 no structured visual (a server visual is authoritative — avoids a
                 duplicate table when the agent already chose a table visual). -->
            @if (!documentPayload() && !proseHasTable() && !visuals().length && tablePayload(); as rows) {
              @if (tableAccepted()) {
                <agent-table class="block mt-2" [rows]="rows" (openCase)="openCase.emit($event)" />
              }
              <button
                type="button"
                class="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-ink bg-brand-soft border border-line rounded-lg px-2.5 py-1.5 mt-2 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                [attr.aria-pressed]="tableAccepted()"
                (click)="toggleTable.emit(message().id)"
              >
                <ui-icon [name]="tableAccepted() ? 'visibility_off' : 'table_chart'" [size]="15" />
                {{ tableAccepted() ? 'Ocultar tabla' : 'Ver tabla' }}
              </button>
            }
          </div>

          <!-- Footer action row -->
          <div class="flex flex-wrap items-center gap-1">
            @if (hasContent() && ttsSupported()) {
              <button
                type="button"
                class="inline-flex items-center gap-1 text-[11.5px] text-ink-3 px-1.5 py-0.5 rounded hover:text-brand hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft disabled:opacity-60"
                [disabled]="ttsActive() && ttsState() === 'loading'"
                [attr.aria-label]="listenLabel()"
                (click)="ttsToggle.emit(message().id)"
              >
                <ui-icon
                  [name]="listenIcon()"
                  [size]="14"
                  [class.animate-spin]="ttsActive() && ttsState() === 'loading'"
                />
                {{ listenLabel() }}
              </button>
            }
          </div>

          @if (documentPayload(); as doc) {
            <chat-document-card
              [titulo]="doc.titulo"
              [contenidoMarkdown]="doc.contenido_markdown"
              (openCanvas)="openCanvas.emit({ titulo: doc.titulo, contenidoMarkdown: doc.contenido_markdown })"
            />
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .chat-message__bubble {
        flex: 1;
        min-width: 0;
        max-width: min(720px, calc(100% - 3.25rem));
      }

      @media (min-width: 640px) {
        .chat-message__bubble {
          max-width: min(720px, calc(100% - 3.75rem));
        }
      }

      .chat-message__bubble--user {
        flex: 0 1 auto;
      }
    `,
  ],
})
export class ChatMessage {
  readonly message = input.required<AgentMessage>();
  readonly streaming = input<boolean>(false);
  readonly tracking = input<boolean>(false);
  readonly ttsSupported = input<boolean>(true);
  /** This message is the one currently being read aloud. */
  readonly ttsActive = input<boolean>(false);
  readonly ttsState = input<TtsState>('idle');

  readonly openCase = output<string>();
  readonly ttsToggle = output<string>();
  readonly toggleTable = output<string>();
  /** Opens the artifact side panel — payload is { titulo, contenidoMarkdown }. */
  readonly openCanvas = output<{ titulo: string; contenidoMarkdown: string }>();
  /** Bubbles the rendered chart's PNG data URL up to the page → store. */
  readonly chartRendered = output<string>();

  protected readonly uiPrefs = inject(ChatUiPrefsStore);

  protected readonly isUser = computed(() => this.message().role === 'user');
  protected readonly hasContent = computed(() => this.message().content.length > 0);
  protected readonly isEmpty = computed(() => !this.isUser() && !this.hasContent());
  protected readonly steps = computed(() => (this.isUser() ? [] : (this.message().steps ?? [])));
  protected readonly visuals = computed(() => this.message().visuals ?? []);
  protected readonly visualsPending = computed(() => this.message().visualsPending === true);
  protected readonly tablePayload = computed(() => this.message().tablePayload ?? null);
  // Tables are shown by default; only an explicit toggle to false hides them.
  protected readonly tableAccepted = computed(() => this.message().tableAccepted !== false);
  // True when the agent already wrote a Markdown table in its prose — detected by
  // a GFM delimiter row (e.g. |---|---|). In that case we suppress the redundant
  // auto-extracted <agent-table> so the message shows ONE table (the nice inline one).
  protected readonly proseHasTable = computed(() =>
    /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/m.test(this.message().content),
  );
  protected readonly documentPayload = computed(() => this.message().documentPayload ?? null);

  protected readonly listenIcon = computed(() => {
    if (this.ttsActive() && this.ttsState() === 'loading') return 'progress_activity';
    if (!this.ttsActive()) return 'volume_up';
    return this.ttsState() === 'playing' ? 'pause' : 'play_arrow';
  });
  protected readonly listenLabel = computed(() => {
    if (this.ttsActive() && this.ttsState() === 'loading') return 'Generando…';
    if (!this.ttsActive()) return 'Escuchar';
    return this.ttsState() === 'playing' ? 'Pausar' : 'Reanudar';
  });
  protected readonly avatarBg = computed(() =>
    this.isUser()
      ? 'linear-gradient(135deg, oklch(0.55 0.16 30), oklch(0.5 0.18 350))'
      : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
  );

  protected onBubbleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const chip = target.closest('[data-sin-id]');
    if (!chip) return;
    const id = chip.getAttribute('data-sin-id');
    if (id) this.openCase.emit(id);
  }
}
