import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Button } from '../../../shared/ui/button';
import { Chip } from '../../../shared/ui/chip';
import { Icon } from '../../../shared/ui/icon';
import { ChatMessage } from '../components/chat-message';
import { AgentStore } from '../services/agent.store';

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
  imports: [Button, Chip, Icon, ChatMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1 flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-md grid place-items-center text-white"
                style="background: linear-gradient(135deg, var(--brand), var(--brand-2)); box-shadow: 0 4px 12px color-mix(in oklch, var(--brand) 30%, transparent);">
            <ui-icon name="auto_awesome" [size]="18" [fill]="true" />
          </span>
          Centinela IA
        </h1>
        <p class="text-ink-3 text-[13.5px] m-0">Conversa con tu bandeja. Pregúntame por casos, patrones, proveedores o ramos.</p>
      </div>
      <div class="flex gap-2">
        <ui-button (click)="reset()">
          <ui-icon name="refresh" [size]="13" />
          Nueva conversación
        </ui-button>
      </div>
    </div>

    <div class="grid grid-rows-[1fr_auto] bg-surface border border-line rounded-xl shadow-2 overflow-hidden h-[calc(100vh-150px)] max-h-[880px]">
      <div #scroll class="overflow-y-auto scroll-pretty px-8 pt-7 pb-3 flex flex-col gap-5">
        @for (m of store.messages(); track m.id) {
          <agent-chat-message [message]="m" (openCase)="openCase($event)" />
        }
        @if (store.thinking()) {
          <div class="max-w-[720px] flex gap-3.5">
            <div class="w-7 h-7 rounded-full grid place-items-center shrink-0 text-white" style="background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);">
              <ui-icon name="auto_awesome" [size]="14" [fill]="true" />
            </div>
            <div class="text-[13.5px] px-3.5 py-3.5 rounded-2xl border border-line bg-surface">
              <span class="dots"><span></span><span></span><span></span></span>
            </div>
          </div>
        }
      </div>

      <div class="border-t border-line px-4 py-3.5 bg-surface">
        <div class="flex gap-2 items-end px-2.5 py-2 bg-soft border border-line rounded-md focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft">
          <textarea
            #ta
            rows="1"
            class="flex-1 resize-none border-0 bg-transparent outline-0 text-ink text-[14px] max-h-[120px] min-h-[22px] py-1 leading-snug"
            placeholder="Pregunta a Centinela…  (Shift+Enter para nueva línea)"
            [value]="input()"
            (input)="onInput($any($event.target).value)"
            (keydown)="onKey($event)"
          ></textarea>
          <ui-button variant="primary" [disabled]="!input().trim() || store.thinking()" (click)="send()">
            <ui-icon name="send" [size]="14" />
          </ui-button>
        </div>
        <div class="flex gap-2 flex-wrap mt-2.5">
          @for (s of suggestions; track s) {
            <span (click)="quickSend(s)">
              <ui-chip>
                <ui-icon name="auto_awesome" [size]="11" />
                {{ s }}
              </ui-chip>
            </span>
          }
        </div>
      </div>
    </div>
  `,
})
export class ChatPage implements AfterViewChecked {
  protected readonly store = inject(AgentStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly suggestions = SUGGESTIONS;
  protected readonly input = signal<string>('');

  private readonly scrollEl = viewChild<ElementRef<HTMLDivElement>>('scroll');
  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('ta');

  constructor() {
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
    const ta = this.textarea()?.nativeElement;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(120, ta.scrollHeight) + 'px';
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
