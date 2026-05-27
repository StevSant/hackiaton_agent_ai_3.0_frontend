import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { AgentApi } from '@core/api/clients/agent.api';
import { markdownToPlainText } from '@shared/utils';

export type TtsState = 'idle' | 'loading' | 'playing' | 'paused';

export interface TtsVoice {
  readonly id: string;
  readonly label: string;
}

/** OpenAI TTS voices that work across tts-1 and gpt-4o-mini-tts. */
const OPENAI_VOICES: readonly TtsVoice[] = [
  { id: 'nova', label: 'Nova (cálida)' },
  { id: 'shimmer', label: 'Shimmer (suave)' },
  { id: 'alloy', label: 'Alloy (neutral)' },
  { id: 'echo', label: 'Echo (clara)' },
  { id: 'fable', label: 'Fable (expresiva)' },
  { id: 'onyx', label: 'Onyx (grave)' },
];

/**
 * Reads assistant messages aloud using premium OpenAI TTS audio.
 *
 * The backend renders the text to an mp3; we play it through a single
 * HTMLAudioElement. That gives real scrubbing (set currentTime), instant
 * speed (playbackRate) and volume — no word highlighting (OpenAI gives no
 * per-word timestamps). One message plays at a time.
 */
@Injectable({ providedIn: 'root' })
export class TextToSpeechService {
  private readonly api = inject(AgentApi);

  readonly supported = typeof Audio !== 'undefined';
  readonly voices = OPENAI_VOICES;

  private readonly _state = signal<TtsState>('idle');
  private readonly _activeId = signal<string | null>(null);
  private readonly _progress = signal<number>(0);
  private readonly _rate = signal<number>(1);
  private readonly _volume = signal<number>(1);
  private readonly _voice = signal<string>('nova');

  readonly state = this._state.asReadonly();
  readonly activeId = this._activeId.asReadonly();
  readonly progress = this._progress.asReadonly();
  readonly rate = this._rate.asReadonly();
  readonly volume = this._volume.asReadonly();
  readonly voice = this._voice.asReadonly();
  readonly playing = computed(() => this._state() === 'playing');
  readonly loading = computed(() => this._state() === 'loading');

  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private request: Subscription | null = null;
  private currentText = '';

  /** Play `markdown` for `id`, or pause/resume if it's already the active message. */
  toggle(id: string, markdown: string): void {
    if (!this.supported) return;
    if (this._activeId() === id && this._state() !== 'idle') {
      if (this._state() === 'playing') this.pause();
      else if (this._state() === 'paused') this.resume();
      return; // ignore taps while loading
    }
    this.start(id, markdownToPlainText(markdown));
  }

  /** Pause/resume whatever is currently active (used by the transport bar). */
  toggleActive(): void {
    if (this._state() === 'playing') this.pause();
    else if (this._state() === 'paused') this.resume();
  }

  pause(): void {
    if (this._state() !== 'playing' || !this.audio) return;
    this.audio.pause();
    this._state.set('paused');
  }

  resume(): void {
    if (this._state() !== 'paused' || !this.audio) return;
    void this.audio.play();
    this._state.set('playing');
  }

  stop(): void {
    this.request?.unsubscribe();
    this.request = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.revokeUrl();
    this._state.set('idle');
    this._activeId.set(null);
    this._progress.set(0);
  }

  /** Real audio scrubbing — jump to a fraction (0..1) of the clip. */
  seekToFraction(fraction: number): void {
    if (!this.audio || !isFinite(this.audio.duration)) return;
    this.audio.currentTime = Math.max(0, Math.min(1, fraction)) * this.audio.duration;
  }

  setRate(rate: number): void {
    this._rate.set(rate);
    if (this.audio) this.audio.playbackRate = rate;
  }

  setVolume(volume: number): void {
    this._volume.set(volume);
    if (this.audio) this.audio.volume = volume;
  }

  setVoice(voice: string): void {
    this._voice.set(voice);
    // A different voice means a new render — restart the active text.
    const id = this._activeId();
    if (id && this._state() !== 'idle') this.start(id, this.currentText);
  }

  private start(id: string, text: string): void {
    this.stop();
    if (!text.trim()) return;
    this.currentText = text;
    this._activeId.set(id);
    this._state.set('loading');
    this.request = this.api.tts(text, this._voice()).subscribe({
      next: (blob) => this.play(blob),
      error: () => this.stop(),
    });
  }

  private play(blob: Blob): void {
    this.revokeUrl();
    this.objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(this.objectUrl);
    audio.playbackRate = this._rate();
    audio.volume = this._volume();
    audio.ontimeupdate = () => {
      const duration = audio.duration;
      this._progress.set(isFinite(duration) && duration > 0 ? audio.currentTime / duration : 0);
    };
    audio.onended = () => this.stop();
    audio.onerror = () => this.stop();
    this.audio = audio;
    void audio.play();
    this._state.set('playing');
  }

  private revokeUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
