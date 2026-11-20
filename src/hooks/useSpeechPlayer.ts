import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { segmentForSpeech, type SpeechSegment } from '../domain/listen/speech-segmenter';
import { detectSpeechCapabilities, type SpeechCapabilities } from '../domain/listen/speech-capabilities';
import { NativeSpeechEngine } from '../services/speech/NativeSpeechEngine';

const KEY = 'uread:listen:settings:v1';

interface Settings { rate: number; voice: string; }

export function useSpeechPlayer(body: string, contentKey: string) {
  const [capabilities] = useState<SpeechCapabilities>(() => detectSpeechCapabilities());
  const [settings, setSettings] = useState<Settings>(() => {
    try { return { rate: 1, voice: '', ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; }
    catch { return { rate: 1, voice: '' }; }
  });
  const [state, setState] = useState<'idle' | 'playing' | 'paused' | 'completed' | 'error'>('idle');
  const [segment, setSegment] = useState<SpeechSegment | null>(null);
  const [error, setError] = useState('');
  const engineRef = useRef<NativeSpeechEngine | null>(null);
  const segments = useMemo(() => segmentForSpeech(body), [body]);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => () => {
    engineRef.current?.stop();
    engineRef.current = null;
  }, [contentKey]);

  const ensureEngine = useCallback(() => {
    if (!engineRef.current && capabilities.supported && typeof window !== 'undefined') {
      engineRef.current = new NativeSpeechEngine(window.speechSynthesis);
    }
    return engineRef.current;
  }, [capabilities.supported]);

  const play = useCallback((fromIndex = 0) => {
    setError('');
    const engine = ensureEngine();
    if (!engine) { setError('当前浏览器不支持设备语音朗读'); setState('error'); return; }
    engine.configure(settings);
    engine.play(segments, fromIndex, {
      onSegment: (next) => setSegment(next),
      onState: (next) => setState(next),
      onError: (message) => { setError(message); setState('error'); },
    });
  }, [ensureEngine, segments, settings]);

  const pause = useCallback(() => engineRef.current?.pause(), []);
  const resume = useCallback(() => engineRef.current?.resume(), []);
  const stop = useCallback(() => { engineRef.current?.stop(); setState('idle'); setSegment(null); }, []);
  const next = useCallback(() => engineRef.current?.next(), []);
  const previous = useCallback(() => engineRef.current?.previous(), []);

  return {
    capabilities, settings, setSettings, state, segment, error, segments,
    play, pause, resume, stop, next, previous,
  };
}
