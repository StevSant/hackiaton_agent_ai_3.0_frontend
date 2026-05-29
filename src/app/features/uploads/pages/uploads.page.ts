import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { DocumentsApi } from '@core/api/clients/documents.api';
import { ImportsApi } from '@core/api/clients/imports.api';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Spinner } from '@shared/ui/spinner';
import { RiskBadge } from '@shared/ui/risk-badge';
import { ClaimsStore } from '@core/state/claims.store';
import { UploadStreamStore } from '../services/upload-stream.store';
import { UploadCaseCard } from '../components/upload-case-card';

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
  imports: [Button, Icon, Spinner, RiskBadge, RouterLink, UploadCaseCard],
  providers: [UploadStreamStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-4xl py-2 md:py-4">
      <div class="mb-8">
        <h1 class="text-[26px] font-semibold tracking-tight m-0">Importar casos</h1>
        <p class="mt-2 text-[13.5px] text-ink-3 m-0">
          Paso 1 importa los casos (CSV, JSON, Excel, PDF o Word) con análisis en tiempo real —
          los PDF y Word se procesan con IA para extraer los campos del siniestro. Paso 2 adjunta PDFs —
          <strong class="text-ink-2 font-medium">opcional</strong>, pero recomendado para demos con respaldo documental.
        </p>
      </div>

      <div class="grid gap-5">
        <!-- ─── Paso 1: archivo de casos ─── -->
        <div class="bg-surface border border-line rounded-lg shadow-1 p-5">
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
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
            [class.opacity-50]="stream.status() === 'streaming'"
          >
            <ui-icon name="upload_file" [size]="28" />
            <span class="text-[13px] font-medium">
              {{ selectedClaimsFile()?.name ?? 'Seleccionar CSV, JSON, Excel, PDF o Word' }}
            </span>
            <span class="text-[12px] text-ink-3">
              PDF y Word se procesan con IA · máximo 50 MB
            </span>
            <input
              type="file"
              class="hidden"
              accept=".csv,.json,.xlsx,.pdf,.docx,text/csv,application/json,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              [disabled]="stream.status() === 'streaming'"
              (change)="onClaimsFileSelected($event)"
            />
          </label>

          <div class="mt-4 flex items-center gap-3 flex-wrap">
            <ui-button
              variant="primary"
              [disabled]="!selectedClaimsFile() || stream.status() === 'streaming'"
              (click)="importClaims()"
            >
              @if (stream.status() === 'streaming') {
                <ui-spinner [size]="14" />
                Importando…
              } @else {
                <ui-icon name="cloud_upload" [size]="14" />
                Importar casos
              }
            </ui-button>

            @if (stream.status() === 'streaming' && stream.totalRows() > 0) {
              <span class="text-[13px] text-ink-2">
                {{ stream.processedRows() }} / {{ stream.totalRows() }} casos procesados
              </span>
            }

            @if (stream.status() === 'error') {
              <span class="text-[13px] text-tier-red-ink">
                {{ stream.streamError() ?? 'Error al importar.' }}
              </span>
            }
          </div>

          <!-- ─── Global progress bar ─── -->
          @if (stream.status() === 'streaming' && stream.totalRows() > 0) {
            <div class="mt-4">
              <div class="h-1.5 rounded-full bg-soft overflow-hidden">
                <div
                  class="h-full bg-brand rounded-full transition-all duration-300"
                  [style.width]="progressWidth()"
                ></div>
              </div>
            </div>
          }

          <!-- ─── Completed banner ─── -->
          @if (stream.status() === 'completed' && stream.summary(); as s) {
            <div class="mt-4 rounded-md border border-tier-green-soft bg-tier-green-soft px-4 py-3 flex items-center gap-2">
              <ui-icon name="check_circle" [size]="16" class="text-tier-green-ink flex-shrink-0" />
              <span class="text-[13px] text-tier-green-ink font-medium">
                Importación completa · {{ s.imported }} importados · {{ s.skipped }} omitidos
              </span>
            </div>
            @if (s.errors.length > 0) {
              <div class="mt-2 rounded-md border border-tier-red-soft bg-tier-red-soft px-4 py-3">
                <p class="text-[12.5px] font-medium text-tier-red-ink m-0 mb-1">Errores durante la importación</p>
                <ul class="m-0 pl-4 text-[12px] text-tier-red-ink space-y-0.5">
                  @for (err of s.errors; track err) {
                    <li>{{ err }}</li>
                  }
                </ul>
              </div>
            }
          }
        </div>

        <!-- ─── Live case cards ─── -->
        @if (stream.cases().length > 0) {
          <div>
            <h2 class="text-[14px] font-semibold m-0 mb-3 text-ink-2">
              Procesando casos en tiempo real
            </h2>
            <div
              #caseList
              class="space-y-2 max-h-[520px] overflow-y-auto pr-1"
              (scroll)="onCaseListScroll($event)"
            >
              @for (c of stream.cases(); track c.claim_id) {
                <upload-case-card [case]="c" />
              }
            </div>
          </div>
        }

        <!-- ─── Final actions panel ─── -->
        @if (stream.status() === 'completed' && completedCaseIds().length > 0) {
          <div class="bg-surface border border-line rounded-lg shadow-1 p-5">
            <h2 class="text-[15px] font-semibold m-0 mb-4">¿Qué hacemos ahora?</h2>

            <div class="flex flex-wrap gap-3 mb-5">
              <ui-button variant="primary" (click)="goToBandeja()">
                <ui-icon name="inbox" [size]="14" />
                Ir a Bandeja
              </ui-button>
              @if (completedCaseIds()[0]) {
                <ui-button variant="secondary" [routerLink]="['/agent']" [queryParams]="{ case: completedCaseIds()[0] }">
                  <ui-icon name="smart_toy" [size]="14" />
                  Iniciar chat con el primero
                </ui-button>
              }
            </div>

            <!-- Mini-table of results -->
            <div class="overflow-x-auto rounded-md border border-line">
              <table class="w-full text-[12.5px] border-collapse">
                <thead>
                  <tr class="bg-soft text-ink-3 text-left">
                    <th class="px-3 py-2 font-medium">Caso</th>
                    <th class="px-3 py-2 font-medium text-right">Score</th>
                    <th class="px-3 py-2 font-medium">Riesgo</th>
                    <th class="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of completedCases(); track c.claim_id) {
                    <tr class="border-t border-line hover:bg-hover transition-colors">
                      <td class="px-3 py-2 font-mono text-[11.5px]">{{ c.claim_id }}</td>
                      <td class="px-3 py-2 text-right font-medium">{{ c.final_score }}</td>
                      <td class="px-3 py-2">
                        <ui-risk-badge [nivel]="c.final_tier" [withDot]="true" />
                      </td>
                      <td class="px-3 py-2">
                        <a
                          class="text-brand hover:underline flex items-center gap-0.5"
                          [routerLink]="['/agent']"
                          [queryParams]="{ case: c.claim_id }"
                        >
                          <ui-icon name="smart_toy" [size]="12" />
                          Preguntar a la IA
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ─── Paso 2: documentos (solo si hay casos importados) ─── -->
        @if (completedCaseIds().length > 0) {
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
                @for (claimId of completedCaseIds(); track claimId) {
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
export class UploadsPage implements AfterViewChecked {
  @ViewChild('caseList') private caseListEl?: ElementRef<HTMLElement>;

  protected readonly stream = inject(UploadStreamStore);
  private readonly importsApi = inject(ImportsApi);
  private readonly documentsApi = inject(DocumentsApi);
  private readonly claims = inject(ClaimsStore);
  private readonly router = inject(Router);

  protected readonly selectedClaimsFile = signal<File | null>(null);
  protected readonly downloading = signal(false);
  protected readonly selectedClaimId = signal('');
  protected readonly selectedDocumentFiles = signal<File[]>([]);
  protected readonly uploadingDocs = signal(false);
  protected readonly uploadErrors = signal<string[]>([]);
  protected readonly uploadSuccessCount = signal(0);

  protected readonly demoVehicleDocuments = DEMO_VEHICLE_DOCUMENTS;

  protected readonly completedCases = computed(() =>
    this.stream.cases().filter((c) => c.status === 'completed'),
  );
  protected readonly completedCaseIds = computed(() =>
    this.completedCases().map((c) => c.claim_id),
  );

  protected readonly progressWidth = computed(() => {
    const total = this.stream.totalRows();
    if (!total) return '0%';
    return `${Math.round((this.stream.processedRows() / total) * 100)}%`;
  });

  protected readonly selectedClaim = computed(() => {
    const claimId = this.selectedClaimId();
    if (!claimId) return null;
    return this.claims.findById(claimId) ?? null;
  });

  protected readonly documentStats = computed(() => {
    const claim = this.selectedClaim();
    if (!claim) return null;
    const docs = claim.documentos ?? [];
    return {
      total: docs.length,
      complete: docs.filter((d) => !d.falta).length,
      pending: docs.filter((d) => d.falta).length,
      uploadedFiles: this.uploadSuccessCount(),
    };
  });

  private _lastCaseCount = 0;
  private _userScrolled = false;

  constructor() {
    // Auto-select first completed case for doc upload
    effect(() => {
      const ids = this.completedCaseIds();
      if (ids.length > 0 && !this.selectedClaimId()) {
        this.selectedClaimId.set(ids[0]!);
        void this.claims.reloadDetail(ids[0]!);
      }
    });

    // Reload claims list once import completes so the triage table is up to date
    effect(() => {
      if (this.stream.status() === 'completed') {
        void this.claims.loadList();
      }
    });

    effect(() => {
      const claimId = this.selectedClaimId();
      if (!claimId) return;
      void this.claims.reloadDetail(claimId);
    });
  }

  ngAfterViewChecked(): void {
    const cases = this.stream.cases();
    if (cases.length !== this._lastCaseCount) {
      this._lastCaseCount = cases.length;
      if (!this._userScrolled) {
        this._scrollToBottom();
      }
    }
  }

  private _scrollToBottom(): void {
    const el = this.caseListEl?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  protected onCaseListScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this._userScrolled = distFromBottom > 60;
  }

  protected onClaimsFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedClaimsFile.set(file);
    this.stream.reset();
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

  protected importClaims(): void {
    const file = this.selectedClaimsFile();
    if (!file || this.stream.status() === 'streaming') return;
    this._userScrolled = false;
    this._lastCaseCount = 0;
    this.stream.startImport(file);
  }

  protected goToBandeja(): void {
    const ids = this.completedCaseIds();
    if (ids.length === 1) {
      // Single case imported → land on that case's detail page
      void this.router.navigate(['/claims', ids[0]]);
    } else if (ids.length > 1) {
      // Multiple cases → go to list with search pre-filled to the first id prefix
      void this.router.navigate(['/claims'], { queryParams: { q: ids[0]?.slice(0, 10) } });
    } else {
      void this.router.navigate(['/claims']);
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
