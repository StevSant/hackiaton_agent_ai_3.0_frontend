import { Injectable, inject, signal } from '@angular/core';

import { environment } from '@core/config/env';
import { AuthStore } from '@core/auth/auth.store';
import type {
  ImportStreamEvent,
  SimilarClaimRef,
} from '../models/import-stream-event.model';

export type CaseStatus = 'parsing' | 'scoring' | 'completed' | 'error';
export type Tier = 'verde' | 'amarillo' | 'rojo';

export interface RuleActivation {
  code: string;
  kind: 'hard' | 'scoring';
  fired: boolean;
  puntos: number;
  tier_hint: string;
}

export interface UploadCase {
  claim_id: string;
  ramo: string;
  cobertura: string;
  status: CaseStatus;
  rules: RuleActivation[];
  ml_probability: number | null;
  anomaly_score: number | null;
  similarity_matches: SimilarClaimRef[];
  final_score: number | null;
  final_tier: Tier | null;
  error: string | null;
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  errors: string[];
}

export type StreamStatus = 'idle' | 'streaming' | 'completed' | 'error';

function makeCaseShell(claim_id: string, ramo = '', cobertura = ''): UploadCase {
  return {
    claim_id,
    ramo,
    cobertura,
    status: 'parsing',
    rules: [],
    ml_probability: null,
    anomaly_score: null,
    similarity_matches: [],
    final_score: null,
    final_tier: null,
    error: null,
  };
}

@Injectable()
export class UploadStreamStore {
  private readonly auth = inject(AuthStore);

  private _abortController: AbortController | null = null;

  readonly status = signal<StreamStatus>('idle');
  readonly totalRows = signal<number>(0);
  readonly processedRows = signal<number>(0);
  readonly cases = signal<UploadCase[]>([]);
  readonly summary = signal<ImportSummary | null>(null);
  readonly streamError = signal<string | null>(null);

  reset(): void {
    this._abortController?.abort();
    this._abortController = null;
    this.status.set('idle');
    this.totalRows.set(0);
    this.processedRows.set(0);
    this.cases.set([]);
    this.summary.set(null);
    this.streamError.set(null);
  }

  startImport(file: File): void {
    this.reset();
    this.status.set('streaming');

    const url = `${environment.backendUrl}${environment.apiPrefix}/claims/import/stream`;

    // SseClient JSON.stringify-encodes `body`, which corrupts raw CSV/JSON bytes.
    // We own the fetch here to send the file as a raw body with the right Content-Type.
    this._streamFileDirectly(file, url);
  }

  private _streamFileDirectly(file: File, url: string): void {
    const controller = new AbortController();
    this._abortController = controller;

    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      'Content-Type': contentTypeForFilename(file.name),
      'Content-Disposition': `attachment; filename="${file.name}"`,
    };
    const token = this.auth.accessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    void (async () => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: file,
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          this.status.set('error');
          this.streamError.set(`El servidor respondió ${response.status}.`);
          return;
        }

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;

          let sep: number;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const raw = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const line = raw.split('\n').find((l) => l.startsWith('data:'));
            if (!line) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            const event = JSON.parse(payload) as ImportStreamEvent;
            this._applyEvent(event);
          }
        }

        if (this.status() === 'streaming') {
          this.status.set('completed');
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        this.status.set('error');
        this.streamError.set(
          err instanceof Error ? err.message : 'Error de conexión con el servidor.',
        );
      }
    })();
  }

  private _applyEvent(event: ImportStreamEvent): void {
    switch (event.type) {
      case 'import.started':
        this.totalRows.set(event.data.total_rows);
        break;

      case 'parse.row':
        this.cases.update((cs) => {
          const exists = cs.find((c) => c.claim_id === event.data.claim_id);
          if (exists) return cs;
          return [...cs, makeCaseShell(event.data.claim_id, event.data.ramo, event.data.cobertura)];
        });
        break;

      case 'case.started':
        this._updateCase(event.data.claim_id, (c) => ({ ...c, status: 'scoring' }));
        break;

      case 'case.rule.hard.fired':
        this._updateCase(event.data.claim_id, (c) => ({
          ...c,
          rules: [
            ...c.rules,
            {
              code: event.data.code,
              kind: 'hard' as const,
              fired: true,
              puntos: 0,
              tier_hint: event.data.tier_hint,
            },
          ],
        }));
        break;

      case 'case.rule.scoring.evaluated':
        if (!event.data.fired) break;
        this._updateCase(event.data.claim_id, (c) => ({
          ...c,
          rules: [
            ...c.rules,
            {
              code: event.data.code,
              kind: 'scoring' as const,
              fired: true,
              puntos: event.data.puntos,
              tier_hint: '',
            },
          ],
        }));
        break;

      case 'case.ml.scored':
        this._updateCase(event.data.claim_id, (c) => ({
          ...c,
          ml_probability: event.data.probability,
        }));
        break;

      case 'case.anomaly.detected':
        this._updateCase(event.data.claim_id, (c) => ({
          ...c,
          anomaly_score: event.data.anomaly_score,
        }));
        break;

      case 'case.similarity.found':
        this._updateCase(event.data.claim_id, (c) => ({
          ...c,
          similarity_matches: event.data.matches,
        }));
        break;

      case 'case.completed':
        this._updateCase(event.data.claim_id, (c) => ({
          ...c,
          status: 'completed',
          final_score: event.data.score,
          final_tier: event.data.tier as Tier,
        }));
        this.processedRows.update((n) => n + 1);
        break;

      case 'import.completed':
        this.summary.set({
          imported: event.data.imported,
          skipped: event.data.skipped,
          errors: event.data.errors,
        });
        this.status.set('completed');
        break;

      case 'import.error':
        if (event.data.claim_id) {
          this._updateCase(event.data.claim_id, (c) => ({
            ...c,
            status: 'error',
            error: event.data.message,
          }));
        }
        this.processedRows.update((n) => n + 1);
        break;

      default: {
        const _exhaustive: never = event;
        void _exhaustive;
      }
    }
  }

  private _updateCase(claim_id: string, updater: (c: UploadCase) => UploadCase): void {
    this.cases.update((cs) => {
      const idx = cs.findIndex((c) => c.claim_id === claim_id);
      if (idx === -1) {
        return [...cs, updater(makeCaseShell(claim_id))];
      }
      const next = [...cs];
      next[idx] = updater(next[idx]!);
      return next;
    });
  }

  abort(): void {
    this._abortController?.abort();
    this._abortController = null;
    if (this.status() === 'streaming') {
      this.status.set('idle');
    }
  }
}

function contentTypeForFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx'))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'text/csv';
}
