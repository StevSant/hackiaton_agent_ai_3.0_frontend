import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ClaimsApi } from '@core/api/clients/claims.api';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { aiExplanation } from '../utils/ai-explanation';
import type { Claim } from '../models';

/**
 * Editable AI summary canvas for claim detail.
 * TODO(Dev B): remove local-only fallback once PATCH /claims/{id}/resumen ships.
 */
@Component({
  selector: 'claim-summary-canvas',
  standalone: true,
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="border rounded-lg shadow-1"
      style="background: linear-gradient(180deg, color-mix(in oklch, var(--brand) 6%, var(--bg-elev)) 0%, var(--bg-elev) 60%); border-color: color-mix(in oklch, var(--brand) 18%, var(--border));"
    >
      <div class="flex items-center justify-between gap-3 px-5 pt-3.5 pb-2">
        <div class="flex items-center gap-2">
          <ui-icon name="edit_note" [size]="16" />
          <h3 class="text-[13px] font-semibold m-0" style="color: var(--brand-ink)">
            Resumen IA editable
          </h3>
        </div>
        <div class="flex items-center gap-2">
          @if (savedLocally()) {
            <span class="text-[11px] text-tier-green-ink bg-tier-green-soft px-2 py-0.5 rounded-full">
              Guardado localmente
            </span>
          }
          @if (!editing()) {
            <ui-button variant="ghost" (click)="startEdit()">
              <ui-icon name="edit" [size]="14" />
              Editar
            </ui-button>
          }
        </div>
      </div>

      @if (editing()) {
        <div class="px-5 pb-5">
          <textarea
            class="w-full min-h-[160px] rounded-md border border-line bg-surface px-3 py-2.5 text-[13.5px] leading-relaxed text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            [value]="draft()"
            (input)="onDraftInput($event)"
            aria-label="Editar resumen del caso"
          ></textarea>
          <div class="flex justify-end gap-2 mt-3">
            <ui-button variant="ghost" (click)="cancelEdit()">Cancelar</ui-button>
            <ui-button [disabled]="saving()" (click)="save()">
              {{ saving() ? 'Guardando…' : 'Guardar' }}
            </ui-button>
          </div>
        </div>
      } @else {
        <div class="px-5 pt-1 pb-5 text-[13.7px] leading-relaxed text-ink-2 whitespace-pre-wrap">
          {{ displayText() }}
        </div>
      }
    </div>
  `,
})
export class SummaryCanvas {
  readonly claim = input.required<Claim>();

  private readonly api = inject(ClaimsApi);

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly draft = signal('');
  /** Local override until Dev B persists `resumen_editado` on the API. */
  private readonly localEdits = signal<Record<string, string>>({});

  protected readonly savedLocally = computed(() => {
    const id = this.claim().id;
    return id in this.localEdits();
  });

  protected readonly displayText = computed(() => {
    const claim = this.claim();
    const local = this.localEdits()[claim.id];
    if (local) return local;
    if (claim.resumen_editado?.trim()) return claim.resumen_editado.trim();
    return aiExplanation(claim);
  });

  protected startEdit(): void {
    this.draft.set(this.displayText());
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected onDraftInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.draft.set(target.value);
  }

  protected async save(): Promise<void> {
    const claimId = this.claim().id;
    const text = this.draft().trim();
    if (!text) return;

    this.saving.set(true);
    this.localEdits.update((edits) => ({ ...edits, [claimId]: text }));

    try {
      await firstValueFrom(this.api.patchResumen(claimId, text));
    } catch {
      // Expected until PATCH /claims/{id}/resumen lands — local signal keeps the edit.
    } finally {
      this.saving.set(false);
      this.editing.set(false);
    }
  }
}
