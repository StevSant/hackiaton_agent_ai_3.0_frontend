import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AgentApi } from '@core/api/clients/agent.api';
import { TextToSpeechService } from '@core/tts/text-to-speech.service';
import { Icon } from '@shared/ui/icon';
import { AgentEyeIcon } from '../components/agent-eye-icon';
import { ChatMessage } from '../components/chat-message';
import { ConversationRenameModal } from '../components/conversation-rename-modal';
import { ConversationsSidebar } from '../components/conversations-sidebar';
import { TtsPlayer } from '../components/tts-player';
import { VoiceEqualizer } from '../components/voice-equalizer';
import type { ConversationSummary } from '../models';
import { ProvidersStore } from '@core/state/providers.store';
import { AgentStore } from '../services/agent.store';
import { ChatUiPrefsStore } from '../services/chat-ui-prefs.store';
import { ConversationsStore } from '../services/conversations.store';
import { VoiceRecorderService } from '../services/voice-recorder.service';

const SUGGESTIONS = [
  '¿Cuáles son los 5 siniestros con mayor riesgo?',
  '¿Qué proveedores concentran más alertas?',
  '¿Qué ramos tienen mayor porcentaje sospechoso?',
  'Resumen ejecutivo de casos críticos',
  '¿Qué documentos faltan en los casos críticos?',
  '¿Qué patrones se repiten?',
];

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

@Component({
  selector: 'page-chat',
  standalone: true,
  imports: [
    Icon,
    ChatMessage,
    AgentEyeIcon,
    ConversationsSidebar,
    ConversationRenameModal,
    VoiceEqualizer,
    TtsPlayer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full min-h-0 bg-surface">
      <header class="chat-panel__toolbar shrink-0">
        <button
          type="button"
          class="chat-panel__tool-btn"
          (click)="historyOpen.set(true)"
          aria-label="Abrir historial de conversaciones"
          title="Historial"
        >
          <ui-icon name="history" [size]="18" />
        </button>

        <div class="chat-panel__toolbar-actions">
          <button
            type="button"
            class="chat-panel__tool-btn"
            [class.text-brand-ink]="uiPrefs.showCharts()"
            (click)="uiPrefs.toggleCharts()"
            [attr.aria-label]="uiPrefs.showCharts() ? 'Ocultar gráficos generados' : 'Mostrar gráficos generados'"
            [attr.title]="uiPrefs.showCharts() ? 'Ocultar gráficos generados' : 'Mostrar gráficos generados'"
          >
            <ui-icon [name]="uiPrefs.showCharts() ? 'insert_chart' : 'bar_chart_off'" [size]="18" />
          </button>

          <button
            type="button"
            class="chat-panel__tool-btn chat-panel__tool-btn--primary"
            (click)="newChat()"
            aria-label="Nueva conversación"
            title="Nueva conversación"
          >
            <ui-icon name="add" [size]="20" [weight]="600" />
          </button>
        </div>
      </header>

      <div
        #scroll
        class="flex-1 min-h-0 overflow-y-auto scroll-pretty px-4 pt-3 pb-3 flex flex-col gap-4"
      >
        <!-- Spacer pushes the message stack to the bottom when content is short.
             When overflow kicks in, this collapses to 0 and the scroll behaves
             normally — same trick WhatsApp / ChatGPT use to make sparse
             conversations feel anchored to the composer. -->
        <div class="flex-1 min-h-0" aria-hidden="true"></div>

        @for (m of store.messages(); track m.id; let last = $last) {
          <agent-chat-message
            [message]="m"
            [streaming]="last && m.role === 'assistant' && store.isResponding()"
            [tracking]="last && m.role === 'assistant' && store.isResponding()"
            [ttsSupported]="tts.supported"
            [ttsActive]="tts.activeId() === m.id"
            [ttsState]="tts.state()"
            (openCase)="openCase($event)"
            (ttsToggle)="onTtsToggle($event)"
            (acceptChart)="store.acceptChart($event)"
          />
        }
        @if (store.thinking()) {
          <div class="w-full flex gap-3 items-start">
            <div
              class="w-10 h-10 rounded-full grid place-items-center shrink-0"
              style="background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);"
            >
              <agent-eye-icon [size]="18" [tracking]="store.isResponding()" />
            </div>
            <div
              class="text-[13.5px] px-3.5 py-3.5 rounded-2xl border border-line bg-surface min-w-0 max-w-[min(720px,calc(100%-3.25rem))]"
            >
              <span class="dots"><span></span><span></span><span></span></span>
            </div>
          </div>
        }
      </div>

      <footer class="border-t border-line px-3 py-3 bg-surface min-w-0 shrink-0">
        @if (tts.activeId() !== null) {
          <div class="mb-2.5">
            <agent-tts-player
              [state]="tts.state()"
              [progress]="tts.progress()"
              [rate]="tts.rate()"
              [volume]="tts.volume()"
              [voices]="tts.voices"
              [voice]="tts.voice()"
              (toggle)="tts.toggleActive()"
              (stop)="tts.stop()"
              (seek)="tts.seekToFraction($event)"
              (rateChange)="tts.setRate($event)"
              (volumeChange)="tts.setVolume($event)"
              (voiceChange)="tts.setVoice($event)"
            />
          </div>
        }
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
                [attr.aria-label]="
                  voice.recording() ? 'Detener grabación' : 'Grabar mensaje de voz'
                "
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
              [disabled]="
                !input().trim() || store.thinking() || transcribing() || voice.recording()
              "
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

        <section class="chat-suggestions" aria-label="Preguntas rápidas">
          @if (showSuggestions()) {
            <div class="chat-suggestions__header">
              <p class="chat-suggestions__title">Preguntas rápidas</p>
              @if (hasUserMessages()) {
                <button
                  type="button"
                  class="chat-suggestions__toggle"
                  (click)="suggestionsOpen.set(false)"
                  aria-label="Ocultar preguntas rápidas"
                  title="Ocultar"
                >
                  <ui-icon name="expand_less" [size]="16" />
                </button>
              }
            </div>
            <div class="chat-suggestions__grid">
              @for (s of suggestions; track s) {
                <button type="button" class="chat-suggestion" (click)="quickSend(s)">
                  <span class="chat-suggestion__icon" aria-hidden="true">
                    <agent-eye-icon [size]="15" />
                  </span>
                  <span class="chat-suggestion__label">{{ s }}</span>
                </button>
              }
            </div>
          } @else {
            <button
              type="button"
              class="chat-suggestions__pill"
              (click)="suggestionsOpen.set(true)"
              aria-label="Mostrar preguntas rápidas"
            >
              <span class="chat-suggestions__pill-dot" aria-hidden="true">
                <agent-eye-icon [size]="13" />
              </span>
              <span class="chat-suggestions__pill-label">Preguntas rápidas</span>
              <ui-icon name="expand_more" [size]="16" />
            </button>
          }
        </section>
      </footer>
    </div>

    <!-- History drawer (slide-over from the left) -->
    @if (historyOpen()) {
      <div
        class="fixed inset-0 z-40 bg-ink/35 backdrop-blur-[1.5px]"
        (click)="historyOpen.set(false)"
        aria-hidden="true"
      ></div>
      <aside
        class="fixed left-0 top-0 bottom-0 z-50 w-[320px] max-w-[88vw] bg-surface border-r border-line shadow-pop flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Historial de conversaciones"
      >
        <header
          class="flex items-center justify-between gap-3 px-3.5 py-3 border-b border-line shrink-0"
        >
          <h2 class="text-[14.5px] font-semibold tracking-tight m-0">Historial</h2>
          <button
            type="button"
            class="rounded-sm w-8 h-8 grid place-items-center text-ink-3 hover:bg-hover hover:text-ink"
            (click)="historyOpen.set(false)"
            aria-label="Cerrar"
          >
            <ui-icon name="close" [size]="18" />
          </button>
        </header>
        <div class="flex-1 min-h-0 flex flex-col">
          <agent-conversations-sidebar
            class="flex-1 min-h-0 flex flex-col"
            [items]="conversations.list()"
            [activeId]="activeConversationId()"
            [query]="conversations.query()"
            [loading]="conversations.loading()"
            (select)="onDrawerSelect($event)"
            (rename)="onRename($event)"
            (remove)="onRemove($event)"
            (newChat)="onDrawerNewChat()"
            (queryChange)="conversations.setQuery($event)"
          />
        </div>
      </aside>
    }

    <agent-conversation-rename-modal
      [open]="renameModalOpen()"
      [currentTitle]="renameTarget()?.title ?? ''"
      (confirm)="confirmRename($event)"
      (cancel)="renameModalOpen.set(false)"
    />
  `,
  styleUrl: './chat.page.css',
})
export class ChatPage implements AfterViewChecked {
  protected readonly store = inject(AgentStore);
  protected readonly conversations = inject(ConversationsStore);
  protected readonly voice = inject(VoiceRecorderService);
  protected readonly uiPrefs = inject(ChatUiPrefsStore);
  private readonly providers = inject(ProvidersStore);
  protected readonly tts = inject(TextToSpeechService);
  private readonly agentApi = inject(AgentApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly suggestions = SUGGESTIONS;
  protected readonly input = signal<string>('');
  protected readonly activeConversationId = signal<string | null>(null);
  protected readonly renameModalOpen = signal<boolean>(false);
  protected readonly renameTarget = signal<ConversationSummary | null>(null);
  protected readonly historyOpen = signal<boolean>(false);
  protected readonly transcribing = signal<boolean>(false);
  protected readonly voiceError = signal<string | null>(null);
  protected readonly voiceSupported = signal<boolean>(false);
  protected readonly suggestionsOpen = signal<boolean | null>(null);
  protected readonly hasUserMessages = computed(() =>
    this.store.messages().some((m) => m.role === 'user'),
  );
  protected readonly showSuggestions = computed(
    () => this.suggestionsOpen() ?? !this.hasUserMessages(),
  );

  private readonly scrollEl = viewChild<ElementRef<HTMLDivElement>>('scroll');
  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('ta');

  constructor() {
    afterNextRender(() => {
      this.voiceSupported.set(this.voice.isSupported());
    });

    void this.conversations.refresh();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const convId = params.get('conversation');
      if (convId) {
        if (convId !== this.activeConversationId()) {
          this.suggestionsOpen.set(null);
        }
        this.activeConversationId.set(convId);
        void this.store.loadConversation(convId);
      } else {
        const list = this.conversations.list();
        if (list.length > 0) {
          void this.router.navigate([], {
            queryParams: { conversation: list[0].id },
            replaceUrl: true,
          });
        } else {
          const newId = generateUuid();
          void this.router.navigate([], {
            queryParams: { conversation: newId },
            replaceUrl: true,
          });
        }
      }
    });

    effect(() => {
      this.store.messages();
      this.store.thinking();
      queueMicrotask(() => this.scrollToBottom());
    });
  }

  ngAfterViewChecked(): void {
    const textareaElement = this.textarea()?.nativeElement;
    if (textareaElement) {
      const minHeight = 44;
      const maxHeight = 200;
      textareaElement.style.height = 'auto';
      textareaElement.style.height =
        Math.max(minHeight, Math.min(maxHeight, textareaElement.scrollHeight)) + 'px';
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
    const convId = this.activeConversationId() ?? undefined;
    void this.store.ask(text, convId);
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
        this.voiceError.set(
          'No se pudo transcribir el audio. Verifica permisos del micrófono y el backend.',
        );
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
    const convId = this.activeConversationId() ?? undefined;
    void this.store.ask(text, convId);
  }

  protected onTtsToggle(id: string): void {
    const message = this.store.messages().find((m) => m.id === id);
    if (message) this.tts.toggle(id, message.content);
  }

  protected newChat(): void {
    this.tts.stop();
    this.input.set('');
    this.voiceError.set(null);
    this.suggestionsOpen.set(null);
    const id = generateUuid();
    this.activeConversationId.set(id);
    this.store.startNewConversation(id);
    void this.router.navigate([], {
      queryParams: { conversation: id },
      replaceUrl: false,
    });
  }

  protected onSelect(id: string): void {
    void this.router.navigate([], {
      queryParams: { conversation: id },
      replaceUrl: false,
    });
  }

  protected onDrawerSelect(id: string): void {
    this.historyOpen.set(false);
    this.onSelect(id);
  }

  protected onDrawerNewChat(): void {
    this.historyOpen.set(false);
    this.newChat();
  }

  protected onRename(item: ConversationSummary): void {
    this.renameTarget.set(item);
    this.renameModalOpen.set(true);
  }

  protected confirmRename(title: string): void {
    const target = this.renameTarget();
    if (!target) return;
    void this.conversations.rename(target.id, title);
    this.renameModalOpen.set(false);
    this.renameTarget.set(null);
  }

  protected onRemove(id: string): void {
    const confirmed = window.confirm(
      '¿Eliminar esta conversación? Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;
    void this.conversations.remove(id);
    if (this.activeConversationId() === id) {
      const remaining = this.conversations.list().filter((c) => c.id !== id);
      if (remaining.length > 0) {
        void this.router.navigate([], {
          queryParams: { conversation: remaining[0].id },
          replaceUrl: false,
        });
      } else {
        this.newChat();
      }
    }
  }

  protected openCase(idOrLabel: string): void {
    // Claim chips emit raw IDs (SIN-…, IMP-…, CL-…) — route to the case page.
    if (/^(SIN|IMP|CL)-/i.test(idOrLabel)) {
      void this.router.navigate(['/claims', idOrLabel]);
      return;
    }
    // Provider names emitted by aggregate charts — look up the id and route.
    const match = this.providers
      .providers()
      .find((p) => p.nombre.toLowerCase() === idOrLabel.toLowerCase());
    if (match) {
      void this.router.navigate(['/providers', match.id]);
    }
  }

  private scrollToBottom(): void {
    const el = this.scrollEl()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
