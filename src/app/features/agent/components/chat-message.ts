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
import { AgentChart } from './agent-chart';
import { AgentEyeIcon } from './agent-eye-icon';
import { AgentSteps } from './agent-steps';
import { AgentTable } from './agent-table';
import { ChatDocumentCard } from './chat-document-card';
import type { AgentMessage } from '../models';
import { ChatUiPrefsStore } from '../services/chat-ui-prefs.store';

@Component({
  selector: 'agent-chat-message',
  standalone: true,
  imports: [AgentSteps, MarkdownPipe, Icon, AgentChart, AgentEyeIcon, AgentTable, ChatDocumentCard],
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
          @if (chart(); as chartData) {
            @if (uiPrefs.showCharts()) {
              @if (chartAccepted()) {
                <agent-chart [payload]="chartData" (openCase)="openCase.emit($event)" />
              }
              <button
                type="button"
                class="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-ink bg-brand-soft border border-line rounded-lg px-2.5 py-1.5 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                [attr.aria-pressed]="chartAccepted()"
                (click)="toggleChart.emit(message().id)"
              >
                <ui-icon [name]="chartAccepted() ? 'visibility_off' : 'bar_chart'" [size]="15" />
                {{ chartAccepted() ? 'Ocultar gráfico' : 'Ver como gráfico' }}
              </button>
            }
          } @else if (chartPending() && uiPrefs.showCharts()) {
            <div class="rounded-xl border border-line bg-surface p-3 mt-1 w-full max-w-[640px]">
              <div class="flex items-center gap-2 mb-2">
                <ui-icon name="bar_chart" [size]="14" class="text-ink-3" />
                <span class="text-[12.5px] font-semibold text-ink-3">Preparando visualización…</span>
              </div>
              <div class="w-full h-[280px] rounded-lg bg-soft animate-pulse"></div>
            </div>
          }
          @if (!documentPayload() && tablePayload(); as rows) {
            <agent-table [rows]="rows" (openCase)="openCase.emit($event)" />
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
  readonly toggleChart = output<string>();
  /** Opens the artifact side panel — payload is { titulo, contenidoMarkdown }. */
  readonly openCanvas = output<{ titulo: string; contenidoMarkdown: string }>();

  protected readonly uiPrefs = inject(ChatUiPrefsStore);

  protected readonly isUser = computed(() => this.message().role === 'user');
  protected readonly hasContent = computed(() => this.message().content.length > 0);
  protected readonly isEmpty = computed(() => !this.isUser() && !this.hasContent());
  protected readonly steps = computed(() => (this.isUser() ? [] : (this.message().steps ?? [])));
  protected readonly chart = computed(() => this.message().chart ?? null);
  protected readonly chartAccepted = computed(() => this.message().chartAccepted === true);
  protected readonly chartPending = computed(() => this.message().chartPending === true);
  protected readonly tablePayload = computed(() => this.message().tablePayload ?? null);
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
