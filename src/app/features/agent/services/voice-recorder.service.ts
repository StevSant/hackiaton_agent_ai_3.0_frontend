import { Injectable, signal } from '@angular/core';

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

const BAR_COUNT = 9;
const IDLE_LEVELS = Array.from({ length: BAR_COUNT }, () => 0.14);

@Injectable({ providedIn: 'root' })
export class VoiceRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private selectedMimeType = 'audio/webm';
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private monitoring = false;

  private readonly _recording = signal(false);
  private readonly _levels = signal<number[]>(IDLE_LEVELS);

  readonly recording = this._recording.asReadonly();
  readonly levels = this._levels.asReadonly();

  isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  async start(): Promise<void> {
    if (this._recording()) return;
    if (!this.isSupported()) {
      throw new Error('Tu navegador no soporta grabación de voz.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.selectedMimeType = this.resolveMimeType();
    this.audioChunks = [];

    this.mediaRecorder = new MediaRecorder(stream, { mimeType: this.selectedMimeType });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    this.mediaRecorder.start();
    this._recording.set(true);
    await this.startAudioMonitor(stream);
  }

  async stop(): Promise<Blob> {
    if (!this.mediaRecorder || !this._recording()) {
      throw new Error('No hay una grabación activa.');
    }

    const recorder = this.mediaRecorder;
    const stream = recorder.stream;

    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.selectedMimeType });
        this.cleanup(stream);
        resolve(audioBlob);
      };
      recorder.onerror = () => {
        this.cleanup(stream);
        reject(new Error('No se pudo completar la grabación.'));
      };
      recorder.stop();
    });

    this.mediaRecorder = null;
    this.audioChunks = [];
    this._recording.set(false);
    return blob;
  }

  cancel(): void {
    if (!this.mediaRecorder) return;
    const stream = this.mediaRecorder.stream;
    this.mediaRecorder.onstop = null;
    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanup(stream);
    this.mediaRecorder = null;
    this.audioChunks = [];
    this._recording.set(false);
  }

  filenameForBlob(blob: Blob): string {
    const mime = blob.type.split(';', 1)[0] || 'audio/webm';
    const extensionByMime: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
    };
    const extension = extensionByMime[mime] ?? 'webm';
    return `voice.${extension}`;
  }

  private async startAudioMonitor(stream: MediaStream): Promise<void> {
    this.audioContext = new AudioContext();
    await this.audioContext.resume();

    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.35;
    source.connect(this.analyser);

    const waveformSamples = new Uint8Array(this.analyser.fftSize);
    const frequencyBins = new Uint8Array(this.analyser.frequencyBinCount);
    this.monitoring = true;

    const tick = (): void => {
      if (!this.monitoring || !this.analyser) {
        return;
      }

      this.analyser.getByteTimeDomainData(waveformSamples);
      this.analyser.getByteFrequencyData(frequencyBins);

      const bucketSize = Math.max(1, Math.floor(waveformSamples.length / BAR_COUNT));
      const nextLevels: number[] = [];

      for (let barIndex = 0; barIndex < BAR_COUNT; barIndex += 1) {
        const waveformStart = barIndex * bucketSize;
        const waveformEnd = Math.min(waveformSamples.length, waveformStart + bucketSize);
        let sumSquares = 0;

        for (let sampleIndex = waveformStart; sampleIndex < waveformEnd; sampleIndex += 1) {
          const centeredSample = (waveformSamples[sampleIndex] - 128) / 128;
          sumSquares += centeredSample * centeredSample;
        }

        const waveformRms = Math.sqrt(sumSquares / Math.max(1, waveformEnd - waveformStart));

        const frequencyStart = barIndex * bucketSize;
        const frequencyEnd = Math.min(frequencyBins.length, frequencyStart + bucketSize);
        let frequencySum = 0;
        for (let binIndex = frequencyStart; binIndex < frequencyEnd; binIndex += 1) {
          frequencySum += frequencyBins[binIndex];
        }
        const frequencyAverage = frequencySum / Math.max(1, frequencyEnd - frequencyStart) / 255;

        const blendedLevel = waveformRms * 0.72 + frequencyAverage * 0.28;
        const barVariation = 0.88 + ((barIndex * 17) % 5) * 0.05;
        nextLevels.push(Math.max(0.12, Math.min(1, blendedLevel * 4.2 * barVariation + 0.08)));
      }

      this._levels.set(nextLevels);
      this.animationFrameId = requestAnimationFrame(tick);
    };

    tick();
  }

  private stopAudioMonitor(): void {
    this.monitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    void this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this._levels.set([...IDLE_LEVELS]);
  }

  private resolveMimeType(): string {
    for (const mimeType of PREFERRED_MIME_TYPES) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return 'audio/webm';
  }

  private cleanup(stream: MediaStream): void {
    this.stopAudioMonitor();
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }
}
