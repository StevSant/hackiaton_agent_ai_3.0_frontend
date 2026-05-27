import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Left-panel layout for authentication pages.
 *
 * Shows the Centinela tower illustration as background.
 * An interactive eye SVG is composited on top of the tower's dome:
 * the iris tracks the mouse cursor in real-time.
 *
 * Dome position in the 1024×1024 source image: ≈ (512, 268), r ≈ 82px.
 * The SVG viewBox matches the image dimensions so coordinates stay stable
 * regardless of the panel's rendered size.
 */
@Component({
  selector: 'auth-shell',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .eye-iris { transition: transform 85ms linear; will-change: transform; }
    .iris-ring { animation: irisPulse 3.4s ease-in-out infinite; }
    @keyframes irisPulse {
      0%, 100% { opacity: 0.20; }
      50%       { opacity: 0.50; }
    }
    .dome-ring { animation: domePulse 4s ease-in-out infinite; }
    @keyframes domePulse {
      0%, 100% { opacity: 0.28; }
      50%       { opacity: 0.55; }
    }
  `],
  template: `
    <div class="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-canvas">

      <!-- ── Left panel: tower + eye ───────────────────────────────────── -->
      <aside
        class="hidden lg:block relative min-h-screen overflow-hidden"
        #eyePanel
      >
        <!--
          SVG viewBox matches the source image (1024 × 1024) and uses
          xMidYMid slice so the tower is always centred and cropped cleanly.
          All eye elements use image-space coordinates so they stay anchored
          to the dome even as the panel resizes.
        -->
        <svg
          class="absolute inset-0 w-full h-full"
          viewBox="0 0 1024 1024"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>

            <!-- Iris: electric blue, brightest at top-left (cornea physics) -->
            <radialGradient id="ea-iris" cx="37%" cy="31%" r="68%">
              <stop offset="0%"   stop-color="#b0f0ff"/>
              <stop offset="22%"  stop-color="#28a8f8"/>
              <stop offset="60%"  stop-color="#0b54c0"/>
              <stop offset="100%" stop-color="#041d40"/>
            </radialGradient>

            <!-- Pupil -->
            <radialGradient id="ea-pupil" cx="36%" cy="30%" r="72%">
              <stop offset="0%"   stop-color="#101c2c"/>
              <stop offset="100%" stop-color="#000"/>
            </radialGradient>

            <!-- Sclera: ivory white with subtle blue tint toward edges -->
            <radialGradient id="ea-sclera" cx="45%" cy="38%" r="65%">
              <stop offset="0%"   stop-color="#f2f9ff"/>
              <stop offset="75%"  stop-color="#daeeff"/>
              <stop offset="100%" stop-color="#b6d6f4"/>
            </radialGradient>

            <!-- Vignette for the panel (darkens corners) -->
            <radialGradient id="ea-vignette" gradientUnits="userSpaceOnUse"
                            cx="512" cy="512" r="620">
              <stop offset="0%"   stop-color="transparent"/>
              <stop offset="100%" stop-color="rgba(0,0,0,0.55)"/>
            </radialGradient>

            <!-- Soft glow applied to the iris circle -->
            <filter id="ea-iris-glow" x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>

            <!-- Halo glow for the dome ring -->
            <filter id="ea-dome-glow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>

            <!--
              Dome mask — fixed in image space at the tower's glass sphere.
              Applied to a NON-TRANSLATED wrapper so the clip region stays
              anchored to the dome regardless of the iris translation inside.
              Dome parameters:  cx=512  cy=268  r=82
            -->
            <mask id="ea-dome-mask">
              <circle cx="512" cy="268" r="80" fill="white"/>
            </mask>

          </defs>

          <!-- 1 ── Tower illustration (full-bleed background) -->
          <image
            href="/assets/auth/centinela-hero.png"
            x="0" y="0" width="1024" height="1024"
            preserveAspectRatio="xMidYMid slice"
          />

          <!-- 2 ── Vignette overlay -->
          <rect width="1024" height="1024" fill="url(#ea-vignette)"/>

          <!-- 3 ── Sclera: fixed, independently clipped to dome circle -->
          <ellipse
            cx="512" cy="268" rx="72" ry="46"
            fill="url(#ea-sclera)"
            mask="url(#ea-dome-mask)"
          />

          <!--
            4 ── Iris + pupil + glints
            IMPORTANT: The mask is on the OUTER wrapper (no transform) so the
            dome circle clip stays anchored.  Only the INNER group translates.
          -->
          <g mask="url(#ea-dome-mask)">
            <g class="eye-iris" [attr.transform]="irisTransform()">
              <!-- Iris base -->
              <circle cx="512" cy="268" r="34"
                      fill="url(#ea-iris)"
                      filter="url(#ea-iris-glow)"/>
              <!-- Iris fibre rings (pulsing) -->
              <circle cx="512" cy="268" r="32" fill="none"
                      stroke="rgba(176,240,255,0.35)" stroke-width="1.1"
                      class="iris-ring"/>
              <circle cx="512" cy="268" r="27" fill="none"
                      stroke="rgba(40,168,248,0.20)" stroke-width="0.8"/>
              <circle cx="512" cy="268" r="22" fill="none"
                      stroke="rgba(40,168,248,0.14)" stroke-width="0.7"/>
              <!-- Pupil -->
              <circle cx="512" cy="268" r="15" fill="url(#ea-pupil)"/>
              <!-- Cornea reflection — primary -->
              <ellipse cx="499" cy="258" rx="6.5" ry="4.5"
                       fill="white" opacity="0.58"
                       transform="rotate(-22,499,258)"/>
              <!-- Cornea reflection — secondary (small) -->
              <circle cx="521" cy="264" r="2.5" fill="white" opacity="0.26"/>
            </g>
          </g>

          <!-- 5 ── Dome glass overlay (on top of eye) -->
          <!-- Top-sphere highlight (glass refraction) -->
          <ellipse cx="512" cy="236" rx="52" ry="21"
                   fill="rgba(255,255,255,0.07)"/>
          <!-- Thin bright dome rim -->
          <circle cx="512" cy="268" r="80"
                  fill="none"
                  stroke="rgba(160,230,255,0.30)"
                  stroke-width="1.3"/>
          <!-- Glowing halo around dome (pulsing) -->
          <circle cx="512" cy="268" r="83"
                  fill="none"
                  stroke="rgba(80,190,255,0.28)"
                  stroke-width="3"
                  filter="url(#ea-dome-glow)"
                  class="dome-ring"/>

        </svg>

        <!-- Top & bottom dark gradients (HTML — drawn over the SVG) -->
        <div
          class="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 via-black/35 to-transparent pointer-events-none"
          aria-hidden="true"
        ></div>
        <div
          class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 via-black/35 to-transparent pointer-events-none"
          aria-hidden="true"
        ></div>

        <!-- Brand badge (top-left) -->
        <div class="relative z-10 flex h-full min-h-screen flex-col justify-between px-10 xl:px-12 py-8 text-white">
          <div class="flex items-center gap-2.5 shrink-0 rounded-xl bg-black/30 px-3 py-2.5 backdrop-blur-[2px] w-fit">
            <div class="w-9 h-9 rounded-md grid place-items-center bg-white/15 backdrop-blur-sm border border-white/25">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3z"
                      stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
                <path d="M9 12.5 11 14.5 15 10.5"
                      stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <div class="font-semibold text-[16px] tracking-tight leading-none drop-shadow-sm">Centinela</div>
              <div class="text-[10.5px] uppercase tracking-[0.06em] opacity-90 mt-0.5 drop-shadow-sm">Fraud Intelligence</div>
            </div>
          </div>

          <!-- Status badge (bottom-left) -->
          <div class="flex items-center gap-3 text-[11.5px] shrink-0 rounded-xl bg-black/30 px-3 py-2 backdrop-blur-[2px] w-fit">
            <span class="inline-flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
              Datos sintéticos — sin PII real
            </span>
            <span class="opacity-60">·</span>
            <span>v0.1 prototipo</span>
          </div>
        </div>
      </aside>

      <!-- ── Right panel: login form ────────────────────────────────────── -->
      <main class="auth-panel-main flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div class="w-full max-w-[420px]">
          <router-outlet/>
        </div>
      </main>

    </div>
  `,
})
export class AuthShell implements AfterViewInit, OnDestroy {
  private readonly doc  = inject(DOCUMENT);
  private readonly zone = inject(NgZone);

  @ViewChild('eyePanel') private readonly eyePanel!: ElementRef<HTMLElement>;

  /** SVG translate applied to the iris+pupil inner group. */
  protected readonly irisTransform = signal('translate(0,0)');

  private _rafId  = 0;
  private _pendTx = 0;
  private _pendTy = 0;
  private _unlisten?: () => void;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const handler = (e: MouseEvent): void => {
        const rect = this.eyePanel.nativeElement.getBoundingClientRect();
        if (rect.width === 0) return;

        // Mouse relative to panel centre (screen pixels)
        const dx = e.clientX - (rect.left + rect.width  * 0.5);
        const dy = e.clientY - (rect.top  + rect.height * 0.5);

        // Normalise to a unit circle using half the panel width as reference
        const ref  = rect.width * 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Clamp to [0, 1] — clamping keeps the iris inside the dome when
        // the mouse wanders beyond the panel edges
        const norm  = Math.min(1, dist / ref);
        const angle = Math.atan2(dy, dx);

        // Scale to SVG units: max 24 (dome r=82, iris r=34 → slack=48)
        const MAX = 24;
        this._pendTx = +(Math.cos(angle) * norm * MAX).toFixed(1);
        this._pendTy = +(Math.sin(angle) * norm * MAX).toFixed(1);

        cancelAnimationFrame(this._rafId);
        this._rafId = requestAnimationFrame(() => {
          this.irisTransform.set(`translate(${this._pendTx},${this._pendTy})`);
        });
      };

      this.doc.addEventListener('mousemove', handler, { passive: true });
      this._unlisten = () => this.doc.removeEventListener('mousemove', handler);
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this._rafId);
    this._unlisten?.();
  }
}
