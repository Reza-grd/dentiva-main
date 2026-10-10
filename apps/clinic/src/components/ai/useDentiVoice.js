import { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────
//  Suara Denti — memakai kemampuan bawaan browser (gratis, tanpa server):
//    useSpeech()    : bacakan jawaban (Web Speech API · speechSynthesis), suara bahasa Indonesia bila ada
//    useDictation() : bertanya lewat suara (SpeechRecognition, bahasa Indonesia)
//  Bila browser tidak mendukung, `supported` = false dan tombolnya tidak ditampilkan.
// ─────────────────────────────────────────────

/** Teks jawaban → kalimat yang enak dibacakan (tanpa Markdown/emoji; "Rp 12.400.000" → "12.400.000 rupiah"). */
export function speakable(text) {
  return String(text || '')
    .replace(/\|/g, ' ')
    .replace(/[*_`#>]/g, '')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/Rp\s?(\d[\d.,]*\d|\d)/g, '$1 rupiah')
    .replace(/(\d),(\d)/g, '$1 koma $2')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1500);
}

export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  const [speaking, setSpeaking] = useState(false);
  const onEndRef = useRef(null);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    onEndRef.current?.();
    onEndRef.current = null;
  }, [supported]);

  const speak = useCallback((text, { onStart, onEnd } = {}) => {
    if (!supported) return false;
    window.speechSynthesis?.cancel();
    const u = new window.SpeechSynthesisUtterance(speakable(text));
    const voices = window.speechSynthesis.getVoices?.() || [];
    const id = voices.find((v) => /^id(-|_|$)/i.test(v.lang));
    if (id) u.voice = id;
    u.lang = 'id-ID';
    u.rate = 1.03;
    u.pitch = 1.08;
    onEndRef.current = onEnd || null;
    u.onstart = () => { setSpeaking(true); onStart?.(); };
    const done = () => { setSpeaking(false); onEndRef.current?.(); onEndRef.current = null; };
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis?.speak(u);
    return true;
  }, [supported]);

  useEffect(() => () => { if (supported) window.speechSynthesis?.cancel(); }, [supported]);
  return { supported, speaking, speak, stop };
}

export function useDictation({ onInterim, onFinal } = {}) {
  const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const supported = Boolean(SR);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const cb = useRef({ onInterim, onFinal });
  cb.current = { onInterim, onFinal };

  const stop = useCallback(() => { recRef.current?.stop(); }, []);
  const start = useCallback(() => {
    if (!SR || recRef.current) return;
    const rec = new SR();
    rec.lang = 'id-ID';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const res = e.results[e.results.length - 1];
      const text = res[0].transcript.trim();
      if (res.isFinal) cb.current.onFinal?.(text);
      else cb.current.onInterim?.(text);
    };
    rec.onend = () => { recRef.current = null; setListening(false); };
    rec.onerror = () => { recRef.current = null; setListening(false); };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [SR]);

  useEffect(() => () => recRef.current?.abort?.(), []);
  return { supported, listening, start, stop };
}
