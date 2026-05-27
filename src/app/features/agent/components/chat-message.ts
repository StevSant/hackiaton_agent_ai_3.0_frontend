import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { TtsState } from '@core/tts/text-to-speech.service';
import { MarkdownPipe } from '@shared/pipes';
import { Icon } from '@shared/ui/icon';
import { AgentChart } from './agent-chart';
import { AgentEyeIcon } from './agent-eye-icon';
import { AgentSteps } from './agent-steps';
import type { AgentMessage } from '../models';

@Component({
  selector: 'agent-chat-message',
  standalone: true,
  imports: [AgentSteps, MarkdownPipe, Icon, AgentChart, AgentEyeIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full flex gap-3 items-start" [class.justify-end]="isUser()">
      @if (!isUser()) {
        <div
          class="w-10 h-10 rounded-full grid place-items-center shrink-0 font-semibold text-[12px] text-white"
          [style.background]="avatarBg()"
        >
          <agent-eye-icon [size]="18" [tracking]="tracking()" />
        </div>
      }

      @if (isUser()) {
        <div
          class="chat-message__bubble chat-message__bubble--user text-[13.5px] leading-relaxed px-3.5 py-2.5 rounded-2xl border bg-brand text-white border-transparent whitespace-pre-wrap break-words"
        >
          {{ message().content }}
        </div>
        <div
          class="w-10 h-10 rounded-full grid place-items-center shrink-0 font-semibold text-[12px] text-white"
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

          @if (chart(); as chartData) {
            @if (chartAccepted()) {
              <agent-chart [payload]="chartData" (openCase)="openCase.emit($event)" />
            } @else {
              <button
                type="button"
                class="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-ink bg-brand-soft border border-line rounded-lg px-2.5 py-1.5 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                (click)="acceptChart.emit(message().id)"
              >
                <ui-icon name="bar_chart" [size]="15" />
                Ver como gráfico
              </button>
            }
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
  readonly acceptChart = output<string>();

  protected readonly isUser = computed(() => this.message().role === 'user');
  protected readonly hasContent = computed(() => this.message().content.length > 0);
  protected readonly isEmpty = computed(() => !this.isUser() && !this.hasContent());
  protected readonly steps = computed(() => (this.isUser() ? [] : (this.message().steps ?? [])));
  protected readonly chart = computed(() => this.message().chart ?? null);
  protected readonly chartAccepted = computed(() => this.message().chartAccepted === true);

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
