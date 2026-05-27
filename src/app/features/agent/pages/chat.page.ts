import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { AgentApi } from '@core/api/clients/agent.api';
import { firstValueFrom } from 'rxjs';
import { ChatMessage } from '../components/chat-message';
import { VoiceEqualizer } from '../components/voice-equalizer';
import { AgentStore } from '../services/agent.store';
import { VoiceRecorderService } from '../services/voice-recorder.service';

const SUGGESTIONS = [
  '¿Cuáles son los 5 siniestros con mayor riesgo?',
  '¿Qué proveedores concentran más alertas?',
  '¿Qué ramos tienen mayor porcentaje sospechoso?',
  'Resumen ejecutivo de casos críticos',
  '¿Qué documentos faltan en los casos críticos?',
  '¿Qué patrones se repiten?',
];

@Component({
  selector: 'page-chat',
  standalone: true,
  imports: [Button, Icon, ChatMessage, VoiceEqualizer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1 flex items-center gap-2.5">
          <span
            class="w-8 h-8 rounded-md grid place-items-center"
            style="background: linear-gradient(135deg, var(--brand), var(--brand-2)); box-shadow: 0 4px 12px color-mix(in oklch, var(--brand) 30%, transparent);"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
                stroke="white"
                stroke-width="2"
                stroke-linejoin="round"
              />
              <circle cx="12" cy="12" r="3" stroke="white" stroke-width="2" />
            </svg>
          </span>
          Centinela IA
        </h1>
        <p class="text-ink-3 text-[13.5px] m-0">
          Conversa con tu bandeja. Pregúntame por casos, patrones, proveedores o ramos.
        </p>
      </div>
      <div class="flex gap-2">
        <ui-button (click)="reset()">
          <ui-icon name="refresh" [size]="13" />
          Nueva conversación
        </ui-button>
      </div>
    </div>

    <div
      class="grid grid-rows-[1fr_auto] bg-surface border border-line rounded-xl shadow-2 overflow-hidden h-[calc(100vh-150px)] max-h-[880px]"
    >
      <div #scroll class="overflow-y-auto scroll-pretty px-8 pt-7 pb-3 flex flex-col gap-5">
        @for (m of store.messages(); track m.id; let last = $last) {
          <agent-chat-message
            [message]="m"
            [streaming]="last && m.role === 'assistant' && !store.thinking()"
            (openCase)="openCase($event)"
          />
        }
        @if (store.thinking()) {
          <div class="max-w-[720px] flex gap-3.5">
            <div
              class="w-7 h-7 rounded-full grid place-items-center shrink-0"
              style="background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
                  stroke="white"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
                <circle cx="12" cy="12" r="3" stroke="white" stroke-width="2" />
              </svg>
            </div>
            <div class="text-[13.5px] px-3.5 py-3.5 rounded-2xl border border-line bg-surface">
              <span class="dots"><span></span><span></span><span></span></span>
            </div>
          </div>
        }
      </div>

      <div class="border-t border-line px-4 py-3.5 bg-surface">
        <div
          class="chat-composer"
          [class.chat-composer--recording]="voice.recording()"
          [class.chat-composer--transcribing]="transcribing()"
        >
          @if (voice.recording()) {
            <div class="chat-composer__voice">
              <span class="chat-composer__pulse" aria-hidden="true"></span>
              <agent-voice-equalizer [live]="true" [active]="true" />
              <div class="chat-composer__voice-copy">
                <span class="chat-composer__voice-title">Escuchando tu voz</span>
                <span class="chat-composer__voice-hint">Pulsa detener cuando termines</span>
              </div>
            </div>
          } @else if (transcribing()) {
            <div class="chat-composer__voice chat-composer__voice--transcribing">
              <agent-voice-equalizer [active]="true" [processing]="true" />
              <div class="chat-composer__voice-copy">
                <span class="chat-composer__voice-title">Transcribiendo…</span>
                <span class="chat-composer__voice-hint">Convirtiendo audio a texto</span>
              </div>
            </div>
          } @else {
            <textarea
              #ta
              rows="1"
              class="chat-composer__input"
              placeholder="Pregunta a Centinela…  (Shift+Enter para nueva línea)"
              [value]="input()"
              (input)="onInput($any($event.target).value)"
              (keydown)="onKey($event)"
            ></textarea>
          }

          <div class="chat-composer__actions">
            @if (voiceSupported()) {
              <button
                type="button"
                class="chat-composer__icon-btn"
                [class.chat-composer__icon-btn--recording]="voice.recording()"
                [disabled]="store.thinking() || transcribing()"
                (click)="toggleVoice()"
                [attr.aria-label]="voice.recording() ? 'Detener grabación' : 'Grabar mensaje de voz'"
              >
                @if (voice.recording()) {
                  <span class="chat-composer__icon-wrap">
                    <ui-icon name="stop" [size]="22" [weight]="600" />
                  </span>
                } @else {
                  <span class="chat-composer__icon-wrap">
                    <ui-icon name="mic" [size]="22" [weight]="500" />
                  </span>
                }
              </button>
            }

            <button
              type="button"
              class="chat-composer__send"
              [disabled]="!input().trim() || store.thinking() || transcribing() || voice.recording()"
              (click)="send()"
              aria-label="Enviar mensaje"
            >
              <span class="chat-composer__icon-wrap chat-composer__icon-wrap--send">
                <ui-icon name="send" [size]="22" [weight]="500" [fill]="true" />
              </span>
            </button>
          </div>
        </div>

        @if (voiceError()) {
          <p class="text-[12px] text-danger m-0 mt-2">{{ voiceError() }}</p>
        }

        <div class="flex gap-2 flex-wrap mt-2.5">
          @for (s of suggestions; track s) {
            <button type="button" class="chat-suggestion" (click)="quickSend(s)">
              <span class="chat-suggestion__icon">
                <ui-icon name="visibility" [size]="15" [weight]="500" />
              </span>
              <span class="chat-suggestion__label">{{ s }}</span>
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .chat-composer {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 56px;
        padding: 6px 8px 6px 14px;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: var(--bg-soft);
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease,
          background 160ms ease;
      }

      .chat-composer:focus-within {
        border-color: color-mix(in oklch, var(--brand) 45%, var(--border));
        box-shadow: 0 0 0 3px color-mix(in oklch, var(--brand) 14%, transparent);
      }

      .chat-composer--recording,
      .chat-composer--transcribing {
        border-color: color-mix(in oklch, var(--brand) 55%, var(--border));
        background: linear-gradient(
          135deg,
          color-mix(in oklch, var(--brand-soft) 85%, white),
          var(--bg-soft)
        );
        box-shadow:
          0 0 0 3px color-mix(in oklch, var(--brand) 16%, transparent),
          0 8px 24px color-mix(in oklch, var(--brand) 10%, transparent);
      }

      .chat-composer__input {
        flex: 1;
        resize: none;
        border: 0;
        background: transparent;
        outline: 0;
        color: var(--ink);
        font-size: 14px;
        max-height: 120px;
        min-height: 44px;
        margin: 0;
        padding: 11px 6px;
        line-height: 22px;
        box-sizing: border-box;
        vertical-align: middle;
      }

      .chat-composer__input::placeholder {
        color: var(--ink-3);
        line-height: 22px;
      }

      .chat-composer__voice {
        flex: 1;
        min-height: 44px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 4px;
      }

      .chat-composer__voice--transcribing agent-voice-equalizer {
        opacity: 0.85;
      }

      .chat-composer__pulse {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--brand);
        flex-shrink: 0;
        box-shadow: 0 0 0 0 color-mix(in oklch, var(--brand) 40%, transparent);
        animation: chat-voice-pulse 1.4s ease-out infinite;
      }

      .chat-composer__voice-copy {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .chat-composer__voice-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--brand-ink);
      }

      .chat-composer__voice-hint {
        font-size: 11.5px;
        color: var(--ink-3);
      }

      .chat-composer__actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
        align-self: center;
      }

      .chat-composer__icon-wrap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        line-height: 0;
      }

      .chat-composer__icon-wrap--send {
        transform: translateX(-1px);
      }

      .chat-composer__icon-btn,
      .chat-composer__send {
        width: 44px;
        height: 44px;
        border-radius: 13px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1px solid transparent;
        cursor: pointer;
        transition:
          transform 120ms ease,
          background 120ms ease,
          border-color 120ms ease,
          box-shadow 120ms ease,
          opacity 120ms ease;
      }

      .chat-composer__icon-btn ::ng-deep .material-symbols-outlined,
      .chat-composer__send ::ng-deep .material-symbols-outlined {
        display: block;
        line-height: 1;
      }

      .chat-composer__icon-btn {
        background: var(--bg-elev);
        border-color: var(--border);
        color: var(--ink-2);
        box-shadow: var(--shadow-1);
      }

      .chat-composer__icon-btn:hover:not(:disabled) {
        background: var(--brand-soft);
        border-color: color-mix(in oklch, var(--brand) 25%, var(--border));
        color: var(--brand-ink);
      }

      .chat-composer__icon-btn--recording {
        background: linear-gradient(135deg, var(--brand), var(--brand-2));
        border-color: transparent;
        color: white;
        box-shadow: 0 6px 16px color-mix(in oklch, var(--brand) 28%, transparent);
      }

      .chat-composer__icon-btn--recording:hover:not(:disabled) {
        transform: scale(1.03);
        background: linear-gradient(135deg, var(--brand-2), var(--brand));
        color: white;
      }

      .chat-composer__send {
        background: linear-gradient(135deg, var(--brand), var(--brand-2));
        color: white;
        box-shadow: 0 6px 16px color-mix(in oklch, var(--brand) 24%, transparent);
      }

      .chat-composer__send:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 8px 20px color-mix(in oklch, var(--brand) 32%, transparent);
      }

      .chat-composer__icon-btn:disabled,
      .chat-composer__send:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .chat-suggestion {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 15px;
        min-height: 38px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: var(--bg-elev);
        color: var(--ink-2);
        font-size: 13px;
        font-weight: 500;
        line-height: 1;
        cursor: pointer;
        box-shadow: var(--shadow-1);
        transition:
          background 120ms ease,
          border-color 120ms ease,
          color 120ms ease,
          transform 120ms ease;
      }

      .chat-suggestion__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        line-height: 0;
      }

      .chat-suggestion__icon ::ng-deep .material-symbols-outlined {
        display: block;
        line-height: 1;
      }

      .chat-suggestion__label {
        display: block;
        line-height: 1.25;
      }

      .chat-suggestion:hover {
        background: var(--brand-soft);
        border-color: color-mix(in oklch, var(--brand) 22%, var(--border));
        color: var(--brand-ink);
        transform: translateY(-1px);
      }

      @keyframes chat-voice-pulse {
        0% {
          box-shadow: 0 0 0 0 color-mix(in oklch, var(--brand) 45%, transparent);
        }
        70% {
          box-shadow: 0 0 0 10px color-mix(in oklch, var(--brand) 0%, transparent);
        }
        100% {
          box-shadow: 0 0 0 0 color-mix(in oklch, var(--brand) 0%, transparent);
        }
      }
    `,
  ],
})
export class ChatPage implements AfterViewChecked {
  protected readonly store = inject(AgentStore);
  protected readonly voice = inject(VoiceRecorderService);
  private readonly agentApi = inject(AgentApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly suggestions = SUGGESTIONS;
  protected readonly input = signal<string>('');
  protected readonly transcribing = signal<boolean>(false);
  protected readonly voiceError = signal<string | null>(null);
  protected readonly voiceSupported = signal<boolean>(false);

  private readonly scrollEl = viewChild<ElementRef<HTMLDivElement>>('scroll');
  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('ta');

  constructor() {
    afterNextRender(() => {
      this.voiceSupported.set(this.voice.isSupported());
    });

    const caseId = this.route.snapshot.queryParamMap.get('case');
    if (caseId) this.store.primeForCase(caseId);

    effect(() => {
      // touch signals so we auto-scroll on changes
      this.store.messages();
      this.store.thinking();
      queueMicrotask(() => this.scrollToBottom());
    });
  }

  ngAfterViewChecked(): void {
    const textareaElement = this.textarea()?.nativeElement;
    if (textareaElement) {
      const minHeight = 44;
      textareaElement.style.height = 'auto';
      textareaElement.style.height =
        Math.max(minHeight, Math.min(120, textareaElement.scrollHeight)) + 'px';
    }
  }

  protected onInput(value: string): void {
    this.input.set(value);
  }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  protected send(): void {
    const text = this.input();
    if (!text.trim()) return;
    this.input.set('');
    void this.store.ask(text);
  }

  protected async toggleVoice(): Promise<void> {
    this.voiceError.set(null);

    if (!this.voiceSupported()) {
      this.voiceError.set('Tu navegador no soporta grabación de voz.');
      return;
    }

    if (this.voice.recording()) {
      this.transcribing.set(true);
      try {
        const audioBlob = await this.voice.stop();
        const filename = this.voice.filenameForBlob(audioBlob);
        const response = await firstValueFrom(this.agentApi.transcribe(audioBlob, filename));
        const text = response.text.trim();
        if (!text) {
          this.voiceError.set('No se detectó voz en la grabación.');
          return;
        }
        this.input.set(text);
        const textarea = this.textarea()?.nativeElement;
        if (textarea) {
          textarea.focus();
        }
      } catch {
        this.voiceError.set('No se pudo transcribir el audio. Verifica permisos del micrófono y el backend.');
      } finally {
        this.transcribing.set(false);
      }
      return;
    }

    try {
      await this.voice.start();
    } catch {
      this.voiceError.set('No se pudo acceder al micrófono. Revisa los permisos del navegador.');
    }
  }

  protected quickSend(text: string): void {
    void this.store.ask(text);
  }

  protected reset(): void {
    this.store.reset();
  }

  protected openCase(id: string): void {
    void this.router.navigate(['/claims', id]);
  }

  private scrollToBottom(): void {
    const el = this.scrollEl()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
