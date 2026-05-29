import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';


interface AuthOrbitAgent {
  id: string;
  name: string;
  accent: string;
  irisInner: string;
  gazeTransform: string;
  highlightX: number;
  highlightY: number;
  irisRadius: number;
  browLeft: string;
  browRight: string;
  browCrease?: string;
  lidPath?: string;
  browAnimClass: string;
  breatheDelay: string;
}

@Component({
  selector: 'auth-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      display: block;
      min-height: 100dvh;
      background: var(--mkt-bg);
      color: var(--mkt-ink);
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
    }

    .auth-shell-grid {
      background: var(--mkt-bg);
    }

    @media (min-width: 1024px) {
      .auth-shell-grid {
        background: var(--mkt-bg-deep);
      }
    }

    .auth-cyber-grid {
      background-image:
        linear-gradient(var(--mkt-grid-line) 1px, transparent 1px),
        linear-gradient(90deg, var(--mkt-grid-line) 1px, transparent 1px);
      background-size: 56px 56px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 42%, black 38%, transparent 95%);
      -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 42%, black 38%, transparent 95%);
    }

    .auth-cyber-haze {
      background:
        radial-gradient(50rem 32rem at 50% 38%, var(--mkt-haze-1) 0%, transparent 65%),
        radial-gradient(36rem 24rem at 20% 80%, var(--mkt-haze-2) 0%, transparent 65%);
    }

    .auth-panel-main {
      background: var(--mkt-panel);
      border-left: 1px solid var(--mkt-border-subtle);
    }

    .auth-panel-haze {
      background:
        radial-gradient(42rem 28rem at 70% 20%, var(--mkt-haze-1) 0%, transparent 62%),
        radial-gradient(36rem 24rem at 20% 90%, color-mix(in oklch, var(--mkt-ink-3) 12%, transparent) 0%, transparent 65%);
    }

    .auth-panel-grid {
      background-image:
        linear-gradient(color-mix(in oklch, var(--mkt-ink-3) 16%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in oklch, var(--mkt-ink-3) 16%, transparent) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse 90% 70% at 50% 40%, black 30%, transparent 92%);
      -webkit-mask-image: radial-gradient(ellipse 90% 70% at 50% 40%, black 30%, transparent 92%);
    }

    .auth-form-shell {
      background: var(--mkt-form-shell);
      border: 1px solid var(--mkt-auth-shell-border);
      box-shadow: var(--mkt-auth-shell-shadow);
      backdrop-filter: blur(12px);
    }

    .auth-orbit-ring circle {
      stroke: var(--mkt-eye-ring-stroke);
    }

    .auth-satellite-label {
      display: block;
      margin-top: 4px;
      text-align: center;
      font-size: 9px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--mkt-ink-2);
    }

    :host-context(html:not(.dark)) .auth-satellite-label--reglas { color: #1e40af; }
    :host-context(html:not(.dark)) .auth-satellite-label--ml { color: #5b21b6; }
    :host-context(html:not(.dark)) .auth-satellite-label--narrativa { color: #b45309; }
    :host-context(html:not(.dark)) .auth-satellite-label--documentos { color: #be123c; }

    :host-context(html.dark) .auth-satellite-label--reglas { color: #60a5fa; }
    :host-context(html.dark) .auth-satellite-label--ml { color: #a78bfa; }
    :host-context(html.dark) .auth-satellite-label--narrativa { color: #fbbf24; }
    :host-context(html.dark) .auth-satellite-label--documentos { color: #fb7185; }

    .auth-orbit-stage {
      width: 100%;
      max-width: 420px;
      aspect-ratio: 1;
    }

    .auth-orbit-ring {
      animation: authOrbitPulse 4s ease-in-out infinite;
    }

    @keyframes authOrbitPulse {
      0%, 100% { opacity: 0.22; }
      50% { opacity: 0.45; }
    }

    .auth-satellite {
      position: absolute;
      top: 0;
      left: 0;
      width: 78px;
      offset-path: circle(42% at 50% 50%);
      offset-distance: var(--orbit-start);
      offset-rotate: 0deg;
      offset-anchor: center;
      animation: authSatOrbit 36s linear infinite;
      animation-fill-mode: both;
    }

    @keyframes authSatOrbit {
      from { offset-distance: var(--orbit-start); }
      to { offset-distance: calc(var(--orbit-start) + 100%); }
    }

    .auth-satellite--reglas { --orbit-start: 0%; }
    .auth-satellite--ml { --orbit-start: 25%; }
    .auth-satellite--narrativa { --orbit-start: 50%; }
    .auth-satellite--documentos { --orbit-start: 75%; }

    .auth-mini-eye {
      width: 64px;
      height: 64px;
      margin-inline: auto;
      animation: authMiniFloat 4.5s ease-in-out infinite;
    }

    @keyframes authMiniFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    .auth-eye-wrap {
      filter: drop-shadow(0 0 40px rgba(34, 211, 238, 0.28));
    }

    .auth-eye-stroke {
      stroke: var(--mkt-eye-frame-stroke);
    }

    .auth-eye-stroke-soft {
      stroke: var(--mkt-eye-ring-stroke);
    }

    .auth-iris-ring { animation: authIrisPulse 3.4s ease-in-out infinite; }
    @keyframes authIrisPulse {
      0%, 100% { opacity: 0.35; }
      50% { opacity: 0.75; }
    }

    .auth-ray-scan {
      animation: authRayScan 6s linear infinite;
      transform-origin: 200px 200px;
    }

    @keyframes authRayScan {
      from { transform: rotate(0deg); opacity: 0.35; }
      to { transform: rotate(360deg); opacity: 0.35; }
    }

    .auth-eye-iris {
      will-change: transform;
    }

    .auth-eye-blink {
      transform-origin: 200px 135px;
      transform: scaleY(0);
      animation: authEyeBlink 6.4s ease-in-out infinite;
      will-change: transform;
    }

    @keyframes authEyeBlink {
      0%, 92%, 100% { transform: scaleY(0); }
      95% { transform: scaleY(1); }
      98% { transform: scaleY(0); }
    }

    .auth-mini-brow {
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .auth-mini-brows--calm { animation: authBrowCalm 4.8s ease-in-out infinite; transform-origin: 50px 20px; transform-box: fill-box; }
    .auth-mini-brows--vigia { animation: authBrowVigia 2.6s ease-in-out infinite; transform-origin: 50px 20px; transform-box: fill-box; }
    .auth-mini-brows--rastreador { animation: authBrowRastreador 3.2s ease-in-out infinite; transform-origin: 50px 20px; transform-box: fill-box; }

    @keyframes authBrowCalm {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-0.6px); }
    }

    @keyframes authBrowVigia {
      0%, 100% { transform: translateY(0); }
      35% { transform: translateY(1.4px); }
    }

    @keyframes authBrowRastreador {
      0%, 100% { transform: translateY(0); }
      40% { transform: translateY(-1.8px); }
    }

    .auth-mini-gaze {
      transform-origin: 50px 50px;
      transform-box: fill-box;
    }

    .auth-mini-gaze-pulse {
      animation: authMiniGazePulse 5s ease-in-out infinite;
    }

    @keyframes authMiniGazePulse {
      0%, 100% { opacity: 0.92; }
      50% { opacity: 1; }
    }

    .auth-mini-lid {
      animation: authSquintPulse 3.8s ease-in-out infinite;
      transform-origin: 50px 38px;
      transform-box: fill-box;
    }

    @keyframes authSquintPulse {
      0%, 100% { transform: scaleY(1); opacity: 0.94; }
      50% { transform: scaleY(1.06); opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      .auth-orbit-ring,
      .auth-satellite,
      .auth-mini-eye,
      .auth-iris-ring,
      .auth-ray-scan,
      .auth-eye-blink,
      .auth-mini-brows--calm,
      .auth-mini-brows--vigia,
      .auth-mini-brows--rastreador,
      .auth-mini-gaze-pulse,
      .auth-mini-lid {
        animation: none !important;
      }

      .auth-satellite {
        offset-distance: var(--orbit-start);
      }
    }
  `],
  template: `
    <div class="auth-shell-grid min-h-dvh h-dvh lg:min-h-screen lg:h-auto grid lg:grid-cols-[1.05fr_1fr] overflow-x-hidden">

      <!-- Left — cyber eye + orbiting agents (desktop) -->
      <aside class="hidden lg:flex relative min-h-screen overflow-hidden flex-col">
        <div class="absolute inset-0 auth-cyber-haze pointer-events-none" aria-hidden="true"></div>
        <div class="absolute inset-0 auth-cyber-grid pointer-events-none" aria-hidden="true"></div>

        <div class="relative z-10 px-10 xl:px-12 py-8">
          <a routerLink="/" class="inline-flex items-center gap-2.5 w-fit">
            <span class="w-9 h-9 rounded-lg grid place-items-center bg-mkt-accent-muted border border-mkt-accent-border shadow-[0_0_18px_-4px_var(--mkt-glow)] text-mkt-accent">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
                      stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/>
                <circle cx="12" cy="12" r="1.2" fill="currentColor"/>
              </svg>
            </span>
            <div class="leading-tight">
              <div class="text-mkt-ink font-semibold tracking-tight text-[15px]">Centinela</div>
              <div class="text-mkt-accent-ink text-[10px] uppercase tracking-[0.18em] font-semibold">Alertas inteligentes</div>
            </div>
          </a>
        </div>

        <div class="relative z-10 flex-1 flex items-center justify-center px-10 pb-4">
          <div class="auth-orbit-stage relative mx-auto">

            <svg class="absolute inset-0 w-full h-full pointer-events-none auth-orbit-ring" viewBox="0 0 400 400" aria-hidden="true">
              <circle cx="200" cy="200" r="168" fill="none" stroke-width="1" stroke-dasharray="4 7"/>
            </svg>

            @for (agent of orbitAgents; track agent.id) {
              <div [class]="'auth-satellite auth-satellite--' + agent.id">
                <div class="auth-mini-eye"
                     [style.filter]="'drop-shadow(0 0 12px ' + agent.accent + '66)'"
                     [style.animation-delay]="agent.breatheDelay">
                  <svg viewBox="0 0 100 100" class="w-full h-full" aria-hidden="true">
                    <defs>
                      <clipPath [attr.id]="'auth-orbit-clip-' + agent.id">
                        <path d="M18 50 Q50 22 82 50 Q50 78 18 50 Z"/>
                      </clipPath>
                      <radialGradient [attr.id]="'auth-orbit-iris-' + agent.id" cx="38%" cy="32%" r="68%">
                        <stop offset="0%" [attr.stop-color]="agent.accent" stop-opacity="0.95"/>
                        <stop offset="55%" [attr.stop-color]="agent.irisInner"/>
                        <stop offset="100%" stop-color="#082f49"/>
                      </radialGradient>
                    </defs>
                    <g [class]="'auth-mini-brows ' + agent.browAnimClass" [style.animation-delay]="agent.breatheDelay">
                      <path [attr.d]="agent.browLeft" class="auth-mini-brow" [attr.stroke]="agent.accent" stroke-width="2.2" stroke-opacity="0.9"/>
                      <path [attr.d]="agent.browRight" class="auth-mini-brow" [attr.stroke]="agent.accent" stroke-width="2.2" stroke-opacity="0.9"/>
                      @if (agent.browCrease) {
                        <path [attr.d]="agent.browCrease" class="auth-mini-brow" [attr.stroke]="agent.accent" stroke-width="1.4" stroke-opacity="0.55"/>
                      }
                    </g>
                    <path d="M18 50 Q50 22 82 50 Q50 78 18 50 Z"
                          fill="var(--mkt-eye-socket)"
                          [attr.stroke]="agent.accent"
                          stroke-width="1.3"
                          stroke-opacity="0.75"/>
                    <g [attr.clip-path]="'url(#auth-orbit-clip-' + agent.id + ')'">
                      <g class="auth-mini-gaze auth-mini-gaze-pulse"
                         [attr.transform]="agent.gazeTransform"
                         [style.animation-delay]="agent.breatheDelay">
                        <circle cx="50" cy="50" [attr.r]="agent.irisRadius"
                                [attr.fill]="'url(#auth-orbit-iris-' + agent.id + ')'"/>
                        <circle cx="50" cy="50" [attr.r]="agent.irisRadius * 0.46" fill="#020617"/>
                        <circle [attr.cx]="agent.highlightX" [attr.cy]="agent.highlightY" r="1.8" fill="white" opacity="0.62"/>
                      </g>
                      @if (agent.lidPath) {
                        <path [attr.d]="agent.lidPath" fill="var(--mkt-eye-socket)" class="auth-mini-lid" [style.animation-delay]="agent.breatheDelay"/>
                      }
                    </g>
                  </svg>
                </div>
                <span [class]="'auth-satellite-label auth-satellite-label--' + agent.id">{{ agent.name }}</span>
              </div>
            }

            <!-- Central eye -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="auth-eye-wrap w-[52%] max-w-[220px] aspect-square">
                <svg viewBox="0 0 400 400" class="w-full h-full" aria-hidden="true">
                  <defs>
                    <clipPath id="auth-eye-clip">
                      <path d="M70 200 Q200 70 330 200 Q200 330 70 200 Z"/>
                    </clipPath>
                    <radialGradient id="auth-iris" cx="38%" cy="32%" r="68%">
                      <stop offset="0%" stop-color="#a5f3fc"/>
                      <stop offset="22%" stop-color="#22d3ee"/>
                      <stop offset="55%" stop-color="#0e7490"/>
                      <stop offset="100%" stop-color="#082f49"/>
                    </radialGradient>
                    <radialGradient id="auth-pupil" cx="36%" cy="30%" r="72%">
                      <stop offset="0%" stop-color="#0f172a"/>
                      <stop offset="100%" stop-color="#000"/>
                    </radialGradient>
                    <filter id="auth-glow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/>
                      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>

                  <g class="auth-ray-scan auth-eye-stroke" stroke-width="1.6" fill="none">
                    <circle cx="200" cy="200" r="184" stroke-dasharray="2 18"/>
                  </g>

                  <circle cx="200" cy="200" r="190" fill="none" class="auth-eye-stroke-soft" stroke-width="1"/>
                  <polygon points="200,46 320,116 320,284 200,354 80,284 80,116"
                           fill="none" class="auth-eye-stroke" stroke-width="1.4"/>

                  <path d="M70 200 Q200 70 330 200 Q200 330 70 200 Z"
                        fill="var(--mkt-eye-socket-fill)"
                        class="auth-eye-stroke"
                        stroke-width="1.6"/>

                  <g class="auth-eye-iris" [attr.transform]="irisTransform()">
                    <circle cx="200" cy="200" r="50" fill="url(#auth-iris)" filter="url(#auth-glow)"/>
                    <circle cx="200" cy="200" r="48" fill="none" stroke="rgba(165, 243, 252, 0.45)" stroke-width="1.1" class="auth-iris-ring"/>
                    <circle cx="200" cy="200" r="20" fill="url(#auth-pupil)"/>
                    <ellipse cx="188" cy="190" rx="8" ry="5" fill="white" opacity="0.62" transform="rotate(-22 188 190)"/>
                  </g>

                  <g clip-path="url(#auth-eye-clip)">
                    <path d="M70 200 Q200 70 330 200 Q200 330 70 200 Z"
                          fill="var(--mkt-eye-socket-fill)"
                          class="auth-eye-blink auth-eye-stroke"
                          stroke-width="1.6"/>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div class="relative z-10 px-10 xl:px-12 pb-8 space-y-4">
          <div>
            <div class="text-mkt-accent-ink text-[11px] uppercase tracking-[0.18em] mb-2 font-semibold mkt-eyebrow">Panel multiagente</div>
            <p class="text-[22px] font-semibold text-mkt-ink tracking-tight leading-snug max-w-[320px]">
              Cuatro especialistas, un acceso
            </p>
            <p class="text-mkt-ink-2 text-[14px] mt-2 max-w-[340px] leading-relaxed font-medium">
              Leslie, Naomi, Ámbar e Iris orbitan el mismo núcleo y Naelis, la moderadora, sintetiza el consenso. Ingresa y elige tu perspectiva.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-mkt-ink-2 font-semibold border border-mkt-border bg-mkt-seal rounded-full px-2.5 py-1">
              <span class="w-1 h-1 rounded-full bg-emerald-400"></span>
              Datos sintéticos
            </span>
            <span class="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-mkt-ink-2 font-semibold border border-mkt-border bg-mkt-seal rounded-full px-2.5 py-1">
              <span class="w-1 h-1 rounded-full bg-emerald-400"></span>
              Decisión humana
            </span>
          </div>
        </div>

        <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-mkt-deep to-transparent pointer-events-none"></div>
      </aside>

      <!-- Right — form -->
      <main class="auth-panel-main relative flex min-h-0 h-full lg:min-h-screen items-center justify-center px-4 py-5 sm:p-10 lg:p-14 overflow-y-auto overflow-x-hidden scroll-pretty">
        <div class="absolute inset-0 auth-panel-haze pointer-events-none" aria-hidden="true"></div>
        <div class="absolute inset-0 auth-panel-grid pointer-events-none" aria-hidden="true"></div>
        <div class="relative w-full max-w-[440px] my-auto py-2 sm:py-0">
          <div class="auth-form-shell rounded-2xl p-5 sm:p-8">
            <router-outlet/>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class AuthShell implements AfterViewInit, OnDestroy {
  private readonly doc = inject(DOCUMENT);
  private readonly zone = inject(NgZone);

  // Smoothed iris position (spring output), normalised to roughly [-0.5, 0.5].
  private readonly irisX = signal(0);
  private readonly irisY = signal(0);

  protected readonly irisTransform = computed(() => {
    const mx = (this.irisX() * 22).toFixed(2);
    const my = (this.irisY() * 14).toFixed(2);
    return `translate(${mx}, ${my})`;
  });

  protected readonly orbitAgents: readonly AuthOrbitAgent[] = [
    {
      id: 'reglas',
      name: 'Leslie',
      accent: '#60a5fa',
      irisInner: '#1e40af',
      gazeTransform: 'translate(0, 4.5)',
      highlightX: 47.2,
      highlightY: 48,
      irisRadius: 11.5,
      browLeft: 'M 24 18 L 41 16',
      browRight: 'M 76 18 L 59 16',
      browAnimClass: 'auth-mini-brows--calm',
      breatheDelay: '0ms',
    },
    {
      id: 'ml',
      name: 'Naomi',
      accent: '#a78bfa',
      irisInner: '#5b21b6',
      gazeTransform: 'translate(4.5, -3.5)',
      highlightX: 48.8,
      highlightY: 46.2,
      irisRadius: 10.5,
      browLeft: 'M 21 15 L 39 23',
      browRight: 'M 79 15 L 61 23',
      lidPath: 'M 24 41 Q 50 35 76 41 L 72 47 Q 50 43 28 47 Z',
      browAnimClass: 'auth-mini-brows--vigia',
      breatheDelay: '800ms',
    },
    {
      id: 'narrativa',
      name: 'Ámbar',
      accent: '#fbbf24',
      irisInner: '#b45309',
      gazeTransform: 'translate(0, 4.5)',
      highlightX: 47.2,
      highlightY: 48,
      irisRadius: 11.5,
      browLeft: 'M 24 17 L 41 16',
      browRight: 'M 76 17 L 59 16',
      browAnimClass: 'auth-mini-brows--calm',
      breatheDelay: '1200ms',
    },
    {
      id: 'documentos',
      name: 'Iris',
      accent: '#fb7185',
      irisInner: '#be123c',
      gazeTransform: 'translate(-4.5, -3.5)',
      highlightX: 45.2,
      highlightY: 46.2,
      irisRadius: 12.5,
      browLeft: 'M 20 12 Q 34 8 43 11',
      browRight: 'M 77 17 L 59 16',
      browAnimClass: 'auth-mini-brows--rastreador',
      breatheDelay: '2000ms',
    },
  ];

  // Spring state — target is where the cursor points, cur/vel glide toward it.
  private targetX = 0;
  private targetY = 0;
  private curX = 0;
  private curY = 0;
  private velX = 0;
  private velY = 0;
  private rafId = 0;
  private lastFrame = 0;
  private settled = true;
  private reducedMotion = false;
  private unlisten?: () => void;

  ngAfterViewInit(): void {
    this.reducedMotion =
      this.doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;

    this.zone.runOutsideAngular(() => {
      const onMouse = (event: MouseEvent): void => {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        this.targetX = event.clientX / w - 0.5;
        this.targetY = event.clientY / h - 0.5;

        if (this.reducedMotion) {
          this.curX = this.targetX;
          this.curY = this.targetY;
          this.irisX.set(this.curX);
          this.irisY.set(this.curY);
          return;
        }
        this.startSpring();
      };

      this.doc.addEventListener('mousemove', onMouse, { passive: true });
      this.unlisten = () => this.doc.removeEventListener('mousemove', onMouse);
    });
  }

  private startSpring(): void {
    if (!this.settled) return;
    this.settled = false;
    this.lastFrame = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  // Critically-near spring: a touch underdamped for a natural, loose glide.
  private readonly tick = (now: number): void => {
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.032) : 0.016;
    this.lastFrame = now;

    const stiffness = 130;
    const damping = 20;

    this.velX += ((this.targetX - this.curX) * stiffness - this.velX * damping) * dt;
    this.velY += ((this.targetY - this.curY) * stiffness - this.velY * damping) * dt;
    this.curX += this.velX * dt;
    this.curY += this.velY * dt;

    this.irisX.set(this.curX);
    this.irisY.set(this.curY);

    const offset = Math.hypot(this.targetX - this.curX, this.targetY - this.curY);
    const speed = Math.hypot(this.velX, this.velY);
    if (offset > 0.0006 || speed > 0.002) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    this.curX = this.targetX;
    this.curY = this.targetY;
    this.velX = 0;
    this.velY = 0;
    this.irisX.set(this.curX);
    this.irisY.set(this.curY);
    this.settled = true;
    this.lastFrame = 0;
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.unlisten?.();
  }
}
