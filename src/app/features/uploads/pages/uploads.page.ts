import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { DocumentsApi } from '@core/api/clients/documents.api';
import { ImportsApi, type ImportResultDto } from '@core/api/clients/imports.api';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { ClaimsStore } from '@core/state/claims.store';

/** Paquete demo vehicular (backend: data/sample_documents/SIN-2026-08412/). */
const DEMO_VEHICLE_DOCUMENTS: readonly { file: string; tipo: string }[] = [
  { file: '01_solicitud_siniestro.pdf', tipo: 'Solicitud de siniestro' },
  { file: '02_denuncia_fiscal.pdf', tipo: 'Denuncia fiscal' },
  { file: '03_acta_policial.pdf', tipo: 'Acta policial' },
  { file: '04_matricula_vehicular.pdf', tipo: 'Matrícula del vehículo' },
  { file: '05_cedula_identidad.pdf', tipo: 'Cédula de identidad' },
  { file: '06_caratula_poliza.pdf', tipo: 'Carátula de póliza' },
  { file: '07_licencia_conducir.pdf', tipo: 'Licencia de conducir' },
  { file: '08_certificado_endoso.pdf', tipo: 'Certificado de endoso' },
  { file: '09_peritaje_tecnico.pdf', tipo: 'Peritaje técnico' },
  { file: '10_proforma_taller.pdf', tipo: 'Proforma de taller' },
  { file: '11_comprobante_reporte.pdf', tipo: 'Comprobante de reporte' },
];

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
          Paso 1 importa los casos (CSV/JSON). Paso 2 adjunta PDFs — <strong class="text-ink-2 font-medium">opcional</strong>,
          pero recomendado para demos con respaldo documental.
        </p>
      </div>

      <div class="mb-5 rounded-lg border border-line bg-soft px-4 py-3 text-[13px] text-ink-2 leading-relaxed">
        <p class="m-0 mb-2 font-medium text-ink">¿Cuántos documentos debo subir?</p>
        <ul class="m-0 pl-4 space-y-1">
          <li>
            <strong>Importación CSV:</strong> no necesitas subir ninguno — el sistema crea
            <strong>2 documentos base</strong> por caso (cédula y matrícula) ya marcados como entregados.
          </li>
          <li>
            <strong>Demo vehicular completo:</strong> sube los <strong>11 PDFs</strong> del paquete
            <code class="text-[12px]">SIN-2026-08412</code> (carpeta en el repo backend).
          </li>
          <li>
            <strong>Otros casos:</strong> sube solo los PDFs que quieras respaldar; el tipo se infiere del nombre del archivo.
          </li>
        </ul>
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
            <h2 class="text-[15px] font-semibold m-0 mb-1">2. Documentos del caso (opcional)</h2>
            <p class="text-[13px] text-ink-3 mt-0 mb-4">
              Selecciona el caso importado y adjunta PDFs. No hay mínimo obligatorio; para el demo vehicular usa
              los 11 archivos listados abajo.
            </p>

            @if (documentStats(); as stats) {
              <div class="mb-4 rounded-md border border-line bg-soft px-4 py-3">
                <p class="text-[13px] font-medium m-0 mb-2">
                  Estado documental de {{ selectedClaimId() }}
                </p>
                <p class="text-[12.5px] text-ink-3 m-0 mb-3">
                  {{ stats.complete }} / {{ stats.total }} completos
                  @if (stats.pending > 0) {
                    · {{ stats.pending }} pendiente(s)
                  }
                  @if (stats.uploadedFiles > 0) {
                    · {{ stats.uploadedFiles }} archivo(s) ya subido(s) en storage
                  }
                </p>
                <ul class="m-0 pl-0 list-none space-y-1.5">
                  @for (doc of selectedClaim()?.documentos ?? []; track doc.tipo) {
                    <li class="flex items-center gap-2 text-[12.5px]">
                      <span [class.text-tier-green-ink]="!doc.falta" [class.text-tier-red-ink]="doc.falta">
                        <ui-icon
                          [name]="doc.falta ? 'radio_button_unchecked' : 'check_circle'"
                          [size]="14"
                        />
                      </span>
                      <span>{{ doc.tipo }}</span>
                      <span class="text-ink-3">· {{ doc.estado }}</span>
                    </li>
                  }
                </ul>
              </div>
            }

            <details class="mb-4 rounded-md border border-line px-4 py-3">
              <summary class="cursor-pointer text-[13px] font-medium text-ink-2">
                Paquete demo vehicular — 11 PDFs de referencia
              </summary>
              <p class="mt-2 mb-2 text-[12.5px] text-ink-3">
                Ruta en el repo:
                <code class="text-[11.5px]">hackiaton_agent_ai_3.0_backend/data/sample_documents/SIN-2026-08412/</code>
              </p>
              <ol class="m-0 pl-4 text-[12.5px] text-ink-2 space-y-1">
                @for (item of demoVehicleDocuments; track item.file) {
                  <li>
                    <code class="text-[11.5px]">{{ item.file }}</code>
                    — {{ item.tipo }}
                  </li>
                }
              </ol>
            </details>

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
              <span class="text-[12px] text-ink-3">
                PDF o imagen · varios archivos · el nombre del archivo define el tipo
              </span>
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

  protected readonly demoVehicleDocuments = DEMO_VEHICLE_DOCUMENTS;

  protected readonly selectedClaim = computed(() => {
    const claimId = this.selectedClaimId();
    if (!claimId) return null;
    return this.claims.findById(claimId) ?? null;
  });

  protected readonly documentStats = computed(() => {
    const claim = this.selectedClaim();
    if (!claim) return null;
    const docs = claim.documentos ?? [];
    const complete = docs.filter((doc) => !doc.falta).length;
    const pending = docs.filter((doc) => doc.falta).length;
    return {
      total: docs.length,
      complete,
      pending,
      uploadedFiles: this.uploadSuccessCount(),
    };
  });

  constructor() {
    effect(() => {
      const claimId = this.selectedClaimId();
      if (!claimId) return;
      void this.claims.reloadDetail(claimId);
    });
  }

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
        await this.claims.reloadDetail(result.claim_ids[0] ?? '');
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
