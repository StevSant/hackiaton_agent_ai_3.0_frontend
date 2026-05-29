import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import type { ConversationSummary } from '../models';
import { ConversationPrefsStore } from '../services/conversation-prefs.store';

@Component({
  selector: 'agent-conversation-item',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="conv-item group relative flex flex-col gap-0.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
      [class.bg-soft]="active()"
      [class.hover:bg-hover]="!active()"
      (click)="select.emit(item().id)"
    >
      <!-- Title row: pin + emoji + marquee title -->
      <div class="flex items-center gap-1.5 pr-12 min-w-0">
        @if (pinned()) {
          <ui-icon name="push_pin" [size]="12" class="text-brand shrink-0" />
        }
        @if (emoji(); as e) {
          <span class="text-[13px] leading-none shrink-0">{{ e }}</span>
        }
        <!-- Marquee: clips normally; on hover the track slides to reveal the full title. -->
        <span class="conv-title flex-1 min-w-0 overflow-hidden">
          <span class="conv-title__track text-[13px] font-medium text-ink leading-snug">
            {{ item().title || 'Sin título' }}
          </span>
        </span>
      </div>
      @if (item().snippet) {
        <span class="text-[12px] text-ink-3 truncate pr-12 leading-snug">
          {{ item().snippet }}
        </span>
      }

      <!-- Hover actions -->
      <div
        class="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5"
      >
        <button
          type="button"
          class="w-7 h-7 grid place-items-center rounded text-ink-3 hover:bg-line hover:text-ink"
          [class.text-brand]="emoji()"
          (click)="$event.stopPropagation(); pickerOpen.set(!pickerOpen())"
          aria-label="Reaccionar con un emoji"
        >
          @if (emoji(); as e) {
            <span class="text-[14px] leading-none">{{ e }}</span>
          } @else {
            <ui-icon name="add_reaction" [size]="14" />
          }
        </button>
        <button
          type="button"
          class="w-7 h-7 grid place-items-center rounded text-ink-3 hover:bg-line hover:text-brand"
          [class.text-brand]="pinned()"
          (click)="$event.stopPropagation(); prefs.togglePin(item().id)"
          [attr.aria-label]="pinned() ? 'Desanclar conversación' : 'Anclar conversación'"
        >
          <ui-icon name="push_pin" [size]="14" />
        </button>
        <button
          type="button"
          class="w-7 h-7 grid place-items-center rounded text-ink-3 hover:bg-line hover:text-ink"
          (click)="$event.stopPropagation(); rename.emit(item())"
          aria-label="Renombrar conversación"
        >
          <ui-icon name="edit" [size]="14" />
        </button>
        <button
          type="button"
          class="w-7 h-7 grid place-items-center rounded text-ink-3 hover:bg-line hover:text-danger"
          (click)="$event.stopPropagation(); remove.emit(item().id)"
          aria-label="Eliminar conversación"
        >
          <ui-icon name="delete" [size]="14" />
        </button>
      </div>

      <!-- Emoji palette popover -->
      @if (pickerOpen()) {
        <div
          class="absolute right-2 top-full z-20 mt-1 flex items-center gap-0.5 px-1.5 py-1 rounded-lg border border-line bg-surface shadow-md"
          (click)="$event.stopPropagation()"
        >
          @for (e of palette; track e) {
            <button
              type="button"
              class="w-7 h-7 grid place-items-center rounded text-[15px] hover:bg-hover"
              [class.bg-brand-soft]="emoji() === e"
              (click)="prefs.setEmoji(item().id, e); pickerOpen.set(false)"
              [attr.aria-label]="'Reaccionar ' + e"
            >
              {{ e }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      /* On hover, slide the title to reveal its end (and back), so long titles
         can be read fully without a separate tooltip. Short titles (track
         narrower than the visible width) stay put thanks to min(0px, …). */
      .conv-title__track {
        display: inline-block;
        white-space: nowrap;
        will-change: transform;
      }
      .conv-item:hover .conv-title__track {
        animation: conv-marquee 5s ease-in-out infinite alternate;
      }
      @keyframes conv-marquee {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(min(0px, calc(168px - 100%)));
        }
      }
    `,
  ],
})
export class ConversationItem {
  readonly item = input.required<ConversationSummary>();
  readonly active = input<boolean>(false);

  readonly select = output<string>();
  readonly rename = output<ConversationSummary>();
  readonly remove = output<string>();

  protected readonly prefs = inject(ConversationPrefsStore);
  protected readonly palette = ConversationPrefsStore.PALETTE;
  protected readonly pickerOpen = signal(false);

  protected readonly pinned = computed(() => this.prefs.pinned().has(this.item().id));
  protected readonly emoji = computed(() => this.prefs.emojis()[this.item().id] ?? null);
}
