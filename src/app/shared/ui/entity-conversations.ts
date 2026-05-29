import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ConversationsApi } from '@core/api/clients/conversations.api';
import type { components } from '@core/api/generated/schema';
import { Icon } from './icon';
import { Spinner } from './spinner';

type ConversationSummary = components['schemas']['ConversationSummary'];
type EntityKind = 'claim' | 'provider' | 'asegurado';

function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Hace un momento';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ayer';
  if (diffD < 7) return `Hace ${diffD} días`;
  return new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
}

const ENTITY_LABEL: Record<EntityKind, string> = {
  claim: 'este siniestro',
  provider: 'este proveedor',
  asegurado: 'este asegurado',
};

@Component({
  selector: 'ui-entity-conversations',
  standalone: true,
  imports: [Icon, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center gap-2 px-5 py-3.5 border-b border-line">
        <ui-icon name="forum" [size]="15" />
        <h3 class="text-[13px] font-semibold m-0">Conversaciones sobre esta entidad</h3>
        @if (loading()) {
          <ui-spinner [size]="12" />
        }
      </div>

      @if (loading() && conversations().length === 0) {
        <div class="px-5 py-4 text-[12.5px] text-ink-3">Cargando conversaciones…</div>
      } @else if (conversations().length === 0) {
        <div class="px-5 py-5 text-[12.5px] text-ink-3 text-center">
          Aún no hay conversaciones sobre {{ entityLabel() }}.
        </div>
      } @else {
        <ul class="divide-y divide-line" role="list">
          @for (conv of conversations(); track conv.id) {
            <li>
              <button
                class="w-full text-left px-5 py-3 hover:bg-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                (click)="openConversation(conv)"
              >
                <div class="flex items-start justify-between gap-2">
                  <span class="text-[13px] font-medium text-ink line-clamp-1 flex-1">
                    {{ conv.title ?? 'Conversación sin título' }}
                  </span>
                  <span class="text-[11.5px] text-ink-3 shrink-0">{{ age(conv.updated_at) }}</span>
                </div>
                @if (conv.snippet) {
                  <p class="text-[12px] text-ink-3 m-0 mt-0.5 line-clamp-1">{{ conv.snippet }}</p>
                }
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class EntityConversations implements OnInit {
  readonly kind = input.required<EntityKind>();
  readonly entityId = input.required<string>();

  private readonly api = inject(ConversationsApi);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly conversations = signal<ConversationSummary[]>([]);

  protected readonly entityLabel = computed(() => ENTITY_LABEL[this.kind()]);

  protected readonly age = relativeDate;

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const kind = this.kind();
      const id = this.entityId();
      const ctx =
        kind === 'claim'
          ? { context_claim_id: id }
          : kind === 'provider'
            ? { context_provider_id: id }
            : { context_asegurado_id: id };
      const list = await firstValueFrom(this.api.listByContext(ctx));
      this.conversations.set(list);
    } catch {
      // Non-critical panel — swallow errors silently; list stays empty.
    } finally {
      this.loading.set(false);
    }
  }

  protected openConversation(conv: ConversationSummary): void {
    const kind = this.kind();
    const id = this.entityId();
    const kindParam =
      kind === 'claim' ? 'case' : kind === 'provider' ? 'provider' : 'asegurado';
    void this.router.navigate(['/agent'], {
      queryParams: { conversation: conv.id, [kindParam]: id },
    });
  }
}
