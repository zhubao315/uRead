import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { segmentForSpeech, type SpeechSegment } from '../domain/listen/speech-segmenter';
import { detectSpeechCapabilities, type SpeechCapabilities } from '../domain/listen/speech-capabilities';
import { NativeSpeechEngine } from '../services/speech/NativeSpeechEngine';

const KEY = 'uread:listen:settings:v1';

interface Settings { rate: number; voice: string; }
type WakeLockLike = { release: () => Promise<void>; addEventListener?: (type: string, listener: () => void) => void };
type PlayerState = 'idle' | 'playing' | 'paused' | 'completed' | 'error';

export function useSpeechPlayer(body: string, contentKey: string, title = '') {
  const [capabilities] = useState<SpeechCapabilities>(() => detectSpeechCapabilities());
  const [settings, setSettings] = useState<Settings>(() => {
    try { return { rate: 1, voice: '', ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; }
    catch { return { rate: 1, voice: '' }; }
  });
  const [state, setState] = useState<PlayerState>('idle');
  const [segment, setSegment] = useState<SpeechSegment | null>(null);
  const [error, setError] = useState('');
  const engineRef = useRef<NativeSpeechEngine | null>(null);
  const wakeLockRef = useRef<WakeLockLike | null>(null);
  const playingRef = useRef(false);
  const segments = useMemo(() => segmentForSpeech(body), [body]);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings));
  }, [settings]);

  const releaseWakeLock = useCallback(() => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (lock) void lock.release().catch(() => undefined);
  }, []);

  /**
   * Web Speech API 在移动端锁屏 / 切后台后会被系统暂停。
   * 朗读期间申请屏幕常亮：这不是「真正的后台音频」，但能避免一锁屏就停。
   * 页面被隐藏时浏览器会自动释放 wake lock，回到前台时再申请一次。
   */
  const acquireWakeLock = useCallback(async () => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> };
    };
    if (!nav.wakeLock || wakeLockRef.current) return;
    try {
      const lock = await nav.wakeLock.request('screen');
      wakeLockRef.current = lock;
      lock.addEventListener?.('release', () => {
        if (wakeLockRef.current === lock) wakeLockRef.current = null;
      });
    } catch {
      // 隐私模式 / 用户拒绝 / 不支持：不影响朗读本身。
    }
  }, []);

  const setMediaState = useCallback((next: PlayerState, activeTitle: string) => {
    const session = navigator.mediaSession;
    if (!session) return;
    try {
      session.playbackState = next === 'playing' ? 'playing' : next === 'paused' ? 'paused' : 'none';
    } catch {
      /* 部分浏览器没有 playbackState */
    }
    if (next !== 'idle' && typeof MediaMetadata !== 'undefined') {
      try {
        session.metadata = new MediaMetadata({
          title: activeTitle || 'uRead 朗读',
          artist: 'uRead · 设备语音朗读',
          album: 'READ · REFLECT · REVISIT',
        });
      } catch {
        /* metadata 不是必需 */
      }
    }
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
    playingRef.current = false;
    releaseWakeLock();
    setMediaState('paused', title);
  }, [releaseWakeLock, setMediaState, title]);

  const resume = useCallback(() => {
    engineRef.current?.resume();
    playingRef.current = true;
    void acquireWakeLock();
    setMediaState('playing', title);
  }, [acquireWakeLock, setMediaState, title]);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    playingRef.current = false;
    releaseWakeLock();
    setMediaState('idle', title);
    setState('idle');
    setSegment(null);
  }, [releaseWakeLock, setMediaState, title]);

  const next = useCallback(() => engineRef.current?.next(), []);
  const previous = useCallback(() => engineRef.current?.previous(), []);

  // 锁屏 / 通知栏控制：让暂停、继续、上下段不必回到页面里点。
  useEffect(() => {
    const session = navigator.mediaSession;
    if (!session) return;
    const actions: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => resume()],
      ['pause', () => pause()],
      ['stop', () => stop()],
      ['previoustrack', () => previous()],
      ['nexttrack', () => next()],
    ];
    for (const [action, handler] of actions) {
      try { session.setActionHandler(action, handler); } catch { /* 不支持的 action 忽略 */ }
    }
    return () => {
      for (const [action] of actions) {
        try { session.setActionHandler(action, null); } catch { /* 同上 */ }
      }
    };
  }, [next, pause, previous, resume, stop]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && playingRef.current) void acquireWakeLock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [acquireWakeLock]);

  useEffect(() => () => {
    engineRef.current?.stop();
    engineRef.current = null;
    releaseWakeLock();
  }, [contentKey, releaseWakeLock]);

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
      onSegment: (nextSegment) => setSegment(nextSegment),
      onState: (nextState) => {
        setState(nextState);
        playingRef.current = nextState === 'playing';
        if (nextState === 'playing') {
          void acquireWakeLock();
          setMediaState('playing', title);
        } else {
          releaseWakeLock();
          setMediaState(nextState, title);
        }
      },
      onError: (message) => { setError(message); setState('error'); },
    });
  }, [acquireWakeLock, ensureEngine, releaseWakeLock, segments, setMediaState, settings, title]);

  return {
    capabilities, settings, setSettings, state, segment, error, segments,
    play, pause, resume, stop, next, previous,
  };
}
