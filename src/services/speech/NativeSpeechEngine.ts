import type { SpeechSegment } from '../../domain/listen/speech-segmenter';

export interface SpeechEngineEvents {
  onSegment?: (segment: SpeechSegment) => void;
  onState?: (state: 'playing' | 'paused' | 'completed' | 'error') => void;
  onError?: (message: string) => void;
}

/** 设备原生朗读：零文件、零网络、不上传正文。逐段 utterance，结束自动下一段。 */
export class NativeSpeechEngine {
  private segments: SpeechSegment[] = [];
  private cursor = 0;
  private utterance: SpeechSynthesisUtterance | null = null;
  private events: SpeechEngineEvents = {};
  private rate = 1;
  private voice = '';

  constructor(private readonly synth: SpeechSynthesis) {}

  configure(options: { rate?: number; voice?: string }) {
    if (options.rate) this.rate = options.rate;
    if (options.voice) this.voice = options.voice;
  }

  play(segments: SpeechSegment[], fromIndex = 0, events: SpeechEngineEvents = {}) {
    this.stop();
    this.segments = segments;
    this.cursor = fromIndex;
    this.events = events;
    this.speakCurrent();
  }

  private speakCurrent() {
    if (this.cursor >= this.segments.length) {
      this.events.onState?.('completed');
      return;
    }
    const segment = this.segments[this.cursor];
    this.events.onSegment?.(segment);
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.rate = this.rate;
    utterance.lang = 'zh-CN';
    if (this.voice) {
      const found = this.synth.getVoices().find((voice) => voice.name === this.voice);
      if (found) utterance.voice = found;
    }
    utterance.onend = () => {
      if (this.utterance !== utterance) return;
      this.cursor += 1;
      this.speakCurrent();
    };
    utterance.onerror = (event) => {
      if (this.utterance !== utterance) return;
      this.events.onError?.(event.error || 'speech error');
      this.events.onState?.('error');
    };
    this.utterance = utterance;
    this.synth.speak(utterance);
    this.events.onState?.('playing');
  }

  pause() {
    if (!this.synth.speaking) return;
    this.synth.pause();
    this.events.onState?.('paused');
  }

  resume() {
    if (!this.synth.paused) return;
    this.synth.resume();
    this.events.onState?.('playing');
  }

  next() {
    this.stopCurrent();
    this.cursor = Math.min(this.cursor + 1, this.segments.length);
    this.speakCurrent();
  }

  previous() {
    this.stopCurrent();
    this.cursor = Math.max(this.cursor - 1, 0);
    this.speakCurrent();
  }

  stop() {
    this.stopCurrent();
    this.segments = [];
    this.cursor = 0;
    try { this.synth.cancel(); } catch { /* 浏览器可能已经放弃队列 */ }
  }

  private stopCurrent() {
    if (this.utterance) {
      this.utterance.onend = null;
      this.utterance.onerror = null;
      this.utterance = null;
    }
    try { this.synth.cancel(); } catch { /* 同上 */ }
  }

  get currentIndex() { return this.cursor; }
}
