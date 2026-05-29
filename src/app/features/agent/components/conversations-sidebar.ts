import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

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

/** Items shown before a group collapses behind "Ver más". */
const GROUP_PREVIEW_LIMIT = 6;

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
          <p class="text-[12.5px] text-ink-3 px-3 py-2">
            {{ query() ? 'Sin resultados para «' + query() + '».' : 'Sin conversaciones todavía.' }}
          </p>
        } @else {
          @for (group of groups(); track group.key) {
            @if (showHeaders()) {
              <!-- Collapsible folder header (ChatGPT-style) -->
              <button
                type="button"
                class="group/h flex items-center gap-1.5 w-full px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3 hover:text-ink"
                (click)="toggleCollapse(group.key)"
                [attr.aria-expanded]="!isCollapsed(group.key)"
              >
                <ui-icon
                  [name]="isCollapsed(group.key) ? 'chevron_right' : 'expand_more'"
                  [size]="14"
                  class="shrink-0 -ml-0.5"
                />
                <ui-icon [name]="group.icon" [size]="13" class="shrink-0" />
                <span class="truncate">{{ group.label }}</span>
                <span class="text-ink-3/70 font-normal">· {{ group.items.length }}</span>
              </button>
            }
            @if (!showHeaders() || !isCollapsed(group.key)) {
              @for (item of visibleItems(group); track item.id) {
                <agent-conversation-item
                  [item]="item"
                  [active]="item.id === activeId()"
                  (select)="select.emit($event)"
                  (rename)="rename.emit($event)"
                  (remove)="remove.emit($event)"
                />
              }
              @if (group.items.length > previewLimit) {
                <button
                  type="button"
                  class="self-start ml-2 mb-1 px-2 py-1 text-[12px] text-ink-3 hover:text-brand"
                  (click)="toggleShowAll(group.key)"
                >
                  {{
                    isExpanded(group.key)
                      ? 'Ver menos'
                      : 'Ver ' + (group.items.length - previewLimit) + ' más'
                  }}
                </button>
              }
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
  protected readonly previewLimit = GROUP_PREVIEW_LIMIT;

  /** Folder keys the user has collapsed, and the ones expanded past the preview limit. */
  private readonly _collapsed = signal<ReadonlySet<string>>(new Set());
  private readonly _expanded = signal<ReadonlySet<string>>(new Set());

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
      groups.push({ key: claimId, label: `Caso ${claimId}`, icon: 'folder', items: arr });
    }
    if (general.length) groups.push({ key: '__general', label: 'General', icon: 'folder', items: general });
    return groups;
  });

  /** Hide headers (and folder behavior) when everything is one ungrouped bucket. */
  protected readonly showHeaders = computed(() =>
    this.groups().some((g) => g.key !== '__general'),
  );

  protected isCollapsed(key: string): boolean {
    return this._collapsed().has(key);
  }

  protected isExpanded(key: string): boolean {
    return this._expanded().has(key);
  }

  /** Items to render for a group: all when expanded, else the preview slice. */
  protected visibleItems(group: ConversationGroup): ConversationSummary[] {
    if (this.isExpanded(group.key) || group.items.length <= this.previewLimit) {
      return group.items;
    }
    return group.items.slice(0, this.previewLimit);
  }

  protected toggleCollapse(key: string): void {
    const next = new Set(this._collapsed());
    next.has(key) ? next.delete(key) : next.add(key);
    this._collapsed.set(next);
  }

  protected toggleShowAll(key: string): void {
    const next = new Set(this._expanded());
    next.has(key) ? next.delete(key) : next.add(key);
    this._expanded.set(next);
  }
}
