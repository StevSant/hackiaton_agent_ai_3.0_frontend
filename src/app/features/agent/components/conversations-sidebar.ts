import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Skeleton } from '@shared/ui/skeleton';
import type { ConversationSummary } from '../models';
import { ConversationPrefsStore } from '../services/conversation-prefs.store';
import { ConversationItem } from './conversation-item';

interface ConversationGroup {
  key: string;
  label: string;
  /** Material icon for the group header (push_pin for pinned, gavel for a case). */
  icon: string;
  items: ConversationSummary[];
}

@Component({
  selector: 'agent-conversations-sidebar',
  standalone: true,
  imports: [Button, Icon, Skeleton, ConversationItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full border-r border-line bg-surface overflow-hidden">
      <!-- Header: new chat + search -->
      <div class="shrink-0 flex flex-col gap-2 p-3 border-b border-line">
        <ui-button class="w-full justify-start" (click)="newChat.emit()">
          <ui-icon name="add" [size]="15" />
          Nueva conversación
        </ui-button>
        <div class="relative">
          <ui-icon
            name="search"
            [size]="14"
            class="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
          />
          <input
            type="text"
            class="w-full pl-8 pr-3 py-1.5 rounded-md border border-line bg-soft text-[12.5px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
            placeholder="Buscar conversaciones…"
            [value]="query()"
            (input)="queryChange.emit($any($event.target).value)"
          />
        </div>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto scroll-pretty p-2 flex flex-col gap-0.5">
        @if (loading()) {
          <div class="flex flex-col gap-2 px-2 py-2" aria-label="Cargando conversaciones">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <div class="px-2.5 py-2">
                <ui-skeleton variant="text" width="85%" [height]="11" />
                <div class="h-1"></div>
                <ui-skeleton variant="text" width="55%" [height]="9" />
              </div>
            }
          </div>
        } @else if (items().length === 0) {
          <p class="text-[12.5px] text-ink-3 px-3 py-2">Sin conversaciones todavía.</p>
        } @else {
          @for (group of groups(); track group.key) {
            @if (showHeaders()) {
              <div
                class="flex items-center gap-1.5 px-2.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3"
              >
                <ui-icon [name]="group.icon" [size]="13" />
                <span class="truncate">{{ group.label }}</span>
                <span class="text-ink-3/70 font-normal">· {{ group.items.length }}</span>
              </div>
            }
            @for (item of group.items; track item.id) {
              <agent-conversation-item
                [item]="item"
                [active]="item.id === activeId()"
                (select)="select.emit($event)"
                (rename)="rename.emit($event)"
                (remove)="remove.emit($event)"
              />
            }
          }
        }
      </div>
    </div>
  `,
})
export class ConversationsSidebar {
  readonly items = input.required<ConversationSummary[]>();
  readonly activeId = input<string | null>(null);
  readonly query = input<string>('');
  readonly loading = input<boolean>(false);

  readonly select = output<string>();
  readonly rename = output<ConversationSummary>();
  readonly remove = output<string>();
  readonly newChat = output<void>();
  readonly queryChange = output<string>();

  private readonly prefs = inject(ConversationPrefsStore);

  /** Pinned first, then one group per case (context_claim_id), then General. */
  protected readonly groups = computed<ConversationGroup[]>(() => {
    const pinnedSet = this.prefs.pinned();
    const pinned: ConversationSummary[] = [];
    const byCase = new Map<string, ConversationSummary[]>();
    const general: ConversationSummary[] = [];

    for (const it of this.items()) {
      if (pinnedSet.has(it.id)) {
        pinned.push(it);
      } else if (it.context_claim_id) {
        const arr = byCase.get(it.context_claim_id) ?? [];
        arr.push(it);
        byCase.set(it.context_claim_id, arr);
      } else {
        general.push(it);
      }
    }

    const groups: ConversationGroup[] = [];
    if (pinned.length) groups.push({ key: '__pinned', label: 'Ancladas', icon: 'push_pin', items: pinned });
    for (const [claimId, arr] of byCase) {
      groups.push({ key: claimId, label: `Caso ${claimId}`, icon: 'gavel', items: arr });
    }
    if (general.length) groups.push({ key: '__general', label: 'General', icon: 'chat', items: general });
    return groups;
  });

  /** Hide headers when everything is just one ungrouped "General" bucket. */
  protected readonly showHeaders = computed(() =>
    this.groups().some((g) => g.key !== '__general'),
  );
}
