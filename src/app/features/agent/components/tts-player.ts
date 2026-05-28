import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { TtsState, TtsVoice } from '@core/tts/text-to-speech.service';
import { Icon } from '@shared/ui/icon';

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

/** Transport bar for the text-to-speech reader: play/pause, seek, speed, voice, volume. */
@Component({
  selector: 'agent-tts-player',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-3 py-2 rounded-lg border border-line bg-soft text-ink-2"
    >
      <div class="flex items-center gap-2.5 flex-1 basis-full sm:basis-[200px] min-w-0">
        <button
          type="button"
          class="w-7 h-7 grid place-items-center rounded-full bg-brand text-white shrink-0 hover:bg-brand-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
          [disabled]="loading()"
          [attr.aria-label]="playing() ? 'Pausar lectura' : 'Reanudar lectura'"
          (click)="toggle.emit()"
        >
          @if (loading()) {
            <ui-icon name="progress_activity" [size]="16" [fill]="true" class="animate-spin" />
          } @else {
            <ui-icon [name]="playing() ? 'pause' : 'play_arrow'" [size]="16" [fill]="true" />
          }
        </button>

        <button
          type="button"
          class="w-7 h-7 grid place-items-center rounded-full border border-line text-ink-3 shrink-0 hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-2"
          aria-label="Detener lectura"
          (click)="stop.emit()"
        >
          <ui-icon name="stop" [size]="15" [fill]="true" />
        </button>

        <input
          type="range"
          class="flex-1 min-w-0 accent-brand cursor-pointer"
          min="0"
          max="100"
          step="1"
          aria-label="Progreso de la lectura"
          [value]="progressPct()"
          (input)="onSeek($event)"
        />
        <span class="text-[11px] tabular-nums text-ink-3 w-9 text-right shrink-0">{{ progressPct() }}%</span>
      </div>

      <div class="flex items-center gap-x-2.5 gap-y-1 flex-wrap">
        <label class="flex items-center gap-1 text-[11px] text-ink-3">
          <ui-icon name="speed" [size]="14" />
          <select
            class="bg-surface border border-line rounded px-1 py-0.5 text-[11px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Velocidad de lectura"
            (change)="onRate($event)"
          >
            @for (r of rates; track r) {
              <option [value]="r" [selected]="r === rate()">{{ r }}×</option>
            }
          </select>
        </label>

        <label class="flex items-center gap-1 text-[11px] text-ink-3">
          <ui-icon name="volume_up" [size]="14" />
          <input
            type="range"
            class="w-16 accent-brand cursor-pointer"
            min="0"
            max="1"
            step="0.1"
            aria-label="Volumen"
            [value]="volume()"
            (input)="onVolume($event)"
          />
        </label>

        @if (voices().length > 0) {
          <label class="flex items-center gap-1 text-[11px] text-ink-3 min-w-0 max-w-full sm:max-w-[180px]">
            <ui-icon name="record_voice_over" [size]="14" class="shrink-0" />
            <select
              class="bg-surface border border-line rounded px-1 py-0.5 text-[11px] text-ink truncate min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Voz"
              (change)="onVoice($event)"
            >
              @for (v of voices(); track v.id) {
                <option [value]="v.id" [selected]="v.id === voice()">{{ v.label }}</option>
              }
            </select>
          </label>
        }
      </div>
    </div>
  `,
})
export class TtsPlayer {
  readonly state = input.required<TtsState>();
  readonly progress = input<number>(0);
  readonly rate = input<number>(1);
  readonly volume = input<number>(1);
  readonly voices = input<readonly TtsVoice[]>([]);
  readonly voice = input<string>('');

  readonly toggle = output<void>();
  readonly stop = output<void>();
  readonly seek = output<number>();
  readonly rateChange = output<number>();
  readonly volumeChange = output<number>();
  readonly voiceChange = output<string>();

  protected readonly rates = RATES;
  protected readonly playing = computed(() => this.state() === 'playing');
  protected readonly loading = computed(() => this.state() === 'loading');
  protected readonly progressPct = computed(() => Math.round(this.progress() * 100));

  protected onSeek(event: Event): void {
    this.seek.emit(Number((event.target as HTMLInputElement).value) / 100);
  }

  protected onRate(event: Event): void {
    this.rateChange.emit(Number((event.target as HTMLSelectElement).value));
  }

  protected onVolume(event: Event): void {
    this.volumeChange.emit(Number((event.target as HTMLInputElement).value));
  }

  protected onVoice(event: Event): void {
    this.voiceChange.emit((event.target as HTMLSelectElement).value);
  }
}
