import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { DocumentsApi } from '@core/api/clients/documents.api';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import type { ClaimDocument } from '../models';

@Component({
  selector: 'claim-documents-card',
  standalone: true,
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <h3 class="text-[13px] font-semibold m-0">Documentos</h3>
        <div class="flex items-center gap-2">
          <span class="text-[11.5px] text-ink-3">{{ completed() }} / {{ docs().length }} completos</span>
          @if (claimId()) {
            <label class="inline-flex">
              <ui-button variant="ghost" [disabled]="uploading()">
                <ui-icon name="upload_file" [size]="14" />
                {{ uploading() ? 'Subiendo…' : 'Subir' }}
              </ui-button>
              <input
                type="file"
                class="hidden"
                multiple
                accept=".pdf,image/jpeg,image/png,image/webp,application/pdf"
                (change)="onFilesSelected($event)"
              />
            </label>
          }
        </div>
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
      @if (uploadError()) {
        <div class="px-5 py-3 border-t border-line text-[12.5px] text-tier-red-ink">
          {{ uploadError() }}
        </div>
      }
    </div>
  `,
})
export class DocumentsCard {
  readonly docs = input.required<readonly ClaimDocument[]>();
  readonly claimId = input<string | null>(null);
  readonly uploaded = output<void>();

  private readonly documentsApi = inject(DocumentsApi);

  protected readonly uploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly completed = computed(() => this.docs().filter((d) => !d.falta).length);

  protected async onFilesSelected(event: Event): Promise<void> {
    const claimId = this.claimId();
    if (!claimId || this.uploading()) return;

    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    this.uploading.set(true);
    this.uploadError.set(null);
    try {
      const result = await firstValueFrom(this.documentsApi.uploadDocumentsBulk(claimId, files));
      if (result.errors.length) {
        this.uploadError.set(result.errors.join(' · '));
      }
      if (result.uploaded.length) {
        this.uploaded.emit();
      }
    } catch (error) {
      this.uploadError.set(error instanceof Error ? error.message : 'No se pudieron subir los archivos.');
    } finally {
      this.uploading.set(false);
    }
  }
}
