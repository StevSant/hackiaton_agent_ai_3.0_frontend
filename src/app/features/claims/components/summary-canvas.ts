import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ClaimsApi } from '@core/api/clients/claims.api';
import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Spinner } from '@shared/ui/spinner';
import { aiExplanation } from '@shared/utils';
import type { Claim } from '../models';

@Component({
  selector: 'claim-summary-canvas',
  standalone: true,
  imports: [Button, Icon, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="border rounded-lg shadow-1"
      style="background: linear-gradient(180deg, color-mix(in oklch, var(--brand) 6%, var(--bg-elev)) 0%, var(--bg-elev) 60%); border-color: color-mix(in oklch, var(--brand) 18%, var(--border));"
    >
      <div class="flex items-center justify-between gap-3 px-5 pt-3.5 pb-2">
        <div class="flex items-center gap-2">
          <ui-icon name="auto_awesome" [size]="16" [fill]="true" />
          <h3 class="text-[13px] font-semibold m-0" style="color: var(--brand-ink)">
            Resumen del caso — Centinela IA
          </h3>
        </div>
        <div class="flex items-center gap-1.5">
          @if (savedMessage()) {
            <span class="text-[12px] text-green-600 flex items-center gap-1">
              <ui-icon name="check_circle" [size]="13" /> Guardado
            </span>
          }
          @if (!editing()) {
            <ui-button (click)="startEdit()">
              <ui-icon name="edit" [size]="13" /> Editar
            </ui-button>
          }
          @if (editing()) {
            <ui-button
              [disabled]="improvingAi()"
              (click)="openAiImprove()"
            >
              @if (improvingAi()) {
                <ui-spinner [size]="12" />
              } @else {
                <ui-icon name="auto_awesome" [size]="13" />
              }
              Mejorar con IA
            </ui-button>
            <ui-button [disabled]="saving()" (click)="save()">
              @if (saving()) {
                <ui-spinner [size]="12" />
              } @else {
                <ui-icon name="save" [size]="13" />
              }
              Guardar
            </ui-button>
            <ui-button (click)="cancelEdit()">
              <ui-icon name="close" [size]="13" /> Cancelar
            </ui-button>
          }
        </div>
      </div>

      @if (showAiInput()) {
        <div class="px-5 pb-3 flex items-center gap-2">
          <input
            class="flex-1 px-3 py-1.5 rounded border border-line bg-surface text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand"
            type="text"
            placeholder="Opcional: indicale a la IA cómo mejorarlo…"
            [value]="aiInstructions()"
            (input)="aiInstructions.set($any($event.target).value)"
            (keydown.enter)="runAiImprove()"
          />
          <ui-button [disabled]="improvingAi()" (click)="runAiImprove()">
            @if (improvingAi()) {
              <ui-spinner [size]="12" />
            } @else {
              <ui-icon name="send" [size]="13" />
            }
            {{ improvingAi() ? 'Mejorando…' : 'Confirmar' }}
          </ui-button>
        </div>
      }

      <div class="px-5 pb-5">
        @if (editing()) {
          <textarea
            class="w-full min-h-[120px] px-3 py-2 rounded border border-line bg-surface text-[13.7px] leading-relaxed text-ink resize-y focus:outline-none focus:ring-2 focus:ring-brand"
            [value]="draftText()"
            (input)="draftText.set($any($event.target).value)"
          ></textarea>
        } @else {
          <p class="text-[13.7px] leading-relaxed text-ink-2 m-0 whitespace-pre-wrap">
            {{ displayText() }}
          </p>
        }
      </div>
    </div>
  `,
})
export class SummaryCanvas implements OnInit {
  readonly claim = input.required<Claim>();

  /** Emitted after a successful save so the parent can reload the claim. */
  readonly saved = output<void>();

  private readonly api = inject(ClaimsApi);

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly improvingAi = signal(false);
  protected readonly showAiInput = signal(false);
  protected readonly aiInstructions = signal('');
  protected readonly savedMessage = signal(false);
  protected readonly draftText = signal('');

  private baseText(): string {
    const c = this.claim();
    return c.resumen_editado ?? aiExplanation(c);
  }

  protected displayText(): string {
    return this.baseText();
  }

  ngOnInit(): void {
    this.draftText.set(this.baseText());
  }

  protected startEdit(): void {
    this.draftText.set(this.baseText());
    this.editing.set(true);
    this.savedMessage.set(false);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.showAiInput.set(false);
    this.aiInstructions.set('');
  }

  protected openAiImprove(): void {
    this.showAiInput.set(!this.showAiInput());
  }

  protected async runAiImprove(): Promise<void> {
    if (this.improvingAi()) return;
    this.improvingAi.set(true);
    try {
      const instructions = this.aiInstructions().trim() || null;
      const result = await firstValueFrom(
        this.api.improveResumen(this.claim().id, instructions),
      );
      this.draftText.set(result.resumen);
      this.showAiInput.set(false);
      this.aiInstructions.set('');
    } catch {
      // Keep existing draft; don't crash the canvas.
    } finally {
      this.improvingAi.set(false);
    }
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.patchResumen(this.claim().id, this.draftText()));
      this.editing.set(false);
      this.showAiInput.set(false);
      this.savedMessage.set(true);
      this.saved.emit();
      setTimeout(() => this.savedMessage.set(false), 3000);
    } catch {
      // Swallow — the user can retry.
    } finally {
      this.saving.set(false);
    }
  }
}
