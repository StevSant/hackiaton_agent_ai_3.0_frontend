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
import { DocumentCanvasPanel } from '../components/document-canvas-panel';
import { TtsPlayer } from '../components/tts-player';
import { VoiceEqualizer } from '../components/voice-equalizer';
import type { ConversationSummary } from '../models';
import type { ChatContext } from '../models/chat-context';
import { ProvidersStore } from '@core/state/providers.store';
import { AseguradosStore } from '@core/state/asegurados.store';
import { AgentStore } from '../services/agent.store';
import { ChatUiPrefsStore } from '../services/chat-ui-prefs.store';
import { ConversationsStore } from '../services/conversations.store';
import { VoiceRecorderService } from '../services/voice-recorder.service';
import { CASE_CHAT_SUGGESTIONS } from '../utils/case-context-message';
import { PROVIDER_CHAT_SUGGESTIONS } from '../utils/provider-context-message';
import { ASEGURADO_CHAT_SUGGESTIONS } from '../utils/asegurado-context-message';
import { ClaimsStore } from '@core/state/claims.store';
import { formatMoneyShort, ramoLabel, riskTierLabel } from '@shared/utils';

const SUGGESTIONS = [
  '¿Cuáles son los 5 siniestros con mayor riesgo?',
  'Generá un informe en Word del top 10 siniestros con un gráfico incluido',
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
    DocumentCanvasPanel,
    VoiceEqualizer,
    TtsPlayer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Split wrapper: chat left + artifact panel right -->
    <div class="chat-split flex flex-row flex-1 min-h-0 h-full overflow-hidden">

    <!-- LEFT: chat column — compresses when panel is open -->
    <div
      class="chat-page flex flex-col flex-1 min-h-0 h-full bg-surface transition-all duration-300"
      [class.lg:max-w-[50%]]="store.activeDocument() !== null"
    >
      <header class="chat-panel__toolbar shrink-0">
        <div class="chat-panel__toolbar-start">
          <button
            type="button"
            class="chat-panel__tool-btn"
            (click)="historyOpen.set(true)"
            aria-label="Abrir historial de conversaciones"
            title="Historial"
          >
            <ui-icon name="history" [size]="18" />
          </button>
        </div>

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

      @switch (store.chatContext()?.kind) {
        @case ('claim') {
          @if (contextClaim(); as claim) {
            <div class="chat-case-context shrink-0">
              <div class="chat-case-context__copy">
                <span class="chat-case-context__eyebrow">Contexto del caso</span>
                <div class="chat-case-context__title-row">
                  <span class="chat-case-context__id">{{ claim.id }}</span>
                  <span class="chat-case-context__meta">{{ ramoLabel(claim.ramo) }} · score {{ claim.score }}</span>
                </div>
                <p class="chat-case-context__subtitle">{{ claim.cobertura }} · {{ claim.asegurado }}</p>
                <p class="chat-case-context__risk">{{ riskTierLabel(claim.nivel) }} · {{ formatMoneyShort(claim.monto_reclamado) }}</p>
              </div>
              <div class="chat-case-context__actions">
                <button type="button" class="chat-case-context__link" (click)="openCase(claim.id)">
                  Ver caso
                </button>
                <button
                  type="button"
                  class="chat-case-context__clear"
                  (click)="clearCaseContext()"
                  aria-label="Quitar contexto del caso"
                >
                  <ui-icon name="close" [size]="14" />
                </button>
              </div>
            </div>
          }
        }
        @case ('provider') {
          @if (contextProvider(); as p) {
            <div class="chat-case-context shrink-0">
              <div class="chat-case-context__copy">
                <span class="chat-case-context__eyebrow">Contexto del proveedor</span>
                <div class="chat-case-context__title-row">
                  <span class="chat-case-context__id">{{ p.nombre }}</span>
                  @if (p.listaRestrictiva) {
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-tier-red-soft text-tier-red-ink">Lista restrictiva</span>
                  }
                </div>
                <p class="chat-case-context__subtitle">{{ p.tipo }} · {{ p.ciudad }}</p>
                <p class="chat-case-context__risk">{{ p.alertas }} alertas / {{ p.casos }} casos · {{ contextProviderRiskPct() }}% riesgo</p>
              </div>
              <div class="chat-case-context__actions">
                <button type="button" class="chat-case-context__link" (click)="openProvider(p.id)">
                  Ver proveedor
                </button>
                <button
                  type="button"
                  class="chat-case-context__clear"
                  (click)="clearCaseContext()"
                  aria-label="Quitar contexto del proveedor"
                >
                  <ui-icon name="close" [size]="14" />
                </button>
              </div>
            </div>
          }
        }
        @case ('asegurado') {
          @if (contextAsegurado(); as a) {
            <div class="chat-case-context shrink-0">
              <div class="chat-case-context__copy">
                <span class="chat-case-context__eyebrow">Contexto del asegurado</span>
                <div class="chat-case-context__title-row">
                  <span class="chat-case-context__id">{{ a.nombre }}</span>
                  @if (a.mora_actual) {
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-tier-red-soft text-tier-red-ink">Mora</span>
                  }
                  @if (a.segmento) {
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-soft text-ink-2 border border-line">{{ a.segmento }}</span>
                  }
                </div>
                <p class="chat-case-context__subtitle">{{ a.ciudad }}</p>
                <p class="chat-case-context__risk">{{ a.alertas }} alertas / {{ a.casos }} casos · {{ contextAseguradoRiskPct() }}% riesgo</p>
              </div>
              <div class="chat-case-context__actions">
                <button type="button" class="chat-case-context__link" (click)="openAsegurado(a.id)">
                  Ver asegurado
                </button>
                <button
                  type="button"
                  class="chat-case-context__clear"
                  (click)="clearCaseContext()"
                  aria-label="Quitar contexto del asegurado"
                >
                  <ui-icon name="close" [size]="14" />
                </button>
              </div>
            </div>
          }
        }
      }

      <div
        #scroll
        class="chat-page__messages flex-1 min-h-0 overflow-y-auto scroll-pretty px-4 pt-3 pb-3 flex flex-col gap-4"
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
            (toggleChart)="store.toggleChart($event)"
            (toggleTable)="store.toggleTable($event)"
            (openCanvas)="onOpenCanvas($event)"
            (chartRendered)="store.setLatestChartImage($event)"
          />
        }
        @if (store.thinking()) {
          <div class="w-full flex gap-3 items-start">
            <div
              class="w-11 h-11 sm:w-12 sm:h-12 rounded-full grid place-items-center shrink-0"
              style="background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);"
            >
              <agent-eye-icon [size]="24" [tracking]="store.isResponding()" />
            </div>
            <div
              class="text-[13.5px] px-3.5 py-3.5 rounded-2xl border border-line bg-surface min-w-0 max-w-[min(720px,calc(100%-3.75rem))]"
            >
              <span class="dots"><span></span><span></span><span></span></span>
            </div>
          </div>
        }
      </div>

      <footer class="chat-page__footer border-t border-line px-3 py-3 bg-surface min-w-0 shrink-0">
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
        @if (store.pendingDocumentContext(); as ref) {
          <div
            class="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl border border-brand/30 bg-brand-soft text-[12.5px] text-brand-ink"
          >
            <ui-icon name="description" [size]="16" class="shrink-0" />
            <span class="min-w-0 flex-1 truncate">
              Mejorando: <span class="font-semibold">«{{ ref.titulo }}»</span>
            </span>
            <button
              type="button"
              class="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              (click)="store.clearPendingDocumentContext()"
              aria-label="Quitar referencia del documento"
            >
              <ui-icon name="close" [size]="15" />
            </button>
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
            <div class="chat-suggestions__row">
              <button
                type="button"
                class="chat-suggestions__nav"
                (click)="scrollSuggestions('prev')"
                [disabled]="suggestionsAtStart()"
                aria-label="Ver preguntas anteriores"
                title="Anterior"
              >
                <ui-icon name="chevron_left" [size]="18" />
              </button>
              <div
                #suggestionsTrack
                class="chat-suggestions__track"
                (scroll)="updateSuggestionsScrollState()"
              >
                @for (s of activeSuggestions(); track s) {
                  <button type="button" class="chat-suggestion" (click)="quickSend(s)">
                    <span class="chat-suggestion__icon" aria-hidden="true">
                      <agent-eye-icon [size]="15" />
                    </span>
                    <span class="chat-suggestion__label">{{ s }}</span>
                  </button>
                }
              </div>
              <button
                type="button"
                class="chat-suggestions__nav"
                (click)="scrollSuggestions('next')"
                [disabled]="suggestionsAtEnd()"
                aria-label="Ver más preguntas"
                title="Siguiente"
              >
                <ui-icon name="chevron_right" [size]="18" />
              </button>
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
    <!-- END chat column -->

    <!-- RIGHT: artifact canvas panel — slides in when a document is active -->
    @if (store.activeDocument(); as activeDoc) {
      <aside
        class="canvas-panel flex flex-col min-h-0 border-l border-line bg-surface transition-all duration-300 lg:w-1/2 w-full"
        role="complementary"
        aria-label="Panel de documento"
      >
        <document-canvas-panel
          class="flex-1 min-h-0 flex flex-col"
          [doc]="activeDoc"
          [chartImage]="store.latestChartImage()"
          (close)="store.closeDocument()"
          (apply)="onCanvasApply(activeDoc.id, $event)"
          (improveInMainChat)="onImproveInMainChat($event)"
        />
      </aside>
    }

    </div>
    <!-- END split wrapper -->

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
            [items]="conversations.filtered()"
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
  protected readonly claims = inject(ClaimsStore);
  protected readonly voice = inject(VoiceRecorderService);
  protected readonly uiPrefs = inject(ChatUiPrefsStore);
  private readonly providers = inject(ProvidersStore);
  private readonly asegurados = inject(AseguradosStore);
  protected readonly tts = inject(TextToSpeechService);
  private readonly agentApi = inject(AgentApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** IDs generated locally (not yet persisted on the backend). Skip GET for these. */
  private readonly _freshIds = new Set<string>();

  protected readonly formatMoneyShort = formatMoneyShort;
  protected readonly ramoLabel = ramoLabel;
  protected readonly riskTierLabel = riskTierLabel;

  protected readonly contextClaim = computed(() => {
    const ctx = this.store.chatContext();
    if (ctx?.kind !== 'claim') return null;
    return this.claims.findById(ctx.id) ?? null;
  });

  protected readonly contextProvider = computed(() => {
    const ctx = this.store.chatContext();
    if (ctx?.kind !== 'provider') return null;
    return this.providers.providers().find((p) => p.id === ctx.id) ?? null;
  });

  protected readonly contextAsegurado = computed(() => {
    const ctx = this.store.chatContext();
    if (ctx?.kind !== 'asegurado') return null;
    return this.asegurados.findById(ctx.id) ?? null;
  });

  protected readonly contextProviderRiskPct = computed(() => {
    const p = this.contextProvider();
    if (!p || p.casos === 0) return 0;
    return Math.round((p.alertas / p.casos) * 100);
  });

  protected readonly contextAseguradoRiskPct = computed(() => {
    const a = this.contextAsegurado();
    if (!a || a.casos === 0) return 0;
    return Math.round((a.alertas / a.casos) * 100);
  });

  protected readonly activeSuggestions = computed(() => {
    const ctx = this.store.chatContext();
    if (ctx?.kind === 'claim') return [...CASE_CHAT_SUGGESTIONS];
    if (ctx?.kind === 'provider') return [...PROVIDER_CHAT_SUGGESTIONS];
    if (ctx?.kind === 'asegurado') return [...ASEGURADO_CHAT_SUGGESTIONS];
    return SUGGESTIONS;
  });
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
  protected readonly suggestionsAtStart = signal(true);
  protected readonly suggestionsAtEnd = signal(false);

  private readonly scrollEl = viewChild<ElementRef<HTMLDivElement>>('scroll');
  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('ta');
  private readonly suggestionsTrack = viewChild<ElementRef<HTMLDivElement>>('suggestionsTrack');

  constructor() {
    afterNextRender(() => {
      this.voiceSupported.set(this.voice.isSupported());
    });

    void this.conversations.refresh();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const convId = params.get('conversation');
      const caseId = params.get('case');
      const providerId = params.get('provider');
      const aseguradoId = params.get('asegurado');

      // Resolve to a single ChatContext — case wins, then provider, then asegurado.
      const urlCtx: ChatContext =
        caseId      ? { kind: 'claim',     id: caseId }      :
        providerId  ? { kind: 'provider',  id: providerId }  :
        aseguradoId ? { kind: 'asegurado', id: aseguradoId } : null;

      if (convId) {
        if (convId !== this.activeConversationId()) {
          this.suggestionsOpen.set(null);
        }
        this.activeConversationId.set(convId);

        // Entity deep-links (provider/asegurado/case) generate a fresh UUID on the
        // detail page and navigate here with ?conversation=<new-uuid>&provider=<id>.
        // That UUID never existed on the backend, so GETting it would 404.
        // Treat it as fresh — same as a newChat() UUID — so we skip the GET.
        const hasEntityCtx = !!(caseId || providerId || aseguradoId);
        if (hasEntityCtx && !this._freshIds.has(convId)) {
          this._freshIds.add(convId);
        }

        void this.bootstrapConversation(convId, urlCtx);
        return;
      }

      const freshId = generateUuid();
      this._freshIds.add(freshId);
      const extraParams: Record<string, string> = {};
      if (caseId) extraParams['case'] = caseId;
      else if (providerId) extraParams['provider'] = providerId;
      else if (aseguradoId) extraParams['asegurado'] = aseguradoId;

      void this.router.navigate([], {
        queryParams: { conversation: freshId, ...extraParams },
        replaceUrl: true,
      });
    });

    effect(() => {
      this.store.messages();
      this.store.thinking();
      queueMicrotask(() => this.scrollToBottom());
    });

    effect(() => {
      this.activeSuggestions();
      this.showSuggestions();
      queueMicrotask(() => {
        requestAnimationFrame(() => {
          const track = this.suggestionsTrack()?.nativeElement;
          if (track) track.scrollLeft = 0;
          this.updateSuggestionsScrollState();
        });
      });
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
    // First message sent — conversation will now be created on the backend.
    if (convId) this._freshIds.delete(convId);
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
    if (convId) this._freshIds.delete(convId);
    void this.store.ask(text, convId);
  }

  /** Handle (openCanvas) from a chat message — open (or focus) the artifact side panel. */
  protected onOpenCanvas(doc: { titulo: string; contenidoMarkdown: string }): void {
    this.store.openDocument({
      titulo: doc.titulo,
      contenidoMarkdown: doc.contenidoMarkdown,
    });
  }

  /** WYSIWYG edit applied — persist the markdown produced by turndown. */
  protected onCanvasApply(docId: string, markdown: string): void {
    this.store.updateDocumentContent(docId, markdown);
  }

  /**
   * CHANGE 1 — "Mejorar con IA" routes through the MAIN chat. Prefill + focus the
   * main composer with an improve prompt; stash the full document so the next
   * `send()` rides it in `document_context` (the MAIN agent improves it).
   */
  protected onImproveInMainChat(doc: { titulo: string; contenidoMarkdown: string }): void {
    // Stash the document as a REMOVABLE reference (shown as a chip above the
    // composer). No prefilled text — the analyst types their instruction freely;
    // the next send() rides the document in `document_context`.
    this.store.setPendingDocumentContext({
      titulo: doc.titulo,
      contenido_markdown: doc.contenidoMarkdown,
    });
    this.textarea()?.nativeElement.focus();
  }

  protected scrollSuggestions(direction: 'prev' | 'next'): void {
    const track = this.suggestionsTrack()?.nativeElement;
    if (!track) return;

    const scrollStep = Math.max(track.clientWidth * 0.72, 220);
    track.scrollBy({
      left: direction === 'next' ? scrollStep : -scrollStep,
      behavior: 'smooth',
    });

    window.setTimeout(() => this.updateSuggestionsScrollState(), 280);
  }

  protected updateSuggestionsScrollState(): void {
    const track = this.suggestionsTrack()?.nativeElement;
    if (!track) {
      this.suggestionsAtStart.set(true);
      this.suggestionsAtEnd.set(true);
      return;
    }

    const edgeTolerance = 4;
    this.suggestionsAtStart.set(track.scrollLeft <= edgeTolerance);
    this.suggestionsAtEnd.set(
      track.scrollLeft + track.clientWidth >= track.scrollWidth - edgeTolerance,
    );
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
    this.store.setChatContext(null);
    const id = generateUuid();
    this._freshIds.add(id);
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

  protected clearCaseContext(): void {
    this.store.setChatContext(null);
    void this.router.navigate([], {
      queryParams: { conversation: this.activeConversationId() },
      replaceUrl: true,
    });
  }

  protected openProvider(id: string): void {
    void this.router.navigate(['/providers', id]);
  }

  protected openAsegurado(id: string): void {
    void this.router.navigate(['/asegurados', id]);
  }

  protected openCase(idOrLabel: string): void {
    // Claim chips emit raw IDs (SIN-…, IMP-…, CL-…) — route to the case page.
    if (/^(SIN|IMP|CL)-/i.test(idOrLabel)) {
      void this.router.navigate(['/claims', idOrLabel]);
      return;
    }
    // Provider names emitted by aggregate charts — look up the id and route.
    const providerMatch = this.providers
      .providers()
      .find((p) => p.nombre.toLowerCase() === idOrLabel.toLowerCase());
    if (providerMatch) {
      void this.router.navigate(['/providers', providerMatch.id]);
      return;
    }
    // Asegurado names emitted by agent chips — look up and route.
    const aseguradoMatch = this.asegurados
      .asegurados()
      .find((a) => a.nombre.toLowerCase() === idOrLabel.toLowerCase());
    if (aseguradoMatch) {
      void this.router.navigate(['/asegurados', aseguradoMatch.id]);
    }
  }

  private async bootstrapConversation(
    convId: string,
    ctx: ChatContext,
  ): Promise<void> {
    // Set the context from URL params first (overrides any restored context from loadConversation).
    if (ctx) {
      this.store.setChatContext(ctx);
    } else {
      this.store.setChatContext(null);
    }

    // Skip the backend GET for IDs we just generated locally — the conversation
    // doesn't exist on the server yet and would 404.
    if (this._freshIds.has(convId)) {
      // If the store is already tracking this ID (e.g. newChat() just initialized
      // it), leave the existing messages so the welcome renders without a flash.
      // Otherwise reset to blank so the messages.length === 0 branch below
      // picks the right entity-aware welcome.
      if (this.store.conversationId() !== convId) {
        this.store.resetToFresh(convId);
      }
    } else {
      await this.store.loadConversation(convId);
    }

    // After loadConversation, context may have been restored from the persisted conversation.
    // URL params win over restored context when explicitly set.
    const resolvedCtx: ChatContext = ctx ?? this.store.chatContext();

    // Load the entity detail so the context pill can render.
    if (resolvedCtx?.kind === 'claim') {
      await this.claims.loadDetail(resolvedCtx.id);
    }
    // Provider and asegurado detail is already available via their stores (loaded at app init).

    const hasUserMessages = this.store.messages().some((message) => message.role === 'user');

    if (this.store.messages().length === 0) {
      // Fresh conversation — show welcome message for the entity.
      if (resolvedCtx?.kind === 'claim') {
        const claim = this.claims.findById(resolvedCtx.id);
        this.store.startNewConversation(convId, claim ?? null);
      } else if (resolvedCtx?.kind === 'provider') {
        const provider = this.providers.providers().find((p) => p.id === resolvedCtx.id);
        if (provider) {
          this.store.startNewConversation(convId, { kind: 'provider', data: provider });
        } else {
          this.store.startNewConversation(convId);
        }
      } else if (resolvedCtx?.kind === 'asegurado') {
        const asegurado = this.asegurados.findById(resolvedCtx.id);
        if (asegurado) {
          this.store.startNewConversation(convId, { kind: 'asegurado', data: asegurado });
        } else {
          this.store.startNewConversation(convId);
        }
      } else {
        this.store.startNewConversation(convId);
      }
      return;
    }

    // Existing conversation with no user messages yet — still show welcome.
    if (resolvedCtx?.kind === 'claim' && !hasUserMessages) {
      const claim = this.claims.findById(resolvedCtx.id);
      if (claim) this.store.startNewConversation(convId, claim);
    }
  }

  private scrollToBottom(): void {
    const el = this.scrollEl()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
