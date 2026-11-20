export interface SpeechCapabilities {
  supported: boolean;
  chineseVoices: string[];
  allVoices: string[];
  boundaryEvents: boolean;
  canPause: boolean;
}

/** 能力检测必须保守：没有中文音色也算可用（设备可退化为任意音色），但要在 UI 里说明。 */
export function detectSpeechCapabilities(): SpeechCapabilities {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { supported: false, chineseVoices: [], allVoices: [], boundaryEvents: false, canPause: false };
  }
  const voices = typeof SpeechSynthesisUtterance !== 'undefined'
    ? window.speechSynthesis.getVoices().map((voice) => voice.name)
    : [];
  return {
    supported: true,
    chineseVoices: voices.filter((name) => /zh|cmn|Chinese|中文|普通话/i.test(name)),
    allVoices: voices,
    boundaryEvents: typeof SpeechSynthesisUtterance !== 'undefined' && 'onboundary' in SpeechSynthesisUtterance.prototype,
    canPause: typeof window.speechSynthesis.pause === 'function' && typeof window.speechSynthesis.resume === 'function',
  };
}
