import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { VoiceRecorderService } from '../services/voice-recorder.service';

const DEFAULT_LEVELS = [0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14];

@Component({
  selector: 'agent-voice-equalizer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="voice-eq"
      [class.voice-eq--active]="active()"
      [class.voice-eq--live]="live()"
      [class.voice-eq--processing]="processing()"
      role="img"
      [attr.aria-label]="ariaLabel()"
    >
      @for (level of barLevels(); track $index) {
        <span
          class="voice-eq__bar"
          [style.height.%]="processing() ? undefined : barHeight(level)"
          [style.animation-delay.ms]="$index * 70"
        ></span>
      }
    </div>
  `,
  styles: [
    `
      .voice-eq {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 3px;
        height: 32px;
        min-width: 88px;
      }

      .voice-eq__bar {
        width: 5px;
        min-height: 14%;
        border-radius: 999px;
        background: color-mix(in oklch, var(--brand) 35%, var(--ink-4));
        transition: height 55ms linear;
      }

      .voice-eq--live .voice-eq__bar {
        transition: height 35ms linear;
      }

      .voice-eq--active .voice-eq__bar {
        background: linear-gradient(
          180deg,
          color-mix(in oklch, var(--brand-2) 90%, white),
          var(--brand)
        );
        box-shadow: 0 0 8px color-mix(in oklch, var(--brand) 35%, transparent);
      }

      .voice-eq--processing .voice-eq__bar {
        height: 28%;
        transition: none;
        animation: voice-eq-processing 900ms ease-in-out infinite alternate;
      }

      @keyframes voice-eq-processing {
        0% {
          height: 18%;
          opacity: 0.65;
        }
        100% {
          height: 92%;
          opacity: 1;
        }
      }
    `,
  ],
})
export class VoiceEqualizer {
  private readonly voice = inject(VoiceRecorderService);

  readonly levels = input<number[]>(DEFAULT_LEVELS);
  readonly active = input<boolean>(false);
  readonly live = input<boolean>(false);
  readonly processing = input<boolean>(false);

  protected readonly barLevels = computed(() =>
    this.live() ? this.voice.levels() : this.levels(),
  );

  protected barHeight(level: number): number {
    return Math.round(Math.max(14, Math.min(100, level * 100)));
  }

  protected ariaLabel(): string {
    if (this.processing()) return 'Transcribiendo audio';
    if (this.live()) return 'Ecualizador reaccionando a tu voz';
    if (this.active()) return 'Ecualizador de voz activo';
    return 'Ecualizador de voz inactivo';
  }
}
