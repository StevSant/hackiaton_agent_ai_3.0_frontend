import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { MarkdownPipe } from '@shared/pipes';
import { AgentSteps } from './agent-steps';
import type { AgentMessage } from '../models';

@Component({
  selector: 'agent-chat-message',
  standalone: true,
  imports: [AgentSteps, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="max-w-[720px] flex gap-3.5"
      [class.ml-auto]="isUser()"
      [class.flex-row-reverse]="isUser()"
    >
      <div
        class="w-7 h-7 rounded-full grid place-items-center shrink-0 font-semibold text-[11px] text-white"
        [style.background]="avatarBg()"
      >
        @if (isUser()) {
          LV
        } @else {
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
        }
      </div>
      @if (isUser()) {
        <div
          class="text-[13.5px] leading-relaxed px-3.5 py-2.5 rounded-2xl border bg-brand text-white border-transparent whitespace-pre-wrap break-words"
        >
          {{ message().content }}
        </div>
      } @else {
        <div
          class="text-[13.5px] leading-relaxed px-3.5 py-2.5 rounded-2xl border bg-surface text-ink border-line break-words"
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
      }
    </div>
  `,
})
export class ChatMessage {
  readonly message = input.required<AgentMessage>();
  readonly streaming = input<boolean>(false);
  readonly openCase = output<string>();

  protected readonly isUser = computed(() => this.message().role === 'user');
  protected readonly hasContent = computed(() => this.message().content.length > 0);
  protected readonly isEmpty = computed(() => !this.isUser() && !this.hasContent());
  protected readonly steps = computed(() => (this.isUser() ? [] : (this.message().steps ?? [])));

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
