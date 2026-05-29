import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { AgentPersona } from '@shared/utils';

let uidCounter = 0;

/**
 * The animated multi-agent eye, extracted from the landing hero so the persona
 * visuals (Leslie/Naomi/Ámbar/Iris/Naelis) can be reused on the claim-detail
 * summary chips and the full debate cards. Presentational: takes a persona +
 * size, renders the orbital iris driven by the persona's accent and gaze
 * animation. Self-contained styles — no marketing theme vars required.
 */
@Component({
  selector: 'ui-agent-eye',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="eye-shell"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.--agent-accent]="persona().accent"
      [style.filter]="'drop-shadow(0 0 ' + size() / 5 + 'px ' + persona().accent + '55)'"
      [style.animation-delay]="delay()"
    >
      <svg viewBox="0 0 100 100" class="w-full h-full" aria-hidden="true">
        <defs>
          <clipPath [attr.id]="'ae-clip-' + uid">
            <path d="M18 50 Q50 22 82 50 Q50 78 18 50 Z" />
          </clipPath>
          <radialGradient [attr.id]="'ae-iris-' + uid" cx="38%" cy="32%" r="68%">
            <stop offset="0%" [attr.stop-color]="persona().accent" stop-opacity="0.95" />
            <stop offset="55%" [attr.stop-color]="persona().irisInner" />
            <stop offset="100%" stop-color="#082f49" />
          </radialGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          [attr.stroke]="persona().accent"
          stroke-width="0.9"
          stroke-dasharray="3 6"
          stroke-opacity="0.4"
          class="ma-orbit-ring"
          [style.animation-delay]="delay()"
        />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          [attr.stroke]="persona().accent"
          stroke-opacity="0.22"
          stroke-width="1"
        />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          [attr.stroke]="persona().accent"
          stroke-width="1.6"
          stroke-dasharray="2 20"
          stroke-linecap="round"
          class="ma-scan-arc"
          [style.animation-delay]="delay()"
        />
        <polygon
          points="50,11 84,30 84,70 50,89 16,70 16,30"
          fill="none"
          [attr.stroke]="persona().accent"
          stroke-opacity="0.34"
          stroke-width="0.8"
        />
        <polygon
          points="50,18 77,34 77,66 50,82 23,66 23,34"
          fill="none"
          [attr.stroke]="persona().accent"
          stroke-opacity="0.18"
          stroke-width="0.6"
        />
        <g
          [attr.stroke]="persona().accent"
          stroke-width="1"
          stroke-opacity="0.55"
          stroke-linecap="round"
        >
          <line x1="50" y1="4" x2="50" y2="9" />
          <line x1="50" y1="91" x2="50" y2="96" />
          <line x1="4" y1="50" x2="9" y2="50" />
          <line x1="91" y1="50" x2="96" y2="50" />
        </g>
        <g [class]="'ma-brows ' + persona().browAnimClass" [style.animation-delay]="delay()">
          <path
            [attr.d]="persona().browLeft"
            class="ma-brow"
            [attr.stroke]="persona().accent"
            stroke-width="2.2"
            stroke-opacity="0.9"
          />
          <path
            [attr.d]="persona().browRight"
            class="ma-brow"
            [attr.stroke]="persona().accent"
            stroke-width="2.2"
            stroke-opacity="0.9"
          />
          @if (persona().browCrease) {
            <path
              [attr.d]="persona().browCrease!"
              class="ma-brow"
              [attr.stroke]="persona().accent"
              stroke-width="1.4"
              stroke-opacity="0.55"
            />
          }
        </g>
        <path
          d="M18 50 Q50 22 82 50 Q50 78 18 50 Z"
          [attr.fill]="'var(--eye-socket)'"
          [attr.stroke]="persona().accent"
          stroke-width="1.3"
          stroke-opacity="0.75"
        />
        <g [attr.clip-path]="'url(#ae-clip-' + uid + ')'">
          <g [class]="'ma-gaze ' + persona().gazeClass" [style.animation-delay]="delay()">
            <circle
              cx="50"
              cy="50"
              [attr.r]="persona().irisRadius"
              [attr.fill]="'url(#ae-iris-' + uid + ')'"
              class="ma-iris-pulse"
              [style.animation-delay]="delay()"
            />
            <circle
              cx="50"
              cy="50"
              [attr.r]="persona().irisRadius * 0.82"
              fill="none"
              stroke="rgba(165, 243, 252, 0.4)"
              stroke-width="0.5"
            />
            <circle cx="50" cy="50" [attr.r]="persona().irisRadius * 0.46" fill="#020617" />
            <circle
              [attr.cx]="persona().highlightX"
              [attr.cy]="persona().highlightY"
              r="1.8"
              fill="white"
              opacity="0.62"
            />
          </g>
          @if (persona().lidPath) {
            <path
              [attr.d]="persona().lidPath!"
              [attr.fill]="'var(--eye-socket)'"
              class="ma-lid-squint"
              [style.animation-delay]="delay()"
            />
          }
        </g>
      </svg>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        line-height: 0;
        --eye-socket: #0a1424;
      }

      .eye-shell {
        position: relative;
        flex-shrink: 0;
        animation: aeFloat 5.5s ease-in-out infinite;
      }

      .eye-shell::before {
        content: '';
        position: absolute;
        inset: -14%;
        border-radius: 50%;
        background: radial-gradient(circle, var(--agent-accent) 0%, transparent 68%);
        opacity: 0.2;
        animation: aeHalo 3.4s ease-in-out infinite;
        z-index: 0;
        pointer-events: none;
      }

      .eye-shell svg {
        position: relative;
        z-index: 1;
      }

      @keyframes aeFloat {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-5px);
        }
      }

      @keyframes aeHalo {
        0%,
        100% {
          opacity: 0.14;
          transform: scale(0.96);
        }
        50% {
          opacity: 0.32;
          transform: scale(1.06);
        }
      }

      .ma-orbit-ring {
        transform-origin: 50px 50px;
        transform-box: fill-box;
        animation: aeRingSpin 18s linear infinite;
      }

      @keyframes aeRingSpin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .ma-scan-arc {
        transform-origin: 50px 50px;
        transform-box: fill-box;
        animation: aeScanArc 5s linear infinite;
        opacity: 0.55;
      }

      @keyframes aeScanArc {
        from {
          transform: rotate(0deg);
          opacity: 0.2;
        }
        15% {
          opacity: 0.65;
        }
        to {
          transform: rotate(360deg);
          opacity: 0.2;
        }
      }

      .ma-brow {
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .ma-brows {
        transform-origin: 50px 20px;
        transform-box: fill-box;
      }
      .ma-brows--calm {
        animation: aeBrowCalm 4.8s ease-in-out infinite;
      }
      .ma-brows--vigia {
        animation: aeBrowVigia 2.6s ease-in-out infinite;
      }
      .ma-brows--rastreador {
        animation: aeBrowRastreador 3.2s ease-in-out infinite;
      }
      .ma-brows--sorpresa {
        animation: aeBrowSorpresa 3.8s ease-in-out infinite;
      }

      @keyframes aeBrowCalm {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-0.6px);
        }
      }

      @keyframes aeBrowVigia {
        0%,
        100% {
          transform: translateY(0);
        }
        35% {
          transform: translateY(1.4px);
        }
        55% {
          transform: translateY(0.6px);
        }
      }

      @keyframes aeBrowRastreador {
        0%,
        100% {
          transform: translateY(0);
        }
        40% {
          transform: translateY(-1.8px);
        }
        65% {
          transform: translateY(-0.5px);
        }
      }

      @keyframes aeBrowSorpresa {
        0%,
        100% {
          transform: translateY(0);
        }
        45% {
          transform: translateY(-1px);
        }
      }

      .ma-gaze {
        transform-origin: 50px 50px;
        transform-box: fill-box;
      }
      .ma-gaze--centinela {
        animation: aeGazeCentinela 6s ease-in-out infinite;
      }
      .ma-gaze--vigia {
        animation: aeGazeVigia 4.5s ease-in-out infinite;
      }
      .ma-gaze--rastreador {
        animation: aeGazeRastreador 4.8s ease-in-out infinite;
      }
      .ma-gaze--relato {
        animation: aeGazeRelato 5.4s ease-in-out infinite;
      }

      @keyframes aeGazeCentinela {
        0%,
        100% {
          transform: translate(0, 4.5px);
        }
        30% {
          transform: translate(2px, 5.5px);
        }
        60% {
          transform: translate(-2px, 5.5px);
        }
      }

      @keyframes aeGazeVigia {
        0%,
        100% {
          transform: translate(4.5px, -3.8px);
        }
        25% {
          transform: translate(5.8px, -4.6px);
        }
        55% {
          transform: translate(3.2px, -3px);
        }
        80% {
          transform: translate(5px, -4.2px);
        }
      }

      @keyframes aeGazeRastreador {
        0%,
        100% {
          transform: translate(-4.5px, -3.8px);
        }
        28% {
          transform: translate(-5.8px, -4.5px);
        }
        52% {
          transform: translate(-3px, -3px);
        }
        78% {
          transform: translate(-5.2px, -4.2px);
        }
      }

      @keyframes aeGazeRelato {
        0%,
        100% {
          transform: translate(4px, -0.5px);
        }
        40% {
          transform: translate(5.5px, 0.5px);
        }
        75% {
          transform: translate(3px, 0);
        }
      }

      .ma-iris-pulse {
        animation: aeIrisPulse 3.4s ease-in-out infinite;
        transform-origin: center;
        transform-box: fill-box;
      }

      @keyframes aeIrisPulse {
        0%,
        100% {
          opacity: 0.86;
          filter: brightness(1);
        }
        50% {
          opacity: 1;
          filter: brightness(1.12);
        }
      }

      .ma-lid-squint {
        animation: aeSquint 3.8s ease-in-out infinite;
        transform-origin: 50px 38px;
        transform-box: fill-box;
      }

      @keyframes aeSquint {
        0%,
        100% {
          transform: scaleY(1);
          opacity: 0.94;
        }
        50% {
          transform: scaleY(1.06);
          opacity: 1;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .eye-shell,
        .eye-shell::before,
        .ma-orbit-ring,
        .ma-scan-arc,
        .ma-brows,
        .ma-gaze,
        .ma-iris-pulse,
        .ma-lid-squint {
          animation: none !important;
        }
      }
    `,
  ],
})
export class AgentEye {
  readonly persona = input.required<AgentPersona>();
  /** Eye diameter in px. */
  readonly size = input<number>(64);
  /** Animation stagger so a row of eyes doesn't pulse in lockstep. */
  readonly delay = input<string>('0ms');

  protected readonly uid = `${++uidCounter}`;
}
