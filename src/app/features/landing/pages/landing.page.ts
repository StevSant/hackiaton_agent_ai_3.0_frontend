import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth/auth.store';
import { Icon } from '@shared/ui/icon';

type Perspective = 'analista' | 'antifraude';

interface PerspectiveCopy {
  eyebrow: string;
  title: string;
  description: string;
  focusBullets: readonly string[];
  ctaLabel: string;
}

interface MockClaimRow {
  id: string;
  asegurado: string;
  ramo: string;
  score: number;
  tier: 'rojo' | 'amarillo' | 'verde';
  signal: string;
}

@Component({
  selector: 'page-landing',
  standalone: true,
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      display: block;
      background: #05070d;
      color: #e2e8f0;
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
      min-height: 100dvh;
    }

    /* ── Background grid + radial glow ────────────────────────────── */
    .cyber-grid {
      background-image:
        linear-gradient(rgba(59, 130, 246, 0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.07) 1px, transparent 1px);
      background-size: 56px 56px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 35%, black 38%, transparent 95%);
      -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 35%, black 38%, transparent 95%);
    }

    .cyber-haze {
      background:
        radial-gradient(60rem 36rem at 50% 28%, rgba(34, 211, 238, 0.18) 0%, transparent 65%),
        radial-gradient(48rem 28rem at 15% 85%, rgba(59, 130, 246, 0.14) 0%, transparent 65%),
        radial-gradient(40rem 24rem at 85% 75%, rgba(168, 85, 247, 0.12) 0%, transparent 70%);
    }

    /* ── Glow text ────────────────────────────────────────────────── */
    .glow-text {
      text-shadow:
        0 0 18px rgba(34, 211, 238, 0.32),
        0 0 38px rgba(34, 211, 238, 0.18);
    }

    .glow-button {
      box-shadow:
        0 0 0 1px rgba(34, 211, 238, 0.4),
        0 8px 32px -8px rgba(34, 211, 238, 0.55),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
      transition: transform 200ms ease, box-shadow 200ms ease;
    }
    .glow-button:hover {
      transform: translateY(-1px);
      box-shadow:
        0 0 0 1px rgba(34, 211, 238, 0.55),
        0 14px 38px -6px rgba(34, 211, 238, 0.65),
        inset 0 1px 0 rgba(255, 255, 255, 0.16);
    }

    /* ── Glass cards ──────────────────────────────────────────────── */
    .glass {
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(11, 15, 25, 0.85) 100%);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(148, 163, 184, 0.14);
      transition: transform 280ms ease, border-color 280ms ease, box-shadow 280ms ease;
    }
    .glass-hover:hover {
      transform: translateY(-6px);
      border-color: rgba(103, 232, 249, 0.45);
      box-shadow:
        0 0 0 1px rgba(34, 211, 238, 0.25),
        0 24px 64px -16px rgba(34, 211, 238, 0.45);
    }

    /* ── Eye animations ───────────────────────────────────────────── */
    .iris-pulse { animation: irisPulse 3.4s ease-in-out infinite; }
    @keyframes irisPulse {
      0%, 100% { opacity: 0.35; transform-origin: center; transform: scale(1); }
      50%       { opacity: 0.75; transform: scale(1.06); }
    }

    .ray-scan { animation: rayScan 6s linear infinite; transform-origin: 200px 200px; }
    @keyframes rayScan {
      0%   { transform: rotate(0deg); opacity: 0.0; }
      8%   { opacity: 0.55; }
      92%  { opacity: 0.55; }
      100% { transform: rotate(360deg); opacity: 0.0; }
    }

    .node-pulse { animation: nodePulse 2.8s ease-in-out infinite; }
    @keyframes nodePulse {
      0%, 100% { opacity: 0.55; }
      50%      { opacity: 1; }
    }

    .data-line {
      stroke-dasharray: 240;
      stroke-dashoffset: 240;
      animation: dataFlow 4s linear infinite;
    }
    @keyframes dataFlow {
      0%   { stroke-dashoffset: 240; opacity: 0.1; }
      40%  { opacity: 0.9; }
      100% { stroke-dashoffset: 0; opacity: 0.1; }
    }

    /* ── Timeline ─────────────────────────────────────────────────── */
    .timeline-line {
      background: linear-gradient(180deg, transparent 0%, rgba(34, 211, 238, 0.5) 12%, rgba(34, 211, 238, 0.5) 88%, transparent 100%);
    }

    .step-card { transition: transform 320ms ease, border-color 320ms ease, box-shadow 320ms ease; }
    .step-card:hover {
      transform: translateX(6px);
      border-color: rgba(103, 232, 249, 0.45);
    }

    /* ── Floating perspective preview ─────────────────────────────── */
    .preview-deck {
      background: linear-gradient(160deg, #0b1220 0%, #060912 100%);
      border: 1px solid rgba(148, 163, 184, 0.12);
      box-shadow:
        0 0 0 1px rgba(15, 23, 42, 0.8),
        0 32px 80px -24px rgba(0, 0, 0, 0.75),
        0 0 80px -20px rgba(34, 211, 238, 0.3);
    }

    .preview-bar {
      transition: height 700ms cubic-bezier(0.22, 1, 0.36, 1), background 400ms ease;
    }

    /* ── Reveal on scroll ─────────────────────────────────────────── */
    .reveal {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 700ms ease, transform 700ms ease;
    }
    .reveal.is-visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* ── Misc helpers ─────────────────────────────────────────────── */
    .tier-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex: 0 0 auto; }
    .tier-rojo    { background: #ef4444; box-shadow: 0 0 12px rgba(239,68,68,0.6); }
    .tier-amarillo{ background: #f59e0b; box-shadow: 0 0 12px rgba(245,158,11,0.55); }
    .tier-verde   { background: #10b981; box-shadow: 0 0 10px rgba(16,185,129,0.5); }

    .badge-mono {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 10.5px;
      letter-spacing: 0.04em;
    }

    .gradient-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(103,232,249,0.4) 18%, rgba(103,232,249,0.4) 82%, transparent);
    }
  `],
  template: `
    <!-- ─────────────────────────── NAV ─────────────────────────── -->
    <nav class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
         [class.bg-[#05070d]\\/85]="scrollY() > 24"
         [class.backdrop-blur-md]="scrollY() > 24"
         [class.border-b]="scrollY() > 24"
         [class.border-cyan-500\\/15]="scrollY() > 24">
      <div class="max-w-[1280px] mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
        <a class="flex items-center gap-2.5" routerLink="/">
          <span class="w-9 h-9 rounded-lg grid place-items-center bg-cyan-400/12 border border-cyan-400/40 shadow-[0_0_18px_-4px_rgba(34,211,238,0.55)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
                    stroke="#67e8f9" stroke-width="1.7" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="#67e8f9" stroke-width="1.7"/>
              <circle cx="12" cy="12" r="1.2" fill="#67e8f9"/>
            </svg>
          </span>
          <div class="leading-tight">
            <div class="text-white font-semibold tracking-tight text-[15px]">Centinela</div>
            <div class="text-cyan-300/70 text-[10px] uppercase tracking-[0.18em]">Fraud intelligence</div>
          </div>
        </a>

        <div class="flex items-center gap-2.5">
          <a routerLink="/auth/login" class="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#05070d] bg-cyan-300 px-3.5 py-2 rounded-lg glow-button">
            Iniciar sesión
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </nav>

    <!-- ─────────────────────────── HERO ─────────────────────────── -->
    <section #heroSection class="relative overflow-hidden isolate pt-32 pb-24 lg:pt-44 lg:pb-32">

      <!-- Parallax background layers -->
      <div class="absolute inset-0 cyber-haze pointer-events-none" aria-hidden="true"></div>

      <div class="absolute inset-0 cyber-grid pointer-events-none transition-transform duration-300 will-change-transform"
           [style.transform]="gridTransform()"
           aria-hidden="true"></div>

      <!-- Network nodes (slower parallax than text) -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-90 transition-transform duration-300 will-change-transform"
           [style.transform]="nodesTransform()"
           viewBox="0 0 1400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="lp-node" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#67e8f9" stop-opacity="1"/>
            <stop offset="100%" stop-color="#67e8f9" stop-opacity="0"/>
          </radialGradient>
        </defs>

        @for (node of networkNodes; track node.id) {
          <circle [attr.cx]="node.x" [attr.cy]="node.y" [attr.r]="node.r"
                  fill="url(#lp-node)" class="node-pulse"
                  [style.animation-delay]="node.delay"/>
        }

        @for (line of networkLines; track line.id) {
          <line [attr.x1]="line.x1" [attr.y1]="line.y1" [attr.x2]="line.x2" [attr.y2]="line.y2"
                stroke="rgba(103, 232, 249, 0.18)" stroke-width="1"/>
        }

        <!-- animated data packets along the lines -->
        @for (line of networkLines; track line.id) {
          <line [attr.x1]="line.x1" [attr.y1]="line.y1" [attr.x2]="line.x2" [attr.y2]="line.y2"
                stroke="rgba(103, 232, 249, 0.85)" stroke-width="1.4" class="data-line"
                [style.animation-delay]="line.delay"/>
        }
      </svg>

      <!-- Hero content -->
      <div class="relative max-w-[1180px] mx-auto px-6 lg:px-10 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">

        <div class="will-change-transform transition-transform duration-300" [style.transform]="textTransform()">
          <div class="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-cyan-300/85 border border-cyan-400/35 bg-cyan-400/8 rounded-full px-3 py-1 mb-7">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_2px_rgba(103,232,249,0.7)]"></span>
            Hackiathon 2026 · MVP en vivo
          </div>

          <h1 class="text-[42px] sm:text-[52px] lg:text-[64px] leading-[1.05] font-semibold tracking-tight text-white">
            <span class="block glow-text">Centinela:</span>
            <span class="block bg-gradient-to-r from-cyan-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Inteligencia Antifraude Activa
            </span>
          </h1>

          <p class="mt-6 text-[16.5px] leading-relaxed text-slate-300/85 max-w-[560px]">
            Detección, triaje y dictamen automatizado de siniestros mediante Inteligencia Artificial.
            Diseñado para que los equipos de Aseguradora del Sur encuentren al instante el caso
            que importa, con explicabilidad de cada decisión.
          </p>

          <div class="mt-6 inline-flex items-center gap-2 text-[12.5px] font-medium text-cyan-100 bg-cyan-400/10 border border-cyan-400/35 rounded-full px-3.5 py-1.5">
            <ui-icon name="bolt" [size]="15" />
            Analiza un caso en ~3 s
          </div>

          <div class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[560px]">
            @for (metric of heroBusinessMetrics; track metric.label) {
              <div class="rounded-xl border border-slate-700/50 bg-slate-900/45 px-3.5 py-3">
                <div class="text-[22px] font-semibold text-white tabular-nums leading-tight">{{ metric.value }}</div>
                <div class="text-[11.5px] text-slate-400 mt-1 leading-snug">{{ metric.label }}</div>
              </div>
            }
          </div>

          <div class="mt-5 flex flex-wrap gap-2 max-w-[620px]">
            @for (seal of trustSeals; track seal) {
              <span class="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] text-slate-300 border border-slate-600/60 bg-slate-900/50 rounded-full px-2.5 py-1">
                <span class="w-1 h-1 rounded-full bg-emerald-400"></span>
                {{ seal }}
              </span>
            }
          </div>

          <div class="mt-9 flex flex-wrap gap-3">
            <button type="button" (click)="goToDemo()"
                    class="glow-button inline-flex items-center gap-2 text-[14px] font-medium text-[#05070d] bg-cyan-300 px-5 py-3 rounded-xl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 4v16l14-8L5 4z" fill="#05070d"/>
              </svg>
              Ver demo
            </button>
            <a href="https://github.com/StevSant" target="_blank" rel="noreferrer"
               class="inline-flex items-center gap-2 text-[14px] font-medium text-slate-100 border border-slate-500/40 hover:border-cyan-300/60 hover:text-cyan-200 px-5 py-3 rounded-xl transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"
                      stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Documentación
            </a>
          </div>
        </div>

        <!-- The all-seeing eye -->
        <div class="relative aspect-square max-w-[460px] mx-auto w-full will-change-transform transition-transform duration-300"
             [style.transform]="eyeTransform()">
          <svg viewBox="0 0 400 400" class="w-full h-full" aria-hidden="true">
            <defs>
              <radialGradient id="lp-iris" cx="38%" cy="32%" r="68%">
                <stop offset="0%"  stop-color="#a5f3fc"/>
                <stop offset="22%" stop-color="#22d3ee"/>
                <stop offset="55%" stop-color="#0e7490"/>
                <stop offset="100%" stop-color="#082f49"/>
              </radialGradient>
              <radialGradient id="lp-pupil" cx="36%" cy="30%" r="72%">
                <stop offset="0%"  stop-color="#0f172a"/>
                <stop offset="100%" stop-color="#000000"/>
              </radialGradient>
              <filter id="lp-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            <!-- outer rotating ring with ticks -->
            <g class="ray-scan" stroke="rgba(103, 232, 249, 0.7)" stroke-width="1.6" fill="none">
              <circle cx="200" cy="200" r="184" stroke-dasharray="2 18"/>
            </g>

            <!-- decorative outer geometry -->
            <circle cx="200" cy="200" r="190" fill="none" stroke="rgba(103, 232, 249, 0.18)" stroke-width="1"/>
            <circle cx="200" cy="200" r="160" fill="none" stroke="rgba(103, 232, 249, 0.24)" stroke-width="1" stroke-dasharray="6 6"/>
            <circle cx="200" cy="200" r="130" fill="none" stroke="rgba(103, 232, 249, 0.18)" stroke-width="1"/>

            <!-- hexagonal frame -->
            <polygon points="200,46 320,116 320,284 200,354 80,284 80,116"
                     fill="none" stroke="rgba(103,232,249,0.42)" stroke-width="1.4"/>
            <polygon points="200,76 296,131 296,269 200,324 104,269 104,131"
                     fill="none" stroke="rgba(103,232,249,0.18)" stroke-width="1"/>

            <!-- eye almond -->
            <path d="M70 200 Q200 70 330 200 Q200 330 70 200 Z"
                  fill="rgba(7, 12, 23, 0.85)"
                  stroke="rgba(103, 232, 249, 0.5)"
                  stroke-width="1.6"/>

            <!-- iris (tracks mouse via transform on outer group) -->
            <g [attr.transform]="irisTransform()" style="transition: transform 90ms linear;">
              <circle cx="200" cy="200" r="50" fill="url(#lp-iris)" filter="url(#lp-glow)"/>
              <circle cx="200" cy="200" r="48" fill="none" stroke="rgba(165, 243, 252, 0.45)" stroke-width="1.1" class="iris-pulse"/>
              <circle cx="200" cy="200" r="42" fill="none" stroke="rgba(34, 211, 238, 0.32)" stroke-width="0.8"/>
              <circle cx="200" cy="200" r="34" fill="none" stroke="rgba(34, 211, 238, 0.22)" stroke-width="0.6"/>
              <circle cx="200" cy="200" r="20" fill="url(#lp-pupil)"/>
              <ellipse cx="188" cy="190" rx="8" ry="5" fill="white" opacity="0.62" transform="rotate(-22 188 190)"/>
              <circle cx="211" cy="197" r="2.6" fill="white" opacity="0.4"/>
            </g>

            <!-- crosshair ticks -->
            <g stroke="rgba(103, 232, 249, 0.6)" stroke-width="1.4">
              <line x1="200" y1="20" x2="200" y2="40"/>
              <line x1="200" y1="360" x2="200" y2="380"/>
              <line x1="20" y1="200" x2="40" y2="200"/>
              <line x1="360" y1="200" x2="380" y2="200"/>
            </g>
          </svg>

          <!-- floating labels around the eye -->
          <div class="absolute -top-4 -left-4 badge-mono text-cyan-300/70 bg-cyan-400/8 border border-cyan-400/25 rounded-md px-2 py-1">
            SCAN · 06:21
          </div>
          <div class="absolute -bottom-2 -right-2 badge-mono text-emerald-300/80 bg-emerald-400/8 border border-emerald-400/25 rounded-md px-2 py-1">
            ON-LINE
          </div>
          <div class="absolute top-1/2 -right-6 badge-mono text-slate-400 bg-slate-900/70 border border-slate-700/60 rounded-md px-2 py-1">
            RF01 → RF06
          </div>
        </div>

      </div>

      <!-- floor gradient transition -->
      <div class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#05070d] pointer-events-none"></div>
    </section>

    <!-- ─────────────────────────── WATCHTOWER ─────────────────────────── -->
    <section id="watchtower" class="relative py-24 lg:py-32">
      <div class="max-w-[1180px] mx-auto px-6 lg:px-10">

        <div class="max-w-2xl mb-16 reveal" #reveal>
          <div class="text-cyan-300/80 text-[11px] uppercase tracking-[0.18em] mb-3">La torre de vigilancia</div>
          <h2 class="text-[34px] sm:text-[40px] lg:text-[46px] font-semibold tracking-tight text-white leading-[1.1]">
            Protección activa,
            <span class="bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
              seguridad íntegra.
            </span>
          </h2>
          <p class="mt-5 text-slate-400 text-[15.5px] leading-relaxed">
            Tres capas que trabajan en simultáneo sobre cada siniestro que entra a la aseguradora.
          </p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">

          @for (card of valueCards; track card.title; let i = $index) {
            <div class="glass glass-hover reveal rounded-2xl p-6 group" #reveal
                 [style.transition-delay]="(i * 90) + 'ms'">
              <div class="w-12 h-12 rounded-xl grid place-items-center mb-5 transition-all duration-300 group-hover:scale-110 text-cyan-200"
                   [style.background]="card.iconBg"
                   [style.border]="'1px solid rgba(103, 232, 249, 0.28)'">
                <ui-icon [name]="card.icon" [size]="22" [weight]="500" />
              </div>

              <h3 class="text-white text-[18px] font-semibold tracking-tight mb-2">{{ card.title }}</h3>
              <p class="text-slate-400 text-[13.5px] leading-relaxed mb-5">{{ card.copy }}</p>

              <div class="gradient-divider mb-4"></div>

              <ul class="space-y-2">
                @for (item of card.bullets; track item) {
                  <li class="flex items-start gap-2 text-[12.5px] text-slate-300">
                    <span class="w-1 h-1 rounded-full bg-cyan-300 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(103,232,249,0.7)]"></span>
                    {{ item }}
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ─────────────────────────── PERSPECTIVE SWITCHER ─────────────────────────── -->
    <section id="perspectives" class="relative py-24 lg:py-32">
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>

      <div class="max-w-[1180px] mx-auto px-6 lg:px-10">

        <div class="text-center mb-12 max-w-2xl mx-auto reveal" #reveal>
          <div class="text-cyan-300/80 text-[11px] uppercase tracking-[0.18em] mb-3">Dos perspectivas, una IA</div>
          <h2 class="text-[34px] sm:text-[40px] lg:text-[46px] font-semibold tracking-tight text-white leading-[1.1]">
            Cada rol ve lo que necesita ver.
          </h2>
          <p class="mt-5 text-slate-400 text-[15.5px] leading-relaxed">
            Centinela adapta su superficie según el analista que tiene en frente. Cambia entre
            perspectivas para ver cómo asiste cada flujo.
          </p>
        </div>

        <!-- Perspective tabs -->
        <div class="flex justify-center mb-10">
          <div class="inline-flex p-1 rounded-2xl bg-slate-900/60 border border-slate-700/60 backdrop-blur">
            @for (option of perspectiveOptions; track option.id) {
              <button type="button"
                      class="px-4 sm:px-6 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300"
                      [class.text-slate-400]="perspective() !== option.id"
                      [class.text-white]="perspective() === option.id"
                      [class.bg-cyan-400\\/15]="perspective() === option.id"
                      [class.shadow-[inset_0_0_0_1px_rgba(103,232,249,0.4)]]="perspective() === option.id"
                      (click)="setPerspective(option.id)">
                {{ option.label }}
              </button>
            }
          </div>
        </div>

        <div class="grid lg:grid-cols-[0.92fr_1.08fr] gap-10 items-center">

          <!-- Copy column -->
          <div>
            <div class="text-cyan-300/80 text-[11px] uppercase tracking-[0.18em] mb-3">
              {{ currentPerspective().eyebrow }}
            </div>
            <h3 class="text-[28px] sm:text-[32px] font-semibold text-white tracking-tight leading-tight mb-4">
              {{ currentPerspective().title }}
            </h3>
            <p class="text-slate-400 text-[15px] leading-relaxed mb-7">
              {{ currentPerspective().description }}
            </p>

            <ul class="space-y-3 mb-8">
              @for (item of currentPerspective().focusBullets; track item) {
                <li class="flex items-start gap-3 text-[14px] text-slate-200">
                  <span class="w-5 h-5 rounded-md grid place-items-center bg-cyan-400/10 border border-cyan-400/30 shrink-0 mt-px">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12l5 5L20 7" stroke="#67e8f9" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                  {{ item }}
                </li>
              }
            </ul>

            <button type="button" (click)="goToDemo()"
                    class="inline-flex items-center gap-2 text-[13.5px] font-medium text-cyan-200 hover:text-white transition-colors">
              {{ currentPerspective().ctaLabel }}
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <!-- Mockup dashboard -->
          <div class="preview-deck rounded-3xl p-5 sm:p-7 relative overflow-hidden">

            <!-- preview header -->
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-400/70"></span>
                <span class="w-2.5 h-2.5 rounded-full bg-amber-400/70"></span>
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400/70"></span>
              </div>
              <div class="badge-mono text-cyan-200/80">
                {{ perspective() === 'antifraude' ? 'BANDEJA · ANTIFRAUDE' : 'BANDEJA · ANALISTA' }}
              </div>
            </div>

            <!-- KPI row -->
            <div class="grid grid-cols-3 gap-3 mb-5">
              @for (kpi of currentKpis(); track kpi.label) {
                <div class="rounded-xl bg-slate-900/70 border border-slate-700/40 px-3 py-3">
                  <div class="text-[10.5px] uppercase tracking-wider text-slate-400">{{ kpi.label }}</div>
                  <div class="text-[22px] font-semibold text-white tabular-nums leading-tight mt-1">{{ kpi.value }}</div>
                  <div class="text-[10.5px] text-cyan-300/80 font-mono mt-1">{{ kpi.delta }}</div>
                </div>
              }
            </div>

            <!-- Chart + table -->
            <div class="grid sm:grid-cols-[0.85fr_1fr] gap-4">

              <!-- score distribution chart -->
              <div class="rounded-xl bg-slate-900/55 border border-slate-700/40 p-4">
                <div class="flex items-center justify-between mb-3">
                  <div class="text-[11px] uppercase tracking-wider text-slate-400">Distribución de score</div>
                  <div class="badge-mono text-slate-500">7D</div>
                </div>
                <div class="flex items-end gap-1.5 h-28">
                  @for (bar of currentChart(); track bar.label; let idx = $index) {
                    <div class="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                      <div class="w-full preview-bar rounded-t-sm"
                           [style.height]="bar.height + '%'"
                           [style.background]="bar.color"></div>
                      <div class="badge-mono text-slate-500 truncate w-full text-center">{{ bar.label }}</div>
                    </div>
                  }
                </div>
              </div>

              <!-- claim rows -->
              <div class="rounded-xl bg-slate-900/55 border border-slate-700/40 p-4 flex flex-col">
                <div class="flex items-center justify-between mb-3">
                  <div class="text-[11px] uppercase tracking-wider text-slate-400">
                    {{ perspective() === 'antifraude' ? 'Bandeja escalada' : 'Triaje del día' }}
                  </div>
                  <div class="badge-mono text-cyan-300/80">{{ currentRows().length }} casos</div>
                </div>
                <div class="space-y-2 flex-1">
                  @for (row of currentRows(); track row.id) {
                    <div class="flex items-center gap-2.5 rounded-lg bg-slate-950/40 border border-slate-700/30 px-2.5 py-2 hover:border-cyan-400/40 transition-colors">
                      <span class="tier-dot" [class.tier-rojo]="row.tier === 'rojo'"
                                              [class.tier-amarillo]="row.tier === 'amarillo'"
                                              [class.tier-verde]="row.tier === 'verde'"></span>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <span class="badge-mono text-cyan-200/90">{{ row.id }}</span>
                          <span class="text-[10.5px] text-slate-500 truncate">{{ row.ramo }}</span>
                        </div>
                        <div class="text-[11.5px] text-slate-300 truncate">{{ row.signal }}</div>
                      </div>
                      <div class="text-[14px] font-semibold tabular-nums"
                           [style.color]="row.tier === 'rojo' ? '#fb7185' : row.tier === 'amarillo' ? '#fbbf24' : '#34d399'">
                        {{ row.score }}
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- AI suggestion banner -->
            <div class="mt-5 rounded-xl border border-cyan-400/30 bg-cyan-400/8 px-4 py-3 flex items-center gap-3">
              <span class="w-8 h-8 rounded-lg grid place-items-center bg-cyan-400/15 shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
                        stroke="#67e8f9" stroke-width="1.6" stroke-linejoin="round"/>
                  <circle cx="12" cy="12" r="3" stroke="#67e8f9" stroke-width="1.6"/>
                </svg>
              </span>
              <div class="min-w-0 flex-1">
                <div class="text-[12px] text-cyan-200/85 font-medium mb-0.5">Centinela sugiere</div>
                <div class="text-[12.5px] text-slate-200 truncate">{{ currentSuggestion() }}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ─────────────────────────── HOW IT WORKS ─────────────────────────── -->
    <section id="flow" class="relative py-24 lg:py-32">
      <div class="max-w-[980px] mx-auto px-6 lg:px-10">

        <div class="text-center mb-16 reveal" #reveal>
          <div class="text-cyan-300/80 text-[11px] uppercase tracking-[0.18em] mb-3">Pipeline</div>
          <h2 class="text-[34px] sm:text-[40px] lg:text-[46px] font-semibold tracking-tight text-white leading-[1.1]">
            Del archivo crudo al veredicto.
          </h2>
          <p class="mt-5 text-slate-400 text-[15.5px] leading-relaxed max-w-[640px] mx-auto">
            Cada siniestro recorre el mismo flujo determinista. Sin cajas negras, sin sorpresas.
          </p>
        </div>

        <div class="relative">
          <div class="absolute left-[27px] sm:left-[31px] top-2 bottom-2 w-px timeline-line" aria-hidden="true"></div>

          @for (step of flowSteps; track step.title; let i = $index) {
            <div class="reveal step-card flex items-start gap-5 sm:gap-6 mb-8 last:mb-0" #reveal
                 [style.transition-delay]="(i * 110) + 'ms'">

              <div class="relative shrink-0">
                <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl grid place-items-center bg-gradient-to-br from-cyan-400/15 to-cyan-400/5 border border-cyan-400/40 shadow-[0_0_28px_-8px_rgba(34,211,238,0.55)] text-cyan-200">
                  <ui-icon [name]="step.icon" [size]="26" [weight]="500" />
                </div>
                <div class="badge-mono absolute -top-1 -right-1 w-6 h-6 rounded-full grid place-items-center bg-[#05070d] border border-cyan-400/40 text-cyan-200">
                  0{{ i + 1 }}
                </div>
              </div>

              <div class="flex-1 glass rounded-2xl p-5 sm:p-6">
                <div class="flex items-baseline gap-3 flex-wrap mb-2">
                  <h3 class="text-white text-[18px] sm:text-[20px] font-semibold tracking-tight">{{ step.title }}</h3>
                  <span class="badge-mono text-cyan-300/70">{{ step.tag }}</span>
                </div>
                <p class="text-slate-400 text-[13.5px] leading-relaxed">{{ step.description }}</p>

                @if (step.tools.length) {
                  <div class="mt-4 flex flex-wrap gap-1.5">
                    @for (tool of step.tools; track tool) {
                      <span class="badge-mono px-2 py-1 rounded-md bg-slate-900/80 border border-slate-700/60 text-slate-300">
                        {{ tool }}
                      </span>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- CTA strip -->
        <div class="mt-20 rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/8 via-transparent to-blue-500/10 p-8 sm:p-10 text-center reveal" #reveal>
          <h3 class="text-[24px] sm:text-[28px] font-semibold text-white tracking-tight mb-3">
            ¿Listo para abrir la torre?
          </h3>
          <p class="text-slate-400 text-[14.5px] mb-7 max-w-[560px] mx-auto">
            Inicia sesión con cualquiera de las perspectivas demo y empieza a recorrer la bandeja.
          </p>
          <div class="flex flex-wrap justify-center gap-3">
            <button type="button" (click)="goToDemo()"
                    class="glow-button inline-flex items-center gap-2 text-[14px] font-medium text-[#05070d] bg-cyan-300 px-5 py-3 rounded-xl">
              Entrar a la demo
              <span aria-hidden="true">→</span>
            </button>
            <a routerLink="/auth/login"
               class="inline-flex items-center gap-2 text-[14px] font-medium text-slate-100 border border-slate-500/40 hover:border-cyan-300/60 hover:text-cyan-200 px-5 py-3 rounded-xl transition-all">
              Iniciar sesión
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ─────────────────────────── FOOTER ─────────────────────────── -->
    <footer class="relative border-t border-cyan-400/15">
      <div class="max-w-[1180px] mx-auto px-6 lg:px-10 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">

        <div class="flex items-center gap-3">
          <span class="w-9 h-9 rounded-lg grid place-items-center bg-cyan-400/12 border border-cyan-400/40">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
                    stroke="#67e8f9" stroke-width="1.6" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="#67e8f9" stroke-width="1.6"/>
            </svg>
          </span>
          <div>
            <div class="text-white text-[14px] font-semibold tracking-tight">Centinela</div>
            <div class="text-slate-500 text-[11.5px]">Fraud Intelligence · Aseguradora del Sur</div>
          </div>
        </div>

        <div class="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] text-cyan-300/85 border border-cyan-400/30 bg-cyan-400/5 rounded-full px-3 py-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(103,232,249,0.7)]"></span>
          Hackiathon 2026 · MVP · Datos sintéticos — sin PII real
        </div>

        <div class="text-slate-500 text-[12px] flex items-center gap-4">
          <a routerLink="/auth/login" class="hover:text-cyan-300 transition-colors">Iniciar sesión</a>
          <span class="text-slate-700">·</span>
          <a href="https://github.com/StevSant" target="_blank" rel="noreferrer" class="hover:text-cyan-300 transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  `,
})
export class LandingPage implements AfterViewInit, OnDestroy {
  private readonly doc = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);

  @ViewChild('heroSection') private readonly heroSection!: ElementRef<HTMLElement>;

  // ── State ─────────────────────────────────────────────────────────
  protected readonly scrollY = signal(0);
  protected readonly mouseX = signal(0);
  protected readonly mouseY = signal(0);
  protected readonly perspective = signal<Perspective>('analista');

  protected readonly isAuthenticated = computed(() => this.auth.user() !== null);

  // ── Parallax transforms ───────────────────────────────────────────
  protected readonly gridTransform = computed(
    () => `translate3d(${this.mouseX() * -10}px, ${this.scrollY() * 0.08}px, 0)`,
  );

  protected readonly nodesTransform = computed(
    () => `translate3d(${this.mouseX() * -18}px, ${this.scrollY() * 0.12}px, 0)`,
  );

  protected readonly textTransform = computed(
    () => `translate3d(${this.mouseX() * 6}px, ${this.scrollY() * -0.05}px, 0)`,
  );

  protected readonly eyeTransform = computed(
    () => `translate3d(${this.mouseX() * 18}px, ${this.mouseY() * 18 + this.scrollY() * -0.08}px, 0)`,
  );

  protected readonly irisTransform = computed(() => {
    // Mouse position is normalised to roughly [-0.5, 0.5]. Scale to a range that
    // keeps the iris inside the eye almond (radius 50, almond narrows above ~y=135).
    const mx = (this.mouseX() * 22).toFixed(1);
    const my = (this.mouseY() * 14).toFixed(1);
    return `translate(${mx}, ${my})`;
  });

  // ── Perspective copy ──────────────────────────────────────────────
  private readonly perspectives: Readonly<Record<Perspective, PerspectiveCopy>> = {
    analista: {
      eyebrow: 'Perspectiva · Analista de siniestros',
      title: 'Triaje masivo, sin ahogarse en papel.',
      description:
        'Recibes la bandeja del día priorizada por riesgo, con el contexto de cada caso ya enriquecido por el modelo. Decide en segundos: continuar el pago, pedir documentación o escalar a la Unidad Antifraude.',
      focusBullets: [
        'Score 0-100 + nivel rojo/amarillo/verde por siniestro.',
        'Reglas duras (RF01-RF06) explicadas en lenguaje natural.',
        'Acción de escalación con nota — Antifraude la recibe al instante.',
      ],
      ctaLabel: 'Ver demo del analista',
    },
    antifraude: {
      eyebrow: 'Perspectiva · Analista antifraude',
      title: 'Dictamen profundo sobre los casos que importan.',
      description:
        'Tu bandeja vive de las escalaciones que el equipo del primer nivel marca como sospechosas. Centinela cruza historial del asegurado, narrativa, fotografía y red de proveedores antes de que abras el expediente.',
      focusBullets: [
        'Vista por red — proveedores y asegurados que reaparecen.',
        'Análisis de patrones, narrativas similares y outliers.',
        'Dictamen estructurado con auditoría de cada cambio.',
      ],
      ctaLabel: 'Ver demo del especialista',
    },
  };

  protected readonly currentPerspective = computed(() => this.perspectives[this.perspective()]);

  protected readonly perspectiveOptions: ReadonlyArray<{ id: Perspective; label: string }> = [
    { id: 'analista', label: 'Analista de siniestros' },
    { id: 'antifraude', label: 'Analista antifraude' },
  ];

  // ── Mockup data ───────────────────────────────────────────────────
  protected readonly currentKpis = computed(() => {
    if (this.perspective() === 'antifraude') {
      return [
        { label: 'Siniestros triados', value: '2.4k', delta: 'Bandeja activa' },
        { label: 'USD expuestos detectados', value: '$1.2M', delta: 'Casos escalados' },
        { label: '% revisión evitada', value: '38%', delta: 'Flujo verde' },
      ];
    }
    return [
      { label: 'Siniestros triados', value: '128', delta: 'Hoy en bandeja' },
      { label: '% revisión evitada', value: '62%', delta: 'Casos verde' },
      { label: 'USD expuestos detectados', value: '$840k', delta: 'Alertas rojo/amarillo' },
    ];
  });

  protected readonly currentChart = computed(() => {
    if (this.perspective() === 'antifraude') {
      return [
        { label: 'Lun', height: 38, color: 'rgba(103, 232, 249, 0.55)' },
        { label: 'Mar', height: 62, color: 'rgba(103, 232, 249, 0.65)' },
        { label: 'Mié', height: 48, color: 'rgba(103, 232, 249, 0.55)' },
        { label: 'Jue', height: 84, color: 'rgba(251, 113, 133, 0.85)' },
        { label: 'Vie', height: 72, color: 'rgba(251, 113, 133, 0.75)' },
        { label: 'Sáb', height: 35, color: 'rgba(103, 232, 249, 0.45)' },
        { label: 'Dom', height: 24, color: 'rgba(103, 232, 249, 0.4)' },
      ];
    }
    return [
      { label: 'Lun', height: 55, color: 'rgba(103, 232, 249, 0.6)' },
      { label: 'Mar', height: 68, color: 'rgba(103, 232, 249, 0.7)' },
      { label: 'Mié', height: 80, color: 'rgba(251, 191, 36, 0.85)' },
      { label: 'Jue', height: 64, color: 'rgba(103, 232, 249, 0.7)' },
      { label: 'Vie', height: 92, color: 'rgba(251, 113, 133, 0.85)' },
      { label: 'Sáb', height: 48, color: 'rgba(103, 232, 249, 0.55)' },
      { label: 'Dom', height: 38, color: 'rgba(103, 232, 249, 0.45)' },
    ];
  });

  protected readonly currentRows = computed<readonly MockClaimRow[]>(() => {
    if (this.perspective() === 'antifraude') {
      return [
        { id: 'SIN-08412', asegurado: 'María F. Salazar', ramo: 'Vehículos', score: 91, tier: 'rojo', signal: 'Pérdida total + denuncia tardía (RF01·RF06)' },
        { id: 'SIN-07731', asegurado: 'Jorge A. Pérez', ramo: 'Vida', score: 84, tier: 'rojo', signal: 'Narrativa clonada · cluster proveedor PV-188' },
        { id: 'SIN-07415', asegurado: 'Lucía Mejía', ramo: 'Salud', score: 79, tier: 'amarillo', signal: 'Reportes consecutivos · misma sucursal' },
      ];
    }
    return [
      { id: 'SIN-08440', asegurado: 'Andrés Vega', ramo: 'Vehículos', score: 88, tier: 'rojo', signal: 'Pérdida total + RF01 activa' },
      { id: 'SIN-08438', asegurado: 'Patricia Soto', ramo: 'Salud', score: 64, tier: 'amarillo', signal: 'Documentación incompleta (RF03)' },
      { id: 'SIN-08436', asegurado: 'Carlos Mora', ramo: 'Vida', score: 28, tier: 'verde', signal: 'Sin señales · flujo normal' },
    ];
  });

  protected readonly currentSuggestion = computed(() =>
    this.perspective() === 'antifraude'
      ? 'Cluster de 3 siniestros con misma narrativa que SIN-08412 — abrir vista de red.'
      : 'Escalar SIN-08440: 2 reglas duras activas y monto > suma asegurada esperada.',
  );

  // ── Static content ────────────────────────────────────────────────
  protected readonly valueCards = [
    {
      title: 'Detección activa 24/7',
      copy: 'Cada siniestro nuevo pasa por reglas duras y modelo ML en segundos. Sin colas, sin esperar al día siguiente.',
      bullets: ['Reglas RF01-RF06 deterministas', 'Score LightGBM + Isolation Forest', 'SSE en tiempo real al frontend'],
      iconBg: 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(34,211,238,0.04))',
      icon: 'radar',
    },
    {
      title: 'Explicabilidad total',
      copy: 'Centinela no es una caja negra. Cada veredicto trae las señales activadas, los factores ML y casos similares.',
      bullets: ['Top factores SHAP por caso', 'Narrativas similares con embeddings', 'Línea de revisión humana auditable'],
      iconBg: 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(168,85,247,0.04))',
      icon: 'psychology',
    },
    {
      title: 'Acción coordinada',
      copy: 'El analista de primer nivel y el especialista antifraude trabajan sobre la misma fuente, con bandeja y dictamen sincronizados.',
      bullets: ['Escalación con nota y traza', 'Dictamen estructurado y exportable', 'Auditoría de cambios por usuario'],
      iconBg: 'linear-gradient(135deg, rgba(96,165,250,0.18), rgba(96,165,250,0.04))',
      icon: 'hub',
    },
  ] as const;

  protected readonly flowSteps = [
    {
      title: 'Ingesta de siniestros',
      tag: 'Step 01',
      description:
        'CSV, XLSX, PDF y DOCX entran por la misma puerta. El stream SSE va emitiendo cada caso parseado mientras el archivo sigue cargándose.',
      icon: 'cloud_upload',
      tools: ['CSV', 'XLSX', 'PDF', 'DOCX', 'SSE'],
    },
    {
      title: 'Análisis neuronal',
      tag: 'Step 02',
      description:
        'Reglas duras corren primero. Después entran LightGBM, Isolation Forest y similitud de narrativas con pgvector. La IA explica cada decisión.',
      icon: 'memory',
      tools: ['LightGBM', 'Isolation Forest', 'pgvector', 'LangGraph ReAct'],
    },
    {
      title: 'Veredicto de alerta',
      tag: 'Step 03',
      description:
        'El analista ve la bandeja priorizada; el especialista recibe la cola escalada. Centinela acompaña cada paso con explicaciones y casos similares.',
      icon: 'verified',
      tools: ['Score 0-100', 'Tier rojo/amarillo/verde', 'Auditoría de revisiones'],
    },
  ] as const;

  protected readonly heroBusinessMetrics = [
    { value: '2.4k+', label: 'Siniestros triados' },
    { value: '38%', label: 'Revisión evitada en flujo verde' },
    { value: '$1.2M', label: 'USD expuestos detectados' },
  ] as const;

  protected readonly trustSeals = [
    'Datos sintéticos',
    'Humano en el loop',
    'Explicabilidad por regla',
    'Reto Aseguradora del Sur',
  ] as const;

  protected readonly networkNodes = Array.from({ length: 26 }, (_, i) => ({
    id: i,
    x: 60 + ((i * 53) % 1280),
    y: 80 + ((i * 71) % 640),
    r: 1.5 + (i % 3),
    delay: `${(i * 130) % 2800}ms`,
  }));

  protected readonly networkLines = [
    { id: 0, x1: 120, y1: 140, x2: 360, y2: 240, delay: '0ms' },
    { id: 1, x1: 360, y1: 240, x2: 540, y2: 120, delay: '500ms' },
    { id: 2, x1: 540, y1: 120, x2: 780, y2: 280, delay: '1000ms' },
    { id: 3, x1: 780, y1: 280, x2: 1020, y2: 180, delay: '1500ms' },
    { id: 4, x1: 1020, y1: 180, x2: 1240, y2: 360, delay: '2000ms' },
    { id: 5, x1: 220, y1: 460, x2: 480, y2: 540, delay: '700ms' },
    { id: 6, x1: 480, y1: 540, x2: 720, y2: 440, delay: '1200ms' },
    { id: 7, x1: 720, y1: 440, x2: 980, y2: 580, delay: '1800ms' },
    { id: 8, x1: 980, y1: 580, x2: 1180, y2: 480, delay: '2400ms' },
  ];

  // ── Listeners (run outside Angular) ───────────────────────────────
  private rafId = 0;
  private pendingX = 0;
  private pendingY = 0;
  private observer: IntersectionObserver | null = null;
  private cleanupFns: Array<() => void> = [];

  ngAfterViewInit(): void {
    // If the user is already authenticated, send them straight to their bandeja
    // — the landing is meant for visitors that have not signed in yet.
    if (this.auth.user()) {
      void this.router.navigateByUrl(this.roleLandingPath());
      return;
    }

    this.zone.runOutsideAngular(() => {
      const onMouse = (event: MouseEvent): void => {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        this.pendingX = event.clientX / w - 0.5;
        this.pendingY = event.clientY / h - 0.5;

        cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(() => {
          this.mouseX.set(this.pendingX);
          this.mouseY.set(this.pendingY);
        });
      };

      const onScroll = (): void => {
        this.scrollY.set(window.scrollY || 0);
      };

      this.doc.addEventListener('mousemove', onMouse, { passive: true });
      this.doc.addEventListener('scroll', onScroll, { passive: true });
      this.cleanupFns.push(() => this.doc.removeEventListener('mousemove', onMouse));
      this.cleanupFns.push(() => this.doc.removeEventListener('scroll', onScroll));
    });

    // Reveal on scroll
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -80px 0px', threshold: 0.12 },
    );
    this.doc.querySelectorAll('.reveal').forEach((el) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.cleanupFns.forEach((fn) => fn());
    this.observer?.disconnect();
  }

  // ── Actions ───────────────────────────────────────────────────────
  protected setPerspective(p: Perspective): void {
    this.perspective.set(p);
  }

  protected goToDemo(): void {
    if (this.isAuthenticated()) {
      void this.router.navigateByUrl(this.roleLandingPath());
    } else {
      void this.router.navigateByUrl('/auth/login');
    }
  }

  private roleLandingPath(): string {
    return this.auth.user()?.roleCode === 'antifraude' ? '/antifraude/bandeja' : '/claims';
  }

  @HostListener('window:keydown.escape')
  protected resetPerspective(): void {
    this.perspective.set('analista');
  }
}

