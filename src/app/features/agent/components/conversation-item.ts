import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import type { ConversationSummary } from '../models';

@Component({
  selector: 'agent-conversation-item',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="group relative flex flex-col gap-0.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
      [class.bg-soft]="active()"
      [class.hover:bg-hover]="!active()"
      (click)="select.emit(item().id)"
    >
      <span class="text-[13px] font-medium text-ink truncate pr-12 leading-snug">
        {{ item().title || 'Sin título' }}
      </span>
      @if (item().snippet) {
        <span class="text-[12px] text-ink-3 truncate pr-12 leading-snug">
          {{ item().snippet }}
        </span>
      }

      <div
        class="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5"
      >
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
    </div>
  `,
})
export class ConversationItem {
  readonly item = input.required<ConversationSummary>();
  readonly active = input<boolean>(false);

  readonly select = output<string>();
  readonly rename = output<ConversationSummary>();
  readonly remove = output<string>();
}
