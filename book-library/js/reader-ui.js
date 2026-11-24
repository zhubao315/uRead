/**
 * uRead 静态书库 — 沉浸式阅读 + 听书播放器 UI。
 * 纯 DOM 操作，不依赖框架；只在 reader.html 中使用。
 */
import { RATES } from './book-speech.js';

const SETTINGS_KEY = 'uread:reader-settings';
const $ = (id) => document.getElementById(id);

export function setupReaderUI({ view, book, isEpub, controller }) {
  const root = document.documentElement;
  const stage = $('stage');
  const notice = $('notice-toast');
  let immersive = false;
  let hideTimer = null;
  let noticeTimer = null;
  let playerExpanded = false;

  const readSettings = () => {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
    catch { return {}; }
  };
  const settings = Object.assign({ fontSize: 18, lineHeight: 1.85, margin: 20, theme: 'auto', immersive: false }, readSettings());
  const saveSettings = () => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  };

  /* ---------- toast ---------- */
  const showNotice = (message) => {
    if (!notice) return;
    notice.textContent = message || '';
    notice.hidden = !message;
    clearTimeout(noticeTimer);
    if (message) noticeTimer = setTimeout(() => { notice.hidden = true; }, 3200);
  };

  /* ---------- reading typography & theme ---------- */
  const applyDocStyle = () => {
    const doc = controller?._currentDoc?.() || view?.renderer?.getContents?.()[0]?.doc;
    if (!doc) return;
    let style = doc.getElementById('uread-reading-style');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'uread-reading-style';
      (doc.head || doc.documentElement).append(style);
    }
    const dark = settings.theme === 'dark'
      || (settings.theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    style.textContent = `
      html, body { ${dark ? 'background:#0f172a !important;color:#e2e8f0 !important;' : ''} }
      p, li, blockquote, div, .calibre { font-size:${settings.fontSize}px !important; line-height:${settings.lineHeight} !important; }
      p, li { margin-block:${Math.round(settings.fontSize * 0.6)}px !important; }
      .uread-speaking { background:rgba(250,204,21,.32) !important; border-radius:3px; }
      ::highlight(uread-speaking) { background:rgba(250,204,21,.38); }
    `;
  };

  const applyTheme = () => {
    root.dataset.readerTheme = settings.theme;
    applyDocStyle();
  };

  const applyMargin = () => {
    if (!view?.renderer) return;
    view.renderer.setAttribute?.('margin', String(settings.margin));
    view.renderer.setAttribute?.('max-inline-size', String(720 - settings.margin * 4));
    applyDocStyle();
  };

  const changeFont = (delta) => {
    settings.fontSize = Math.max(14, Math.min(30, settings.fontSize + delta));
    saveSettings(); applyDocStyle(); showNotice(`字号 ${settings.fontSize}px`);
  };

  const changeLineHeight = (delta) => {
    settings.lineHeight = Math.max(1.4, Math.min(2.6, +(settings.lineHeight + delta).toFixed(2)));
    saveSettings(); applyDocStyle(); showNotice(`行距 ${settings.lineHeight}`);
  };

  /* ---------- immersive fullscreen ---------- */
  const setImmersive = (value) => {
    immersive = value;
    root.classList.toggle('reader-immersive', immersive);
    $('btn-immersive')?.setAttribute('aria-pressed', String(immersive));
    $('btn-immersive-exit')?.toggleAttribute('hidden', !immersive);
    if (immersive) {
      if (root.requestFullscreen && !document.fullscreenElement) {
        root.requestFullscreen().catch(() => { /* CSS 降级已经生效 */ });
      }
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    settings.immersive = immersive;
    saveSettings();
  };

  const toggleImmersive = () => setImmersive(!immersive);
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && immersive) {
      // 系统退出全屏时保留 CSS 沉浸模式，用户可点退出按钮恢复。
      root.classList.add('reader-immersive');
    }
  });

  /* ---------- toolbar auto-hide ---------- */
  const showControls = () => {
    root.classList.remove('reader-controls-hidden');
    clearTimeout(hideTimer);
    if (immersive) hideTimer = setTimeout(() => root.classList.add('reader-controls-hidden'), 3000);
  };
  const toggleControls = () => {
    const hidden = root.classList.toggle('reader-controls-hidden');
    if (!hidden) showControls();
  };
  ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach((event) => {
    document.addEventListener(event, showControls, { passive: true });
  });

  /* ---------- player ---------- */
  const setPlayerExpanded = (value) => {
    playerExpanded = value;
    $('player')?.classList?.toggle('expanded', value);
    $('player')?.setAttribute('aria-expanded', String(value));
  };

  const renderState = (state) => {
    const label = {
      idle: '听', loading: '准备中', playing: '正在朗读', paused: '继续',
      stopping: '停止中', completed: '已听完', error: '重试',
    }[state] || '听';
    const listen = $('btn-listen');
    if (listen) {
      listen.textContent = label;
      listen.dataset.state = state;
      listen.setAttribute('aria-label', label);
    }
    const playPause = $('btn-play-pause');
    if (playPause) playPause.textContent = state === 'playing' ? '⏸' : '▶';
    document.body.classList.toggle('is-listening', state === 'playing' || state === 'paused');
  };

  const renderSegment = (segment) => {
    const text = segment?.text || '';
    const meta = $('player-text');
    if (meta) meta.textContent = text ? (text.length > 120 ? `${text.slice(0, 120)}…` : text) : '点击「听」从当前阅读位置开始';
    const count = $('player-progress');
    if (count && controller) {
      const total = controller.getQueue().length;
      count.textContent = total ? `${controller.getCursor() + 1} / ${total}` : '';
    }
  };

  const renderVoices = (caps) => {
    const select = $('voice-select');
    if (!select) return;
    const voices = [...(caps.chineseVoices || []), ...(caps.voices || []).filter((v) => !(caps.chineseVoices || []).includes(v))];
    select.replaceChildren();
    if (!voices.length) {
      const option = document.createElement('option');
      option.textContent = '系统默认声音';
      option.value = '';
      select.append(option);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = caps.chineseVoices?.length ? '选择中文音色' : '无中文音色 · 使用系统默认';
    select.append(placeholder);
    for (const voice of voices) {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      option.textContent = `${voice.name}（${voice.lang}）`;
      if (controller && voice.voiceURI === controller.voiceURI) option.selected = true;
      select.append(option);
    }
  };

  /* ---------- wiring ---------- */
  $('btn-immersive')?.addEventListener('click', toggleImmersive);
  $('btn-immersive-exit')?.addEventListener('click', () => setImmersive(false));
  $('btn-listen')?.addEventListener('click', () => { setPlayerExpanded(true); controller.toggle(); });
  $('btn-immersive-listen')?.addEventListener('click', () => { setPlayerExpanded(true); controller.toggle(); });
  $('btn-play-pause')?.addEventListener('click', () => controller.toggle());
  $('btn-prev')?.addEventListener('click', () => controller.prev());
  $('btn-next')?.addEventListener('click', () => controller.next());
  $('btn-stop')?.addEventListener('click', () => { controller.stop(); setPlayerExpanded(false); });
  $('btn-close-player')?.addEventListener('click', () => setPlayerExpanded(false));
  $('player-mini')?.addEventListener('click', () => setPlayerExpanded(true));
  $('btn-font-down')?.addEventListener('click', () => changeFont(-1));
  $('btn-font-up')?.addEventListener('click', () => changeFont(1));
  $('btn-line-down')?.addEventListener('click', () => changeLineHeight(-0.1));
  $('btn-line-up')?.addEventListener('click', () => changeLineHeight(0.1));
  $('btn-theme')?.addEventListener('click', () => {
    const order = ['auto', 'light', 'dark'];
    settings.theme = order[(order.indexOf(settings.theme) + 1) % order.length];
    saveSettings(); applyTheme(); showNotice(`主题：${settings.theme}`);
  });
  $('btn-margin')?.addEventListener('click', () => {
    settings.margin = settings.margin >= 40 ? 0 : settings.margin + 10;
    saveSettings(); applyMargin(); showNotice(`页边距 ${settings.margin}px`);
  });

  const rateSelect = $('rate-select');
  if (rateSelect) {
    for (const rate of RATES) {
      const option = document.createElement('option');
      option.value = String(rate);
      option.textContent = `${rate.toFixed(2).replace(/0$/, '')}×`;
      if (rate === controller.rate) option.selected = true;
      rateSelect.append(option);
    }
    rateSelect.addEventListener('change', () => controller.setRate(Number(rateSelect.value)));
  }
  const voiceSelect = $('voice-select');
  voiceSelect?.addEventListener('change', () => controller.setVoice(voiceSelect.value));
  const sleepSelect = $('sleep-select');
  sleepSelect?.addEventListener('change', () => controller.setSleepTimer(sleepSelect.value));
  const wakeToggle = $('wake-toggle');
  if (wakeToggle) {
    wakeToggle.checked = controller.keepAwake;
    wakeToggle.addEventListener('change', () => controller.setKeepAwake(wakeToggle.checked));
  }

  // 点击中央显示/隐藏工具栏；左右边缘翻页，避免与选区冲突。
  stage?.addEventListener('click', (event) => {
    if (!immersive) return;
    const selection = view?.renderer?.getContents?.()[0]?.doc?.getSelection?.();
    if (selection && !selection.isCollapsed) return;
    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < rect.width * 0.2) view.renderer?.prev?.();
    else if (x > rect.width * 0.8) view.renderer?.next?.();
    else toggleControls();
  });

  // 用户主动翻页/跳目录时停止过期朗读。
  $('prev')?.addEventListener('click', () => controller.onUserNavigate());
  $('next')?.addEventListener('click', () => controller.onUserNavigate());
  $('toc')?.addEventListener('change', () => controller.onUserNavigate());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && immersive) setImmersive(false);
  });

  applyTheme();
  applyMargin();
  renderState(controller.getState());
  renderSegment(null);
  renderVoices(controller.getCapabilities());
  window.addEventListener('uread:speech-state', (event) => renderState(event.detail));
  window.addEventListener('uread:speech-segment', (event) => renderSegment(event.detail));
  window.addEventListener('uread:speech-caps', (event) => renderVoices(event.detail));
  view?.addEventListener?.('load', () => { applyDocStyle(); });
  if (settings.immersive) setImmersive(true);

  return { showNotice, setImmersive, renderState, renderSegment, renderVoices, applyDocStyle };
}
