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

interface MultiAgentPersona {
  id: string;
  name: string;
  role: string;
  personality: string;
  duty: string;
  accent: string;
  irisInner: string;
  gazeClass: string;
  browAnimClass: string;
  blinkDelay: string;
  highlightX: number;
  highlightY: number;
  irisRadius: number;
  browLeft: string;
  browRight: string;
  browCrease?: string;
  lidPath?: string;
  slotClass: string;
  breatheDelay: string;
  nodeDelay: string;
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
    .flow-steps {
      position: relative;
    }

    .flow-spine {
      position: absolute;
      left: 1.75rem;
      top: 0;
      bottom: 0;
      width: 2px;
      transform: translateX(-50%);
      background: linear-gradient(
        180deg,
        transparent 0%,
        rgba(34, 211, 238, 0.45) 6%,
        rgba(34, 211, 238, 0.55) 50%,
        rgba(34, 211, 238, 0.45) 94%,
        transparent 100%
      );
      z-index: 0;
      pointer-events: none;
    }

    @media (min-width: 640px) {
      .flow-spine {
        left: 2rem;
      }
    }

    .flow-node {
      position: relative;
      z-index: 2;
      background: #05070d;
      box-shadow: 0 0 28px -8px rgba(34, 211, 238, 0.55);
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

    .perspective-copy-panel {
      background: linear-gradient(160deg, rgba(15, 23, 42, 0.72) 0%, rgba(5, 7, 13, 0.92) 100%);
      border: 1px solid rgba(148, 163, 184, 0.14);
    }

    .perspective-feature {
      background: rgba(15, 23, 42, 0.55);
      border: 1px solid rgba(148, 163, 184, 0.12);
      transition: border-color 220ms ease, background 220ms ease;
    }

    .perspective-feature:hover {
      border-color: rgba(103, 232, 249, 0.35);
      background: rgba(15, 23, 42, 0.72);
    }

    .perspective-tab--active {
      background: rgba(34, 211, 238, 0.14);
      box-shadow: inset 0 0 0 1px rgba(103, 232, 249, 0.42);
    }

    @keyframes perspectiveFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .perspective-swap {
      animation: perspectiveFadeIn 0.38s ease;
    }

    .hero-metric {
      background: rgba(15, 23, 42, 0.45);
      border: 1px solid rgba(148, 163, 184, 0.14);
    }

    .hero-value-icon {
      color: #67e8f9;
    }

    @media (max-width: 639px) {
      .hero-eye-wrap {
        max-width: 220px;
        margin-inline: auto;
      }

      .hero-eye-label {
        display: none;
      }
    }

    /* ── Multi-agent constellation ─────────────────────────────────── */
    .multiagent-glow {
      background:
        radial-gradient(ellipse 55% 45% at 50% 42%, rgba(34, 211, 238, 0.1) 0%, transparent 72%),
        radial-gradient(ellipse 35% 30% at 18% 78%, rgba(251, 191, 36, 0.08) 0%, transparent 70%),
        radial-gradient(ellipse 35% 30% at 82% 78%, rgba(251, 113, 133, 0.08) 0%, transparent 70%);
    }

    .multiagent-orbit {
      position: relative;
      width: min(100%, 720px);
      height: clamp(430px, 58vw, 520px);
      margin-inline: auto;
    }

    .multiagent-links {
      pointer-events: none;
      z-index: 0;
    }

    .agent-link {
      stroke: rgba(103, 232, 249, 0.28);
      stroke-width: 1.3;
      stroke-dasharray: 5 7;
      animation: agentLinkFlow 2.8s linear infinite;
    }

    .agent-link--warm { stroke: rgba(251, 191, 36, 0.35); animation-delay: -0.9s; }
    .agent-link--rose { stroke: rgba(251, 113, 133, 0.35); animation-delay: -1.8s; }

    @keyframes agentLinkFlow {
      0% { stroke-dashoffset: 24; opacity: 0.35; }
      50% { opacity: 0.85; }
      100% { stroke-dashoffset: 0; opacity: 0.35; }
    }

    .agent-packet {
      filter: drop-shadow(0 0 4px currentColor);
    }

    .multiagent-hub-pulse {
      animation: hubPulse 2.6s ease-in-out infinite;
    }

    @keyframes hubPulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.18), 0 0 24px -6px rgba(34, 211, 238, 0.35);
        border-color: rgba(34, 211, 238, 0.25);
      }
      50% {
        box-shadow: 0 0 0 6px rgba(34, 211, 238, 0.06), 0 0 32px -2px rgba(34, 211, 238, 0.55);
        border-color: rgba(34, 211, 238, 0.45);
      }
    }

    .multiagent-node {
      position: absolute;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;
      width: min(12.5rem, 31vw);
      animation: agentNodeIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) backwards;
    }

    @keyframes agentNodeIn {
      from { opacity: 0; transform: translateY(18px) scale(0.94); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .multiagent-node--top {
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      animation-name: agentNodeInTop;
    }

    @keyframes agentNodeInTop {
      from { opacity: 0; transform: translateX(-50%) translateY(-14px) scale(0.94); }
      to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    }

    .multiagent-node--left { bottom: 0; left: 0; }
    .multiagent-node--right { bottom: 0; right: 0; }

    .multiagent-eye-shell {
      position: relative;
      width: clamp(76px, 17vw, 112px);
      height: clamp(76px, 17vw, 112px);
      animation: agentFloat 5.5s ease-in-out infinite;
    }

    .multiagent-eye-shell::before {
      content: '';
      position: absolute;
      inset: -14%;
      border-radius: 50%;
      background: radial-gradient(circle, var(--agent-accent) 0%, transparent 68%);
      opacity: 0.2;
      animation: eyeHalo 3.4s ease-in-out infinite;
      z-index: 0;
      pointer-events: none;
    }

    .multiagent-eye-shell svg {
      position: relative;
      z-index: 1;
    }

    @keyframes agentFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    @keyframes eyeHalo {
      0%, 100% { opacity: 0.14; transform: scale(0.96); }
      50% { opacity: 0.32; transform: scale(1.06); }
    }

    .ma-orbit-ring {
      transform-origin: 50px 50px;
      transform-box: fill-box;
      animation: ringSpin 18s linear infinite;
    }

    @keyframes ringSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .ma-scan-arc {
      transform-origin: 50px 50px;
      transform-box: fill-box;
      animation: scanArc 5s linear infinite;
      opacity: 0.55;
    }

    @keyframes scanArc {
      from { transform: rotate(0deg); opacity: 0.2; }
      15% { opacity: 0.65; }
      to { transform: rotate(360deg); opacity: 0.2; }
    }

    .ma-brows { transform-origin: 50px 20px; transform-box: fill-box; }
    .ma-brows--calm { animation: browCalm 4.8s ease-in-out infinite; }
    .ma-brows--vigia { animation: browVigia 2.6s ease-in-out infinite; }
    .ma-brows--rastreador { animation: browRastreador 3.2s ease-in-out infinite; }

    @keyframes browCalm {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-0.6px); }
    }

    @keyframes browVigia {
      0%, 100% { transform: translateY(0); }
      35% { transform: translateY(1.4px); }
      55% { transform: translateY(0.6px); }
    }

    @keyframes browRastreador {
      0%, 100% { transform: translateY(0); }
      40% { transform: translateY(-1.8px); }
      65% { transform: translateY(-0.5px); }
    }

    .ma-gaze {
      transform-origin: 50px 50px;
      transform-box: fill-box;
    }

    .ma-gaze--centinela { animation: gazeCentinela 6s ease-in-out infinite; }
    .ma-gaze--vigia { animation: gazeVigia 4.5s ease-in-out infinite; }
    .ma-gaze--rastreador { animation: gazeRastreador 4.8s ease-in-out infinite; }

    @keyframes gazeCentinela {
      0%, 100% { transform: translate(0, 4.5px); }
      30% { transform: translate(2px, 5.5px); }
      60% { transform: translate(-2px, 5.5px); }
    }

    @keyframes gazeVigia {
      0%, 100% { transform: translate(4.5px, -3.8px); }
      25% { transform: translate(5.8px, -4.6px); }
      55% { transform: translate(3.2px, -3px); }
      80% { transform: translate(5px, -4.2px); }
    }

    @keyframes gazeRastreador {
      0%, 100% { transform: translate(-4.5px, -3.8px); }
      28% { transform: translate(-5.8px, -4.5px); }
      52% { transform: translate(-3px, -3px); }
      78% { transform: translate(-5.2px, -4.2px); }
    }

    .ma-blink-lid {
      transform-origin: 50px 32px;
      transform-box: fill-box;
      transform: scaleY(0);
      animation: agentBlink 7s ease-in-out infinite;
    }

    @keyframes agentBlink {
      0%, 93%, 100% { transform: scaleY(0); }
      94.5% { transform: scaleY(0.08); }
      96% { transform: scaleY(1); }
      97.5% { transform: scaleY(0.05); }
    }

    .ma-lid-squint {
      animation: squintPulse 3.8s ease-in-out infinite;
      transform-origin: 50px 38px;
      transform-box: fill-box;
    }

    @keyframes squintPulse {
      0%, 100% { transform: scaleY(1); opacity: 0.94; }
      50% { transform: scaleY(1.06); opacity: 1; }
    }

    .multiagent-card {
      text-align: center;
      padding: 0.75rem 0.85rem;
      border-radius: 0.85rem;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.82) 0%, rgba(8, 11, 20, 0.92) 100%);
      border: 1px solid rgba(148, 163, 184, 0.14);
      backdrop-filter: blur(10px);
      transition: border-color 280ms ease, box-shadow 280ms ease, transform 280ms ease;
    }

    .multiagent-node:hover .multiagent-card {
      border-color: rgba(103, 232, 249, 0.28);
      box-shadow: 0 8px 28px -12px rgba(34, 211, 238, 0.35);
      transform: translateY(-2px);
    }

    @media (prefers-reduced-motion: reduce) {
      .agent-link,
      .agent-packet,
      .multiagent-hub-pulse,
      .multiagent-node,
      .multiagent-eye-shell,
      .multiagent-eye-shell::before,
      .ma-orbit-ring,
      .ma-scan-arc,
      .ma-brows,
      .ma-gaze,
      .ma-blink-lid,
      .ma-lid-squint,
      .multiagent-iris-pulse {
        animation: none !important;
      }
    }

    .multiagent-brow {
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .multiagent-iris-pulse {
      animation: multiagentIrisPulse 3.4s ease-in-out infinite;
      transform-origin: center;
      transform-box: fill-box;
    }

    @keyframes multiagentIrisPulse {
      0%, 100% { opacity: 0.86; filter: brightness(1); }
      50% { opacity: 1; filter: brightness(1.12); }
    }

    .multiagent-hub {
      position: absolute;
      left: 50%;
      top: 54%;
      transform: translate(-50%, -50%);
      z-index: 1;
      pointer-events: none;
    }

    @media (max-width: 639px) {
      .multiagent-orbit {
        height: auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .multiagent-links,
      .multiagent-hub {
        display: none;
      }

      .multiagent-node {
        position: static;
        transform: none;
        width: 100%;
        max-width: 24rem;
        flex-direction: row;
        align-items: flex-start;
        gap: 0.85rem;
        animation: agentNodeIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) backwards;
      }

      .multiagent-node--top,
      .multiagent-node--left,
      .multiagent-node--right {
        transform: none;
        animation-name: agentNodeIn;
      }

      .multiagent-eye-shell {
        width: 72px;
        height: 72px;
        flex-shrink: 0;
      }

      .multiagent-card {
        flex: 1;
        text-align: left;
        padding: 0.85rem 1rem;
      }
    }
  `],
  template: `
    <!-- ─────────────────────────── NAV ─────────────────────────── -->
    <nav class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
         [class.bg-[#05070d]\\/85]="scrollY() > 24"
         [class.backdrop-blur-md]="scrollY() > 24"
         [class.border-b]="scrollY() > 24"
         [class.border-cyan-500\\/15]="scrollY() > 24">
      <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-3.5 sm:py-4 flex items-center justify-between">
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
            <div class="text-cyan-300/70 text-[10px] uppercase tracking-[0.18em]">Alertas inteligentes</div>
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
    <section #heroSection class="relative overflow-hidden isolate pt-24 pb-14 sm:pt-28 sm:pb-20 lg:pt-40 lg:pb-28">

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
      <div class="relative max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:grid-rows-[auto_auto] gap-6 sm:gap-8 lg:gap-x-14 xl:gap-x-16 lg:gap-y-8 items-center">

        <div class="order-1 lg:col-start-1 lg:row-start-1 will-change-transform transition-transform duration-300 text-center lg:text-left"
             [style.transform]="textTransform()">
          <div class="inline-flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-cyan-300/85 border border-cyan-400/35 bg-cyan-400/8 rounded-full px-3 py-1 mb-5 sm:mb-6">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_2px_rgba(103,232,249,0.7)]"></span>
            Hackiathon 2026 · MVP en vivo
          </div>

          <h1 class="text-[34px] sm:text-[46px] lg:text-[58px] xl:text-[64px] leading-[1.06] font-semibold tracking-tight text-white">
            <span class="block glow-text">Centinela</span>
            <span class="block bg-gradient-to-r from-cyan-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Inteligencia antifraude activa
            </span>
          </h1>

          <p class="mt-4 sm:mt-5 text-[15px] sm:text-[16px] leading-relaxed text-slate-300/85 max-w-[480px] mx-auto lg:mx-0">
            Prioriza reclamos y explica cada alerta. La IA señala; el analista decide.
          </p>
        </div>

        <!-- The all-seeing eye -->
        <div class="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 hero-eye-wrap relative aspect-square max-w-[220px] sm:max-w-[300px] lg:max-w-[420px] xl:max-w-[460px] mx-auto w-full will-change-transform transition-transform duration-300 lg:justify-self-end"
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
          <div class="hero-eye-label absolute -top-4 -left-4 badge-mono text-cyan-300/70 bg-cyan-400/8 border border-cyan-400/25 rounded-md px-2 py-1">
            SCAN · 06:21
          </div>
          <div class="hero-eye-label absolute -bottom-2 -right-2 badge-mono text-emerald-300/80 bg-emerald-400/8 border border-emerald-400/25 rounded-md px-2 py-1">
            ON-LINE
          </div>
          <div class="hero-eye-label absolute top-1/2 -right-6 badge-mono text-slate-400 bg-slate-900/70 border border-slate-700/60 rounded-md px-2 py-1">
            Monitoreo continuo
          </div>
        </div>

        <div class="order-3 lg:col-start-1 lg:row-start-2 w-full text-center lg:text-left">
          <div class="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3 justify-center lg:justify-start">
            <button type="button" (click)="goToDemo()"
                    class="glow-button inline-flex items-center justify-center gap-2 text-[14px] font-medium text-[#05070d] bg-cyan-300 px-5 py-3 rounded-xl w-full sm:w-auto">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 4v16l14-8L5 4z" fill="#05070d"/>
              </svg>
              Ver demo
            </button>
            <a href="https://github.com/StevSant" target="_blank" rel="noreferrer"
               class="inline-flex items-center justify-center gap-2 text-[14px] font-medium text-slate-100 border border-slate-500/40 hover:border-cyan-300/60 hover:text-cyan-200 px-5 py-3 rounded-xl transition-all w-full sm:w-auto">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"
                      stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Documentación
            </a>
          </div>

          <div class="mt-5 sm:mt-6 flex flex-col gap-2 sm:gap-2.5 max-w-[540px] mx-auto lg:mx-0">
            @for (point of heroValuePoints; track point.title) {
              <div class="hero-metric rounded-xl px-3 py-2.5 sm:py-3 flex items-start gap-3 text-left">
                <span class="w-8 h-8 rounded-lg grid place-items-center bg-cyan-400/10 border border-cyan-400/25 shrink-0">
                  <ui-icon [name]="point.icon" [size]="17" class="hero-value-icon" />
                </span>
                <div class="min-w-0">
                  <div class="text-[13px] sm:text-[13.5px] font-medium text-white leading-snug">{{ point.title }}</div>
                  <div class="text-[11.5px] text-slate-400 mt-0.5 leading-snug">{{ point.detail }}</div>
                </div>
              </div>
            }
          </div>

          <div class="mt-4 flex flex-wrap gap-1.5 sm:gap-2 justify-center lg:justify-start max-w-[540px] mx-auto lg:mx-0">
            @for (seal of trustSeals; track seal) {
              <span class="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-slate-400 border border-slate-700/60 bg-slate-900/40 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1">
                <span class="w-1 h-1 rounded-full bg-emerald-400 shrink-0"></span>
                {{ seal }}
              </span>
            }
          </div>
        </div>

      </div>

      <!-- floor gradient transition -->
      <div class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#05070d] pointer-events-none"></div>
    </section>

    <!-- ─────────────────────────── MULTI-AGENT ─────────────────────────── -->
    <section id="multiagent" class="relative py-16 sm:py-20 lg:py-28 overflow-hidden">
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
      <div class="absolute inset-0 multiagent-glow pointer-events-none" aria-hidden="true"></div>

      <div class="relative max-w-[1040px] mx-auto px-4 sm:px-6 lg:px-10">
        <div class="text-center mb-10 sm:mb-14 max-w-2xl mx-auto reveal" #reveal>
          <div class="text-cyan-300/80 text-[11px] uppercase tracking-[0.18em] mb-3">Arquitectura multiagente</div>
          <h2 class="text-[30px] sm:text-[38px] lg:text-[44px] font-semibold tracking-tight text-white leading-[1.12]">
            Tres ojos, un mismo caso.
          </h2>
          <p class="mt-4 text-slate-400 text-[15px] sm:text-[15.5px] leading-relaxed">
            Cada agente tiene su personalidad y especialidad. Se consultan entre sí
            antes de entregar una respuesta clara al analista.
          </p>
        </div>

        <div class="multiagent-orbit reveal" #reveal>
          <svg class="multiagent-links absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <line x1="200" y1="62" x2="92" y2="238" class="agent-link" />
            <line x1="200" y1="62" x2="308" y2="238" class="agent-link agent-link--warm" />
            <line x1="92" y1="238" x2="308" y2="238" class="agent-link agent-link--rose" />
            <circle r="2.5" class="agent-packet" fill="#67e8f9">
              <animateMotion dur="2.6s" repeatCount="indefinite" path="M200,62 L92,238" />
            </circle>
            <circle r="2.5" class="agent-packet" fill="#fbbf24">
              <animateMotion dur="2.6s" begin="0.8s" repeatCount="indefinite" path="M200,62 L308,238" />
            </circle>
            <circle r="2.5" class="agent-packet" fill="#fb7185">
              <animateMotion dur="2.6s" begin="1.6s" repeatCount="indefinite" path="M92,238 L308,238" />
            </circle>
          </svg>

          <div class="multiagent-hub">
            <div class="multiagent-hub-pulse rounded-full border border-cyan-400/25 bg-slate-950/70 px-3 py-1.5 text-center backdrop-blur-sm">
              <div class="badge-mono text-[9px] text-slate-500 uppercase tracking-wider">Orquestación</div>
              <div class="text-[11px] font-medium text-cyan-200/90 mt-0.5">LangGraph</div>
            </div>
          </div>

          @for (agent of multiAgents; track agent.id) {
            <article [class]="'multiagent-node ' + agent.slotClass"
                     [style.animation-delay]="agent.nodeDelay">
              <div class="multiagent-eye-shell"
                   [style.--agent-accent]="agent.accent"
                   [style.filter]="'drop-shadow(0 0 16px ' + agent.accent + '55)'"
                   [style.animation-delay]="agent.breatheDelay">
                <svg viewBox="0 0 100 100" class="w-full h-full" aria-hidden="true">
                  <defs>
                    <clipPath [attr.id]="'ma-clip-' + agent.id">
                      <path d="M18 50 Q50 22 82 50 Q50 78 18 50 Z"/>
                    </clipPath>
                    <radialGradient [attr.id]="'ma-iris-' + agent.id" cx="38%" cy="32%" r="68%">
                      <stop offset="0%" [attr.stop-color]="agent.accent" stop-opacity="0.95"/>
                      <stop offset="55%" [attr.stop-color]="agent.irisInner"/>
                      <stop offset="100%" stop-color="#082f49"/>
                    </radialGradient>
                  </defs>
                  <circle cx="50" cy="50" r="47" fill="none" [attr.stroke]="agent.accent"
                          stroke-width="0.9" stroke-dasharray="3 6" stroke-opacity="0.4"
                          class="ma-orbit-ring" [style.animation-delay]="agent.breatheDelay"/>
                  <circle cx="50" cy="50" r="44" fill="none" [attr.stroke]="agent.accent" stroke-opacity="0.22" stroke-width="1"/>
                  <circle cx="50" cy="50" r="44" fill="none" [attr.stroke]="agent.accent"
                          stroke-width="1.6" stroke-dasharray="2 20" stroke-linecap="round"
                          class="ma-scan-arc" [style.animation-delay]="agent.breatheDelay"/>
                  <g [class]="'ma-brows ' + agent.browAnimClass" [style.animation-delay]="agent.breatheDelay">
                    <path [attr.d]="agent.browLeft"
                          class="multiagent-brow"
                          [attr.stroke]="agent.accent"
                          stroke-width="2.2"
                          stroke-opacity="0.9"/>
                    <path [attr.d]="agent.browRight"
                          class="multiagent-brow"
                          [attr.stroke]="agent.accent"
                          stroke-width="2.2"
                          stroke-opacity="0.9"/>
                    @if (agent.browCrease) {
                      <path [attr.d]="agent.browCrease"
                            class="multiagent-brow"
                            [attr.stroke]="agent.accent"
                            stroke-width="1.4"
                            stroke-opacity="0.55"/>
                    }
                  </g>
                  <path d="M18 50 Q50 22 82 50 Q50 78 18 50 Z"
                        fill="#070b14"
                        [attr.stroke]="agent.accent"
                        stroke-width="1.3"
                        stroke-opacity="0.75"/>
                  <g [attr.clip-path]="'url(#ma-clip-' + agent.id + ')'">
                    <g [class]="'ma-gaze ' + agent.gazeClass" [style.animation-delay]="agent.breatheDelay">
                      <circle cx="50" cy="50" [attr.r]="agent.irisRadius"
                              [attr.fill]="'url(#ma-iris-' + agent.id + ')'"
                              class="multiagent-iris-pulse"
                              [style.animation-delay]="agent.breatheDelay"/>
                      <circle cx="50" cy="50" [attr.r]="agent.irisRadius * 0.46" fill="#020617"/>
                      <circle [attr.cx]="agent.highlightX" [attr.cy]="agent.highlightY" r="1.8" fill="white" opacity="0.62"/>
                    </g>
                    @if (agent.lidPath) {
                      <path [attr.d]="agent.lidPath" fill="#070b14" class="ma-lid-squint"
                            [style.animation-delay]="agent.breatheDelay"/>
                    }
                    <path d="M18 50 Q50 22 82 50 Q50 78 18 50 Z"
                          fill="#05070d"
                          class="ma-blink-lid"
                          [style.animation-delay]="agent.blinkDelay"/>
                  </g>
                </svg>
              </div>

              <div class="multiagent-card w-full">
                <div class="text-[14px] sm:text-[15px] font-semibold text-white leading-tight">{{ agent.name }}</div>
                <div class="text-[10.5px] uppercase tracking-[0.12em] mt-1 font-medium"
                     [style.color]="agent.accent">{{ agent.role }}</div>
                <p class="text-[12px] sm:text-[12.5px] text-slate-300/90 mt-2 leading-snug italic">"{{ agent.personality }}"</p>
                <p class="text-[11px] sm:text-[11.5px] text-slate-500 mt-1.5 leading-snug">{{ agent.duty }}</p>
              </div>
            </article>
          }
        </div>
      </div>
    </section>

    <!-- ─────────────────────────── HOW IT WORKS ─────────────────────────── -->
    <section id="flow" class="relative py-24 lg:py-32">
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
      <div class="max-w-[980px] mx-auto px-6 lg:px-10">

        <div class="text-center mb-16 reveal" #reveal>
          <div class="text-cyan-300/80 text-[11px] uppercase tracking-[0.18em] mb-3">Cómo funciona</div>
          <h2 class="text-[34px] sm:text-[40px] lg:text-[46px] font-semibold tracking-tight text-white leading-[1.1]">
            Del reclamo a la alerta clara.
          </h2>
          <p class="mt-5 text-slate-400 text-[15.5px] leading-relaxed max-w-[640px] mx-auto">
            Cada siniestro sigue el mismo proceso: cargar, evaluar y priorizar. Sin cajas negras, sin sorpresas.
          </p>
        </div>

        <div class="relative flow-steps">
          <div class="flow-spine" aria-hidden="true"></div>

          @for (step of flowSteps; track step.title; let i = $index) {
            <div class="reveal step-card relative flex items-start gap-5 sm:gap-6 mb-8 last:mb-0" #reveal
                 [style.transition-delay]="(i * 110) + 'ms'">

              <div class="w-14 sm:w-16 shrink-0 flex justify-center z-10 mt-0.5">
                <div class="flow-node w-14 h-14 sm:w-16 sm:h-16 rounded-2xl grid place-items-center border border-cyan-400/40 text-cyan-200">
                  <ui-icon [name]="step.icon" [size]="26" [weight]="500" />
                  <div class="badge-mono absolute -top-1 -right-1 w-6 h-6 rounded-full grid place-items-center bg-[#05070d] border border-cyan-400/40 text-cyan-200">
                    0{{ i + 1 }}
                  </div>
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
      </div>
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
            Una plataforma, dos bandejas de trabajo. Cambia de rol y mira cómo Centinela
            reorganiza prioridades, métricas y recomendaciones para cada equipo.
          </p>
        </div>

        <!-- Perspective tabs -->
        <div class="flex justify-center mb-10">
          <div class="inline-flex p-1 rounded-2xl bg-slate-900/60 border border-slate-700/60 backdrop-blur max-w-full">
            @for (option of perspectiveOptions; track option.id) {
              <button type="button"
                      class="px-4 sm:px-6 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 whitespace-nowrap"
                      [class.text-slate-400]="perspective() !== option.id"
                      [class.text-white]="perspective() === option.id"
                      [class.perspective-tab--active]="perspective() === option.id"
                      (click)="setPerspective(option.id)">
                {{ option.label }}
              </button>
            }
          </div>
        </div>

        @for (activePerspective of [perspective()]; track activePerspective) {
        <div class="grid lg:grid-cols-[0.92fr_1.08fr] gap-10 items-start perspective-swap">

          <!-- Copy column -->
          <div class="perspective-copy-panel rounded-2xl p-6 sm:p-8">
            <div class="text-cyan-300/80 text-[11px] uppercase tracking-[0.18em] mb-3">
              {{ currentPerspective().eyebrow }}
            </div>
            <h3 class="text-[28px] sm:text-[32px] font-semibold text-white tracking-tight leading-tight mb-4">
              {{ currentPerspective().title }}
            </h3>
            <p class="text-slate-400 text-[15px] leading-relaxed mb-7">
              {{ currentPerspective().description }}
            </p>

            <div class="space-y-2.5 mb-8">
              @for (item of currentPerspective().focusBullets; track item) {
                <div class="perspective-feature flex items-start gap-3 rounded-xl px-3.5 py-3">
                  <span class="w-6 h-6 rounded-full grid place-items-center bg-cyan-400/15 border border-cyan-400/30 text-cyan-200 shrink-0 mt-0.5">
                    <ui-icon name="check" [size]="14" />
                  </span>
                  <span class="text-[13.5px] text-slate-200 leading-snug">{{ item }}</span>
                </div>
              }
            </div>

            <button type="button" (click)="goToDemo()"
                    class="glow-button inline-flex items-center gap-2 text-[13.5px] font-medium text-[#05070d] bg-cyan-300 px-5 py-2.5 rounded-xl">
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
            <div class="grid grid-cols-3 gap-2.5 sm:gap-3 mb-5">
              @for (kpi of currentKpis(); track kpi.label) {
                <div class="rounded-xl bg-slate-900/70 border border-slate-700/40 px-2.5 sm:px-3 py-3 min-w-0">
                  <div class="text-[10px] sm:text-[10.5px] uppercase tracking-wide text-slate-400 leading-tight">{{ kpi.label }}</div>
                  <div class="text-[20px] sm:text-[22px] font-semibold text-white tabular-nums leading-tight mt-1">{{ kpi.value }}</div>
                  <div class="text-[10px] sm:text-[10.5px] text-cyan-300/80 mt-1 leading-tight">{{ kpi.delta }}</div>
                </div>
              }
            </div>

            <!-- Chart + table -->
            <div class="grid sm:grid-cols-[0.85fr_1fr] gap-4">

              <!-- score distribution chart -->
              <div class="rounded-xl bg-slate-900/55 border border-slate-700/40 p-4">
                <div class="flex items-center justify-between mb-3">
                  <div class="text-[11px] uppercase tracking-wider text-slate-400">Distribución por riesgo</div>
                  <div class="badge-mono text-slate-500">7D</div>
                </div>
                <div class="relative">
                  <div class="absolute inset-x-0 bottom-[22px] h-px bg-slate-700/40"></div>
                  <div class="flex items-end gap-1.5 h-[92px] mb-2">
                    @for (bar of currentChart(); track bar.label) {
                      <div class="flex-1 h-full flex flex-col justify-end min-w-0">
                        <div class="w-full preview-bar rounded-t-sm min-h-[6px]"
                             [style.height.%]="bar.height"
                             [style.background]="bar.color"></div>
                      </div>
                    }
                  </div>
                  <div class="flex gap-1.5">
                    @for (bar of currentChart(); track bar.label) {
                      <div class="flex-1 badge-mono text-slate-500 truncate text-center">{{ bar.label }}</div>
                    }
                  </div>
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
                      <div class="flex flex-col items-end gap-0.5 shrink-0">
                        <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              [class.bg-tier-red-soft]="row.tier === 'rojo'"
                              [class.text-tier-red-ink]="row.tier === 'rojo'"
                              [class.bg-tier-yellow-soft]="row.tier === 'amarillo'"
                              [class.text-tier-yellow-ink]="row.tier === 'amarillo'"
                              [class.bg-tier-green-soft]="row.tier === 'verde'"
                              [class.text-tier-green-ink]="row.tier === 'verde'">
                          {{ tierLabel(row.tier) }}
                        </span>
                        <span class="text-[12px] text-slate-400 tabular-nums">Riesgo {{ row.score }}</span>
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
                <div class="text-[12.5px] text-slate-200 leading-snug">{{ currentSuggestion() }}</div>
              </div>
            </div>
          </div>
        </div>
        }

      </div>
    </section>

    <!-- ─────────────────────────── CTA FINAL ─────────────────────────── -->
    <section id="cta" class="relative pb-24 lg:pb-32">
      <div class="max-w-[980px] mx-auto px-6 lg:px-10">
        <div class="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/8 via-transparent to-blue-500/10 p-8 sm:p-10 text-center reveal" #reveal>
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
            <div class="text-slate-500 text-[11.5px]">Alertas inteligentes · Aseguradora del Sur</div>
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
      title: 'Triaje claro, sin perder tiempo.',
      description:
        'La bandeja del día llega ordenada por urgencia, con el contexto de cada reclamo listo para decidir. Puedes continuar el pago, pedir documentación o escalar a Antifraude en pocos clics.',
      focusBullets: [
        'Semáforo rojo, amarillo y verde en cada caso.',
        'Cada alerta explicada con motivos concretos.',
        'Escalación con nota para el equipo especializado.',
      ],
      ctaLabel: 'Probar vista de analista',
    },
    antifraude: {
      eyebrow: 'Perspectiva · Especialista antifraude',
      title: 'Profundidad donde más importa.',
      description:
        'Tu bandeja concentra los casos que primer nivel marcó para revisión. Centinela ya cruzó historial del asegurado, relato del siniestro y red de proveedores antes de que abras el expediente.',
      focusBullets: [
        'Conexiones entre asegurados y proveedores recurrentes.',
        'Patrones repetidos y montos fuera de lo habitual.',
        'Dictamen documentado con historial de decisiones.',
      ],
      ctaLabel: 'Probar vista antifraude',
    },
  };

  protected readonly currentPerspective = computed(() => this.perspectives[this.perspective()]);

  protected readonly perspectiveOptions: ReadonlyArray<{ id: Perspective; label: string }> = [
    { id: 'analista', label: 'Analista de siniestros' },
    { id: 'antifraude', label: 'Especialista antifraude' },
  ];

  // ── Mockup data ───────────────────────────────────────────────────
  protected readonly currentKpis = computed(() => {
    if (this.perspective() === 'antifraude') {
      return [
        { label: 'Casos escalados', value: '74', delta: 'En tu bandeja' },
        { label: 'Monto en alerta', value: '$1.2M', delta: 'Requiere dictamen' },
        { label: 'Revisión evitada', value: '38%', delta: 'Casos descartados' },
      ];
    }
    return [
      { label: 'Casos del día', value: '128', delta: 'Listos para triaje' },
      { label: 'Revisión evitada', value: '62%', delta: 'Flujo normal' },
      { label: 'Monto en alerta', value: '$840k', delta: 'Rojo y amarillo' },
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
        { id: 'SIN-08412', asegurado: 'María F. Salazar', ramo: 'Vehículos', score: 91, tier: 'rojo', signal: 'Pérdida total + denuncia tardía' },
        { id: 'SIN-07731', asegurado: 'Jorge A. Pérez', ramo: 'Vida', score: 84, tier: 'rojo', signal: 'Relato muy similar a otros casos del proveedor' },
        { id: 'SIN-07415', asegurado: 'Lucía Mejía', ramo: 'Salud', score: 79, tier: 'amarillo', signal: 'Varios reclamos recientes en la misma sucursal' },
      ];
    }
    return [
      { id: 'SIN-08440', asegurado: 'Andrés Vega', ramo: 'Vehículos', score: 88, tier: 'rojo', signal: 'Pérdida total + señales críticas activas' },
      { id: 'SIN-08438', asegurado: 'Patricia Soto', ramo: 'Salud', score: 64, tier: 'amarillo', signal: 'Documentación incompleta' },
      { id: 'SIN-08436', asegurado: 'Carlos Mora', ramo: 'Vida', score: 28, tier: 'verde', signal: 'Sin alertas · flujo normal' },
    ];
  });

  protected readonly currentSuggestion = computed(() =>
    this.perspective() === 'antifraude'
      ? '3 reclamos con relatos muy parecidos a SIN-08412 — conviene revisar la red del proveedor.'
      : 'Priorizar SIN-08440: alertas críticas y monto por encima de lo esperado.',
  );

  // ── Static content ────────────────────────────────────────────────
  protected readonly valueCards = [
    {
      title: 'Detección activa 24/7',
      copy: 'Cada reclamo nuevo se evalúa en segundos. La bandeja se actualiza al instante, sin esperar al cierre del día.',
      bullets: ['Alertas críticas identificadas de inmediato', 'Nivel de riesgo claro por caso', 'Actualización en tiempo real para el equipo'],
      iconBg: 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(34,211,238,0.04))',
      icon: 'radar',
    },
    {
      title: 'Explicabilidad total',
      copy: 'Centinela no es una caja negra. Cada alerta muestra el motivo, los factores relevantes y casos parecidos para apoyar la decisión.',
      bullets: ['Motivos de alerta en lenguaje claro', 'Comparación con reclamos similares', 'Trazabilidad de cada revisión humana'],
      iconBg: 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(168,85,247,0.04))',
      icon: 'psychology',
    },
    {
      title: 'Acción coordinada',
      copy: 'Analistas y especialistas antifraude trabajan sobre la misma información, con bandeja y dictamen alineados.',
      bullets: ['Escalación con contexto y notas', 'Dictamen documentado y exportable', 'Historial de cambios por usuario'],
      iconBg: 'linear-gradient(135deg, rgba(96,165,250,0.18), rgba(96,165,250,0.04))',
      icon: 'hub',
    },
  ] as const;

  protected readonly flowSteps = [
    {
      title: 'Carga de reclamos',
      tag: 'Paso 01',
      description:
        'Sube planillas, PDFs y documentos de soporte en un solo flujo. Centinela valida la información y te muestra el avance mientras los casos quedan listos para revisión.',
      icon: 'cloud_upload',
      tools: ['Excel y CSV', 'PDF y Word', 'Carga masiva', 'Avance en vivo'],
    },
    {
      title: 'Evaluación inteligente',
      tag: 'Paso 02',
      description:
        'Primero aplicamos criterios de negocio de la aseguradora. Luego la IA detecta patrones inusuales, relatos repetidos y comportamientos atípicos — siempre explicando el porqué.',
      icon: 'memory',
      tools: ['Señales de alerta', 'Patrones inusuales', 'Casos similares', 'Explicación clara'],
    },
    {
      title: 'Priorización para revisión',
      tag: 'Paso 03',
      description:
        'El analista ve la bandeja ordenada por urgencia; el especialista recibe los casos escalados. Centinela acompaña cada paso con contexto, explicaciones y recomendaciones.',
      icon: 'verified',
      tools: ['Semáforo de riesgo', 'Bandeja priorizada', 'Trazabilidad completa'],
    },
  ] as const;

  protected readonly multiAgents: readonly MultiAgentPersona[] = [
    {
      id: 'centinela',
      name: 'Centinela',
      role: 'Orquestador',
      personality: 'Sereno pero firme: mira el panorama y decide el siguiente paso.',
      duty: 'Coordina herramientas y compone la respuesta al analista.',
      accent: '#22d3ee',
      irisInner: '#0e7490',
      gazeClass: 'ma-gaze--centinela',
      browAnimClass: 'ma-brows--calm',
      blinkDelay: '0s',
      highlightX: 47.2,
      highlightY: 48,
      irisRadius: 11.5,
      browLeft: 'M 24 18 L 41 16',
      browRight: 'M 76 18 L 59 16',
      slotClass: 'multiagent-node--top',
      breatheDelay: '0ms',
      nodeDelay: '0.15s',
    },
    {
      id: 'vigia',
      name: 'Vigía',
      role: 'Scoring y reglas',
      personality: 'Escéptico y exigente: frunce el ceño ante cada señal dudosa.',
      duty: 'Evalúa reglas, ML y anomalías de cada reclamo.',
      accent: '#fbbf24',
      irisInner: '#b45309',
      gazeClass: 'ma-gaze--vigia',
      browAnimClass: 'ma-brows--vigia',
      blinkDelay: '2.2s',
      highlightX: 48.8,
      highlightY: 46.2,
      irisRadius: 10.5,
      browLeft: 'M 21 15 L 39 23',
      browRight: 'M 79 15 L 61 23',
      browCrease: 'M 39 23 Q 50 26.5 61 23',
      lidPath: 'M 24 41 Q 50 35 76 41 L 72 47 Q 50 43 28 47 Z',
      slotClass: 'multiagent-node--left',
      breatheDelay: '600ms',
      nodeDelay: '0.35s',
    },
    {
      id: 'rastreador',
      name: 'Rastreador',
      role: 'Patrones y red',
      personality: 'Curioso e inquieto: escanea conexiones que otros no ven.',
      duty: 'Detecta similitudes y vínculos sospechosos entre casos.',
      accent: '#fb7185',
      irisInner: '#be123c',
      gazeClass: 'ma-gaze--rastreador',
      browAnimClass: 'ma-brows--rastreador',
      blinkDelay: '4.4s',
      highlightX: 45.2,
      highlightY: 46.2,
      irisRadius: 12.5,
      browLeft: 'M 20 12 Q 34 8 43 11',
      browRight: 'M 77 17 L 59 16',
      slotClass: 'multiagent-node--right',
      breatheDelay: '1200ms',
      nodeDelay: '0.55s',
    },
  ];

  protected readonly heroValuePoints = [
    {
      icon: 'traffic',
      title: 'Semáforo en cada reclamo',
      detail: 'Verde, amarillo o rojo según el score de riesgo (0–100).',
    },
    {
      icon: 'fact_check',
      title: 'Motivo visible en cada alerta',
      detail: 'Reglas, patrones y señales explicadas — no una caja negra.',
    },
    {
      icon: 'forum',
      title: 'Pregunta al agente con datos',
      detail: 'Consulta casos, proveedores y patrones en lenguaje natural.',
    },
  ] as const;

  protected readonly trustSeals = [
    'Datos sintéticos',
    'Decisión humana',
    'Sin rechazos automáticos',
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

  protected tierLabel(tier: MockClaimRow['tier']): string {
    if (tier === 'rojo') return 'Alto';
    if (tier === 'amarillo') return 'Medio';
    return 'Normal';
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

