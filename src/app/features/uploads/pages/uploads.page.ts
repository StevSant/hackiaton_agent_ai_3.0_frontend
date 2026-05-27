import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { DocumentsApi } from '@core/api/clients/documents.api';
import { ImportsApi, type ImportResultDto } from '@core/api/clients/imports.api';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { ClaimsStore } from '../../claims/services/claims.store';

@Component({
  selector: 'page-uploads',
  standalone: true,
  imports: [Button, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-4xl px-6 py-8">
      <div class="mb-8">
        <h1 class="text-[26px] font-semibold tracking-tight m-0">Importar casos</h1>
        <p class="mt-2 text-[13.5px] text-ink-3 m-0">
          Sube un CSV o JSON con siniestros nuevos y, opcionalmente, adjunta los PDFs de respaldo.
        </p>
      </div>

      <div class="grid gap-5">
        <div class="bg-surface border border-line rounded-lg shadow-1 p-5">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 class="text-[15px] font-semibold m-0">1. Archivo de casos</h2>
              <p class="text-[13px] text-ink-3 mt-1 mb-0">
                Columnas mínimas: id, ramo, cobertura, asegurado, monto_reclamado, fechas y descripción.
              </p>
            </div>
            <ui-button variant="ghost" [disabled]="downloading()" (click)="downloadTemplate()">
              <ui-icon name="download" [size]="14" />
              Plantilla CSV
            </ui-button>
          </div>

          <label
            class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-soft px-6 py-10 cursor-pointer hover:bg-hover transition-colors"
          >
            <ui-icon name="upload_file" [size]="28" />
            <span class="text-[13px] font-medium">
              {{ selectedClaimsFile()?.name ?? 'Seleccionar CSV o JSON' }}
            </span>
            <span class="text-[12px] text-ink-3">Máximo 50 MB</span>
            <input
              type="file"
              class="hidden"
              accept=".csv,.json,text/csv,application/json"
              (change)="onClaimsFileSelected($event)"
            />
          </label>

          <div class="mt-4 flex items-center gap-3">
            <ui-button
              variant="primary"
              [disabled]="!selectedClaimsFile() || importing()"
              (click)="importClaims()"
            >
              <ui-icon name="cloud_upload" [size]="14" />
              {{ importing() ? 'Importando…' : 'Importar casos' }}
            </ui-button>
            @if (importResult(); as result) {
              <span class="text-[13px] text-tier-green-ink">
                {{ result.imported }} importados · {{ result.skipped }} omitidos
              </span>
            }
          </div>

          @if (importResult()?.errors?.length) {
            <div class="mt-4 rounded-md border border-tier-red-soft bg-tier-red-soft px-4 py-3">
              <p class="text-[12.5px] font-medium text-tier-red-ink m-0 mb-2">Errores por fila</p>
              <ul class="m-0 pl-4 text-[12.5px] text-tier-red-ink space-y-1">
                @for (err of importResult()!.errors; track err) {
                  <li>{{ err }}</li>
                }
              </ul>
            </div>
          }
        </div>

        @if (importedClaimIds().length) {
          <div class="bg-surface border border-line rounded-lg shadow-1 p-5">
            <h2 class="text-[15px] font-semibold m-0 mb-1">2. Documentos del caso</h2>
            <p class="text-[13px] text-ink-3 mt-0 mb-4">
              Adjunta PDFs o imágenes. El tipo se infiere del nombre del archivo.
            </p>

            <div class="flex flex-wrap items-center gap-3 mb-4">
              <label class="text-[13px] text-ink-2">Caso</label>
              <select
                class="rounded-sm border border-line bg-surface px-3 py-2 text-[13px]"
                [value]="selectedClaimId()"
                (change)="onClaimChange($event)"
              >
                @for (claimId of importedClaimIds(); track claimId) {
                  <option [value]="claimId">{{ claimId }}</option>
                }
              </select>
              <a
                class="text-[13px] text-brand hover:underline"
                [routerLink]="['/claims', selectedClaimId()]"
              >
                Ver detalle
              </a>
            </div>

            <label
              class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-soft px-6 py-10 cursor-pointer hover:bg-hover transition-colors"
            >
              <ui-icon name="folder_open" [size]="28" />
              <span class="text-[13px] font-medium">
                {{
                  selectedDocumentFiles().length
                    ? selectedDocumentFiles().length + ' archivo(s) seleccionados'
                    : 'Seleccionar PDFs o imágenes'
                }}
              </span>
              <span class="text-[12px] text-ink-3">Puedes elegir varios archivos</span>
              <input
                type="file"
                class="hidden"
                multiple
                accept=".pdf,image/jpeg,image/png,image/webp,application/pdf"
                (change)="onDocumentsSelected($event)"
              />
            </label>

            <div class="mt-4 flex items-center gap-3">
              <ui-button
                variant="primary"
                [disabled]="!selectedDocumentFiles().length || uploadingDocs()"
                (click)="uploadDocuments()"
              >
                <ui-icon name="attach_file" [size]="14" />
                {{ uploadingDocs() ? 'Subiendo…' : 'Subir documentos' }}
              </ui-button>
            </div>

            @if (uploadErrors().length) {
              <div class="mt-4 rounded-md border border-tier-red-soft bg-tier-red-soft px-4 py-3">
                <ul class="m-0 pl-4 text-[12.5px] text-tier-red-ink space-y-1">
                  @for (err of uploadErrors(); track err) {
                    <li>{{ err }}</li>
                  }
                </ul>
              </div>
            }

            @if (uploadSuccessCount() > 0) {
              <p class="mt-4 text-[13px] text-tier-green-ink m-0">
                {{ uploadSuccessCount() }} documento(s) subidos correctamente.
              </p>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class UploadsPage {
  private readonly importsApi = inject(ImportsApi);
  private readonly documentsApi = inject(DocumentsApi);
  private readonly claims = inject(ClaimsStore);

  protected readonly selectedClaimsFile = signal<File | null>(null);
  protected readonly importing = signal(false);
  protected readonly downloading = signal(false);
  protected readonly importResult = signal<ImportResultDto | null>(null);
  protected readonly importedClaimIds = signal<string[]>([]);
  protected readonly selectedClaimId = signal('');
  protected readonly selectedDocumentFiles = signal<File[]>([]);
  protected readonly uploadingDocs = signal(false);
  protected readonly uploadErrors = signal<string[]>([]);
  protected readonly uploadSuccessCount = signal(0);

  protected readonly hasImportedClaims = computed(() => this.importedClaimIds().length > 0);

  protected onClaimsFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedClaimsFile.set(file);
    this.importResult.set(null);
  }

  protected onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedDocumentFiles.set(Array.from(input.files ?? []));
    this.uploadErrors.set([]);
    this.uploadSuccessCount.set(0);
  }

  protected onClaimChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedClaimId.set(select.value);
  }

  protected async downloadTemplate(): Promise<void> {
    if (this.downloading()) return;
    this.downloading.set(true);
    try {
      const blob = await firstValueFrom(this.importsApi.downloadTemplate());
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'claims.sample.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      this.downloading.set(false);
    }
  }

  protected async importClaims(): Promise<void> {
    const file = this.selectedClaimsFile();
    if (!file || this.importing()) return;
    this.importing.set(true);
    this.importResult.set(null);
    this.uploadErrors.set([]);
    this.uploadSuccessCount.set(0);
    try {
      const result = await firstValueFrom(this.importsApi.importClaims(file));
      this.importResult.set(result);
      this.importedClaimIds.set(result.claim_ids);
      if (result.claim_ids.length) {
        this.selectedClaimId.set(result.claim_ids[0] ?? '');
      }
      await this.claims.loadList();
    } finally {
      this.importing.set(false);
    }
  }

  protected async uploadDocuments(): Promise<void> {
    const claimId = this.selectedClaimId();
    const files = this.selectedDocumentFiles();
    if (!claimId || !files.length || this.uploadingDocs()) return;
    this.uploadingDocs.set(true);
    this.uploadErrors.set([]);
    this.uploadSuccessCount.set(0);
    try {
      const result = await firstValueFrom(
        this.documentsApi.uploadDocumentsBulk(claimId, files),
      );
      this.uploadSuccessCount.set(result.uploaded.length);
      this.uploadErrors.set(result.errors);
      await this.claims.reloadDetail(claimId);
    } finally {
      this.uploadingDocs.set(false);
    }
  }
}
