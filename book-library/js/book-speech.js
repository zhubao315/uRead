/* global window, document, navigator, localStorage, setTimeout, clearTimeout, SpeechSynthesisUtterance, MediaMetadata */
/**
 * uRead 静态书库 — 原生语音听书控制器（V1）。
 * 从当前可见位置起读，用 foliate 已渲染文档的 Range 做精确高亮，章节自动续播。
 * 一次只维护一个 utterance；generation token 隔离所有过期异步回调。
 */
import { getBlockRanges, findBlockIndex, segmentBlock } from './reader-segments.js';
import { detectSpeechCapabilities } from './speech-core.js';

const STATE = Object.freeze({
  IDLE: 'idle', LOADING: 'loading', PLAYING: 'playing', PAUSED: 'paused',
  STOPPING: 'stopping', COMPLETED: 'completed', ERROR: 'error',
});
const RATES = [0.75, 1, 1.1, 1.25, 1.5, 1.75, 2];
const OVERLAY_KEY = 'uread-speaking';

export class BookSpeechController {
  constructor({ view, book, onState, onSegment, onChapter, onNotice }) {
    this.view = view;
    this.book = book;
    this.events = { onState, onSegment, onChapter, onNotice };
    this.state = STATE.IDLE;
    this.capabilities = detectSpeechCapabilities();
    this.gen = 0;
    this.queue = [];
    this.cursor = 0;
    this.utterance = null;
    this.rate = 1;
    this.voiceURI = '';
    this.keepAwake = false;
    this.sleepMinutes = 0;
    this.sleepStopAtChapterEnd = false;
    this.sleepTimer = null;
    this.wakeLock = null;
    this.currentSection = 0;
    this.lastSavedAt = 0;
    this.internalNav = 0;
    this.settingsKey = 'uread:listen-settings';
    this.stateKey = `uread:book-listen:${book.id}`;
    this._onVisibility = () => this._handleVisibility();
    document.addEventListener('visibilitychange', this._onVisibility);
    this._loadSettings();
    this._initMediaSession();
  }

  getState() { return this.state; }
  getQueue() { return this.queue.slice(); }
  getCursor() { return this.cursor; }
  getCapabilities() { return this.capabilities; }
  getRates() { return RATES.slice(); }
  _currentDoc() {
    try { return this.view.renderer?.getContents?.()[0]?.doc || null; }
    catch { return null; }
  }

  async refreshCapabilities() {
    this.capabilities = detectSpeechCapabilities();
    if (this.capabilities.supported) this._initMediaSession();
    return this.capabilities;
  }

  async start() {
    if (!this.capabilities.supported) {
      this._notice('当前浏览器不支持语音朗读，请使用 Safari / Chrome 或系统浏览器。');
      this._setState(STATE.ERROR);
      return;
    }
    const doc = this._currentDoc();
    if (!doc) { this._notice('书籍尚未渲染，请稍候。'); return; }

    const gen = ++this.gen;
    this._setState(STATE.LOADING);
    this._clearHighlight();
    try {
      const blocks = getBlockRanges(doc);
      if (!blocks.length) { this._notice('这一页没有可朗读的正文。'); this._setState(STATE.IDLE); return; }
      const anchor = this._findStartRange(doc);
      const from = findBlockIndex(blocks, anchor);
      this.currentSection = this.view.renderer?.getContents?.()[0]?.index ?? 0;
      this.queue = [];
      for (let i = from; i < blocks.length; i += 1) {
        const segments = segmentBlock(doc, blocks[i].range, this.view.language?.canonical || 'zh-CN');
        for (const segment of segments) this.queue.push(segment);
      }
      if (!this.queue.length) { this._notice('这一页没有可朗读的正文。'); this._setState(STATE.IDLE); return; }
      this.cursor = 0;
      this._setState(STATE.PLAYING);
      this._startSleepTimer();
      await this._requestWakeLock();
      if (gen !== this.gen) return;
      this._speakCurrent(gen);
    } catch (error) {
      if (gen !== this.gen) return;
      this._notice(`朗读启动失败：${error?.message || error}`);
      this._setState(STATE.ERROR);
    }
  }

  pause() {
    if (this.state !== STATE.PLAYING) return;
    try { window.speechSynthesis.pause(); } catch { /* ignore */ }
    this._setState(STATE.PAUSED);
    this._persist();
  }

  resume() {
    if (this.state !== STATE.PAUSED) return;
    try { window.speechSynthesis.resume(); } catch { /* ignore */ }
    this._setState(STATE.PLAYING);
    this._startSleepTimer();
  }

  toggle() {
    if (this.state === STATE.PLAYING) this.pause();
    else if (this.state === STATE.PAUSED) this.resume();
    else void this.start();
  }

  stop({ notify = true } = {}) {
    this.gen += 1;
    this.state = STATE.STOPPING;
    this._cancelSpeech();
    this._clearHighlight();
    this._clearSleepTimer();
    void this._releaseWakeLock();
    this.queue = [];
    this.cursor = 0;
    this.state = STATE.IDLE;
    this.events.onSegment?.(null);
    this._setMediaPlaybackState('none');
    this._persist();
    this._setState(STATE.IDLE);
    if (notify) this._notice('已停止朗读');
  }

  prev() {
    if (!this.queue.length) return;
    const gen = ++this.gen;
    this._cancelSpeech();
    if (this.cursor > 0) this.cursor -= 1;
    else { void this._gotoAdjacentSection(-1, gen); return; }
    this._setState(STATE.PLAYING);
    this._speakCurrent(gen);
  }

  next() {
    if (!this.queue.length) return;
    const gen = ++this.gen;
    this._cancelSpeech();
    if (this.cursor < this.queue.length - 1) this.cursor += 1;
    else { void this._nextSection(gen); return; }
    this._setState(STATE.PLAYING);
    this._speakCurrent(gen);
  }

  setRate(rate) {
    const value = Number(rate);
    if (!RATES.includes(value)) return;
    const wasPlaying = this.state === STATE.PLAYING;
    this.rate = value;
    this._saveSettings();
    if (wasPlaying) this._restartCurrentSegment('语速已调整');
  }

  setVoice(voiceURI) {
    if (typeof voiceURI !== 'string') return;
    const wasPlaying = this.state === STATE.PLAYING;
    this.voiceURI = voiceURI;
    this._saveSettings();
    if (wasPlaying) this._restartCurrentSegment('音色已切换');
  }

  setKeepAwake(value) {
    this.keepAwake = !!value;
    this._saveSettings();
    if (this.keepAwake && this.state === STATE.PLAYING) void this._requestWakeLock();
    else if (!this.keepAwake) void this._releaseWakeLock();
  }

  setSleepTimer(value) {
    this._clearSleepTimer();
    this.sleepStopAtChapterEnd = value === 'chapter';
    this.sleepMinutes = value === 'chapter' ? 0 : Number(value) || 0;
    this._saveSettings();
    if (this.state === STATE.PLAYING) this._startSleepTimer();
    this._notice(value === 'chapter' ? '将在当前章节结束后停止'
      : this.sleepMinutes > 0 ? `将在 ${this.sleepMinutes} 分钟后停止` : '已关闭定时关闭');
  }

  /** 用户手动翻页/跳目录：终止与旧页面绑定的朗读。 */
  onUserNavigate() {
    if (this.state === STATE.IDLE || this.state === STATE.COMPLETED) return;
    this.stop({ notify: false });
    this._notice('阅读位置已变化，点击「听」从新位置继续');
  }

  async onDocumentChange() {
    if (this.state === STATE.IDLE || this.state === STATE.COMPLETED) return;
    this.stop({ notify: false });
  }

  destroy() {
    this.stop({ notify: false });
    document.removeEventListener('visibilitychange', this._onVisibility);
    this._clearMediaSession();
  }

  /* ---------- internals ---------- */

  _findStartRange(doc) {
    try {
      const selection = doc.getSelection?.();
      if (selection && !selection.isCollapsed && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        if (range.toString().trim()) return range;
      }
      const visible = this.view.lastLocation?.range;
      if (visible && typeof visible.cloneRange === 'function' && visible.toString().trim()) return visible;
    } catch { /* ignore */ }
    return null;
  }

  _speakCurrent(gen) {
    if (gen !== this.gen || this.state !== STATE.PLAYING) return;
    if (this.cursor >= this.queue.length) { void this._nextSection(gen); return; }
    const segment = this.queue[this.cursor];
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.lang = this.view.language?.canonical || 'zh-CN';
    utterance.rate = this.rate;
    if (this.voiceURI) {
      const voice = (window.speechSynthesis.getVoices() || []).find((v) => v.voiceURI === this.voiceURI);
      if (voice) utterance.voice = voice;
    }
    utterance.onstart = () => {
      if (gen !== this.gen) return;
      this._highlight(segment.range);
      this.events.onSegment?.(segment);
      this._setMediaPlaybackState('playing');
      this._persist();
    };
    utterance.onend = () => {
      if (gen !== this.gen || this.state !== STATE.PLAYING) return;
      this.cursor += 1;
      this._persist();
      this._speakCurrent(gen);
    };
    utterance.onerror = (event) => {
      if (gen !== this.gen) return;
      if (event?.error === 'interrupted' || event?.error === 'canceled') return;
      this._notice(`朗读中断：${event?.error || '未知错误'}`);
      this._setState(STATE.ERROR);
    };
    this.utterance = utterance;
    try { window.speechSynthesis.speak(utterance); }
    catch (error) {
      if (gen !== this.gen) return;
      this._notice(`朗读失败：${error?.message || error}`);
      this._setState(STATE.ERROR);
    }
  }

  _restartCurrentSegment(reason) {
    const gen = ++this.gen;
    this._cancelSpeech();
    this._setState(STATE.PLAYING);
    this._notice(reason);
    this._speakCurrent(gen);
  }

  async _nextSection(gen) {
    if (gen !== this.gen) return;
    if (this.sleepStopAtChapterEnd) {
      this.stop({ notify: false });
      this._notice('定时关闭：本章已读完');
      return;
    }
    const sections = this.view.book?.sections || [];
    const current = this.currentSection;
    let next = -1;
    for (let i = current + 1; i < sections.length; i += 1) {
      if (sections[i].linear !== 'no') { next = i; break; }
    }
    if (next < 0) {
      this.state = STATE.COMPLETED;
      this.events.onState?.(STATE.COMPLETED);
      this.events.onSegment?.(null);
      this._notice('本书已听完');
      this._clearSleepTimer();
      void this._releaseWakeLock();
      this._setMediaPlaybackState('none');
      return;
    }
    await this._gotoSection(next, gen, 0);
  }

  async _gotoAdjacentSection(direction, gen) {
    const sections = this.view.book?.sections || [];
    const target = this.currentSection + direction;
    if (target < 0 || target >= sections.length || sections[target].linear === 'no') {
      this._notice('已经是本书开头');
      this._setState(STATE.PLAYING);
      this.cursor = 0;
      this._speakCurrent(gen);
      return;
    }
    await this._gotoSection(target, gen, Infinity);
  }

  async _gotoSection(index, gen, startSegment) {
    const newGen = ++this.gen;
    this._cancelSpeech();
    this._clearHighlight();
    try {
      const loaded = new Promise((resolve) => {
        const handler = () => { this.view.removeEventListener('load', handler); resolve(); };
        this.view.addEventListener('load', handler);
        setTimeout(resolve, 3000);
      });
      await this.view.goTo(index);
      await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, 3000))]);
      if (newGen !== this.gen) return;
      const doc = this._currentDoc();
      if (!doc) return;
      const blocks = getBlockRanges(doc);
      this.queue = [];
      for (const block of blocks) {
        for (const segment of segmentBlock(doc, block.range, this.view.language?.canonical || 'zh-CN')) {
          this.queue.push(segment);
        }
      }
      if (!this.queue.length) { void this._nextSection(newGen); return; }
      this.currentSection = index;
      this.cursor = startSegment === Infinity ? Math.max(0, this.queue.length - 1) : 0;
      this.events.onChapter?.(index);
      this._setState(STATE.PLAYING);
      this._speakCurrent(newGen);
    } catch (error) {
      if (newGen !== this.gen) return;
      this._notice(`切换章节失败：${error?.message || error}`);
      this._setState(STATE.ERROR);
    }
  }

  _highlight(range) {
    this._clearHighlight();
    try {
      const contents = this.view.renderer?.getContents?.()[0];
      if (contents?.overlayer) {
        const { Overlayer } = window.__ureadOverlayer || {};
        // overlayer 的 draw 函数可由静态导入注入；这里用简单的 class 兜底。
        if (typeof Overlayer === 'function') contents.overlayer.add(OVERLAY_KEY, range, Overlayer.highlight, { color: '#f59e0b' });
        else {
          let el = range.startContainer;
          if (el.nodeType !== 1) el = el.parentElement;
          el?.classList?.add('uread-speaking');
          this._lastHighlightEl = el;
        }
      }
      this._scrollTo(range);
    } catch { /* 高亮失败不影响朗读 */ }
  }

  _scrollTo(range) {
    try {
      this.internalNav += 1;
      void this.view.renderer?.scrollToAnchor?.(range, false);
      setTimeout(() => { this.internalNav = Math.max(0, this.internalNav - 1); }, 300);
    } catch { /* ignore */ }
  }

  _clearHighlight() {
    try {
      const contents = this.view.renderer?.getContents?.()[0];
      contents?.overlayer?.remove?.(OVERLAY_KEY);
    } catch { /* ignore */ }
    try { this._lastHighlightEl?.classList?.remove('uread-speaking'); } catch { /* ignore */ }
    this._lastHighlightEl = null;
  }

  setOverlayerClass(OverlayerClass) {
    window.__ureadOverlayer = { Overlayer: OverlayerClass };
  }

  _cancelSpeech() {
    if (this.utterance) {
      this.utterance.onstart = null;
      this.utterance.onend = null;
      this.utterance.onerror = null;
      this.utterance = null;
    }
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }

  _setState(state) { this.state = state; this.events.onState?.(state); }
  _notice(message) { this.events.onNotice?.(message); }

  _persist() {
    const now = Date.now();
    if (now - this.lastSavedAt < 1000) return;
    this.lastSavedAt = now;
    const segment = this.queue[this.cursor];
    try {
      localStorage.setItem(this.stateKey, JSON.stringify({
        version: 1,
        bookId: this.book.id,
        section: this.currentSection,
        cfi: this.view.lastLocation?.cfi ?? null,
        segmentIndex: this.cursor,
        segmentText: segment?.text?.slice(0, 120) ?? '',
        updatedAt: new Date().toISOString(),
      }));
    } catch { /* 隐私模式不写 */ }
  }

  _loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.settingsKey) || '{}');
      if (RATES.includes(Number(saved.rate))) this.rate = Number(saved.rate);
      if (typeof saved.voiceURI === 'string') this.voiceURI = saved.voiceURI;
      this.keepAwake = !!saved.keepAwake;
      if (saved.sleepMinutes === 'chapter') this.sleepStopAtChapterEnd = true;
      else if (Number(saved.sleepMinutes) > 0) this.sleepMinutes = Number(saved.sleepMinutes);
    } catch { /* ignore */ }
  }

  _saveSettings() {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify({
        rate: this.rate, voiceURI: this.voiceURI, keepAwake: this.keepAwake,
        sleepMinutes: this.sleepStopAtChapterEnd ? 'chapter' : this.sleepMinutes,
      }));
    } catch { /* ignore */ }
  }

  _startSleepTimer() {
    this._clearSleepTimer();
    if (this.sleepStopAtChapterEnd || !(this.sleepMinutes > 0)) return;
    this.sleepTimer = setTimeout(() => {
      if (this.state !== STATE.PLAYING && this.state !== STATE.PAUSED) return;
      this.stop({ notify: false });
      this._notice('定时关闭：朗读已停止');
    }, this.sleepMinutes * 60 * 1000);
  }

  _clearSleepTimer() { if (this.sleepTimer) clearTimeout(this.sleepTimer); this.sleepTimer = null; }

  async _requestWakeLock() {
    if (!this.keepAwake || !navigator.wakeLock?.request || this.wakeLock) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener?.('release', () => { this.wakeLock = null; });
    } catch { this.wakeLock = null; }
  }

  async _releaseWakeLock() {
    try { await this.wakeLock?.release?.(); } catch { /* ignore */ }
    this.wakeLock = null;
  }

  _handleVisibility() {
    if (document.visibilityState === 'visible' && this.keepAwake && this.state === STATE.PLAYING) void this._requestWakeLock();
  }

  _initMediaSession() {
    if (!navigator.mediaSession || this._mediaReady || typeof MediaMetadata === 'undefined') return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: this.book.title, artist: this.book.author || 'uRead', album: 'uRead 听书' });
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
      this._mediaReady = true;
    } catch { /* ignore */ }
  }

  _clearMediaSession() {
    if (!navigator.mediaSession || !this._mediaReady) return;
    for (const action of ['play', 'pause', 'stop', 'nexttrack', 'previoustrack']) {
      try { navigator.mediaSession.setActionHandler(action, null); } catch { /* ignore */ }
    }
    this._mediaReady = false;
  }

  _setMediaPlaybackState(value) {
    try { if (navigator.mediaSession) navigator.mediaSession.playbackState = value; } catch { /* ignore */ }
  }
}

export { STATE, RATES };
