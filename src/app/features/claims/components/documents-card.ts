import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Icon } from '../../../shared/ui/icon';
import type { ClaimDocument } from '../models';

@Component({
  selector: 'claim-documents-card',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <h3 class="text-[13px] font-semibold m-0">Documentos</h3>
        <span class="text-[11.5px] text-ink-3">{{ completed() }} / {{ docs().length }} completos</span>
      </div>
      @for (d of docs(); track $index) {
        <div class="flex items-center gap-3 px-5 py-3 border-t border-line first:border-t-0 text-[13px]">
          <div
            class="w-7 h-8 rounded grid place-items-center border shrink-0"
            [class]="d.falta ? 'bg-tier-red-soft border-transparent text-tier-red-ink' : 'bg-soft border-line text-ink-3'"
          >
            <ui-icon [name]="d.falta ? 'assignment_late' : 'description'" [size]="14" />
          </div>
          <div class="flex-1">{{ d.tipo }}</div>
          <span class="text-[11.5px]" [class.text-tier-red-ink]="d.falta" [class.text-tier-green-ink]="!d.falta">· {{ d.estado }}</span>
        </div>
      }
    </div>
  `,
})
export class DocumentsCard {
  readonly docs = input.required<readonly ClaimDocument[]>();
  protected readonly completed = computed(() => this.docs().filter((d) => !d.falta).length);
}
