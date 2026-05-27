import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon } from '../../../shared/ui/icon';
import type { AgentMessage } from '../models';

// Exposed so the chat page can skip the external thinking indicator

interface Part {
  kind: 'text' | 'id';
  value: string;
}

const SIN_PATTERN = /SIN-\d{4}-\d{4,6}/g;

@Component({
  selector: 'agent-chat-message',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[720px] flex gap-3.5" [class.ml-auto]="isUser()" [class.flex-row-reverse]="isUser()">
      <div class="w-7 h-7 rounded-full grid place-items-center shrink-0 font-semibold text-[11px] text-white" [style.background]="avatarBg()">
        @if (isUser()) {
          LV
        } @else {
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z" stroke="white" stroke-width="2" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="white" stroke-width="2"/>
          </svg>
        }
      </div>
      <div
        class="text-[13.5px] leading-relaxed px-3.5 py-2.5 rounded-2xl border whitespace-pre-wrap break-words"
        [class]="bubbleClasses()"
      >
        @if (isEmpty()) {
          <span class="dots"><span></span><span></span><span></span></span>
        } @else {
          @for (p of parts(); track $index) {
            @if (p.kind === 'id') {
              <span
                class="font-mono text-[0.9em] px-1.5 py-px rounded cursor-pointer underline decoration-dotted underline-offset-2"
                [class]="idChipClass()"
                (click)="openCase.emit(p.value)"
              >{{ p.value }}</span>
            } @else {
              <span>{{ p.value }}</span>
            }
          }
        }
      </div>
    </div>
  `,
})
export class ChatMessage {
  readonly message = input.required<AgentMessage>();
  readonly streaming = input<boolean>(false);
  readonly openCase = output<string>();

  protected readonly isUser = computed(() => this.message().role === 'user');
  protected readonly isEmpty = computed(() => !this.isUser() && this.message().content === '');

  protected readonly avatarBg = computed(() =>
    this.isUser()
      ? 'linear-gradient(135deg, oklch(0.55 0.16 30), oklch(0.5 0.18 350))'
      : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
  );

  protected readonly bubbleClasses = computed(() =>
    this.isUser()
      ? 'bg-brand text-white border-transparent'
      : 'bg-surface text-ink border-line',
  );

  protected readonly idChipClass = computed(() =>
    this.isUser() ? 'bg-white/20 text-white no-underline' : 'bg-brand-soft text-brand-ink',
  );

  protected readonly parts = computed<Part[]>(() => {
    const m = this.message();
    if (m.role === 'user') return [{ kind: 'text', value: m.content }];
    const out: Part[] = [];
    let last = 0;
    for (const match of m.content.matchAll(SIN_PATTERN)) {
      const idx = match.index ?? 0;
      if (idx > last) out.push({ kind: 'text', value: m.content.slice(last, idx) });
      out.push({ kind: 'id', value: match[0] });
      last = idx + match[0].length;
    }
    if (last < m.content.length) out.push({ kind: 'text', value: m.content.slice(last) });
    return out;
  });
}
