import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { X, Send, ArrowRight, RotateCcw } from 'lucide-react';
import DentiMascot, { useDentiDirector, DENTI_DURATIONS } from '../mascot/DentiMascot';
import { miniMarkdown } from '../../utils/miniMarkdown';
import { smallTalk, followUps } from '../../utils/dentiMood';
import { chatContext } from '../../utils/dentiChatContext';
import { pageHints } from '../../utils/dentiPageHints';
import { getGreeting } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import './ai-assistant.css';
import './denti-widget.css';

/**
 * Denti Pemandu — pendamping mengambang untuk SEMUA peran (admin, dokter, resepsionis).
 * Hanya memakai otak lokal Denti (tanpa AI, tanpa kuota): membuka halaman/tab, "di mana …", tutorial langkah demi langkah,
 * kamus istilah, checklist harian, kuis, dan hiburan. Pertanyaan data klinik diarahkan ke Asisten AI (khusus admin).
 */
const STORE_KEY = 'dentiva-denti-widget';
const MAX_KEEP = 30;
const MAX_LEN = 300;

const HINTS = {
  admin: ['Checklist harian', 'Ajarkan cara mengatur template pengingat', 'Apa itu HPP?', 'Buka laporan'],
  dokter: ['Checklist harian', 'Ajarkan cara mengisi rekam medis', 'Apa itu odontogram?', 'Buka jadwal hari ini'],
  resepsionis: ['Checklist harian', 'Ajarkan cara memproses booking', 'Apa itu recall?', 'Buka layar antrean'],
};
const EXTRA_IDLE_MOVES = [['wink', 1500], ['stretch', 2800], ['coffee', 3000], ['cool', 2600], ['dreamy', 3600], ['giggle', 2400], ['curious', 2800], ['yawn', 3000]];

const loadChat = () => {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
};
const saveChat = (msgs) => {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-MAX_KEEP).map(({ fresh, ...m }) => m))); } catch { /* penyimpanan penuh/dimatikan */ }
};
const firstName = (profile) => {
  const n = (profile?.full_name || '').trim().split(/\s+/)[0] || '';
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
};

function Bubble({ text }) {
  const html = DOMPurify.sanitize(miniMarkdown(text));
  return <div className="ai-md denti-widget__md" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function DentiGuideWidget() {
  const { userProfile } = useAuth();
  const role = userProfile?.role || 'admin';
  const name = firstName(userProfile);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const denti = useDentiDirector('idle');
  const { play } = denti;
  const timers = useRef([]);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => { saveChat(messages); }, [messages]);
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }); }, [messages, typing, open]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Sesekali bergerak sendiri saat panel terbuka dan dibiarkan
  const idleRef = useRef(0);
  useEffect(() => {
    if (!open) return undefined;
    const t = setInterval(() => {
      if (Date.now() - idleRef.current < 12000 || typing || Math.random() < 0.5) return;
      const [move, ms] = EXTRA_IDLE_MOVES[Math.floor(Math.random() * EXTRA_IDLE_MOVES.length)];
      play(move, ms);
    }, 9000);
    return () => clearInterval(t);
  }, [open, typing, play]);

  const welcome = useCallback(() => ({
    role: 'assistant', local: true, intent: 'welcome', fresh: true,
    content: `${getGreeting()}${name ? `, ${name}` : ''}! 👋 Saya **Denti**, pemandu Dentiva: bisa membuka halaman, mengajarkan cara memakai fitur, menjelaskan istilah, dan memberi checklist harian. Coba salah satu tombol di bawah, atau ketik bebas. 👇`,
  }), [name]);

  const toggle = () => {
    setOpen((v) => !v);
    idleRef.current = Date.now();
    if (!open) {
      setMessages((m) => (m.length ? m : [welcome()]));
      play('wave', 1800);
    }
  };

  const ask = (raw) => {
    const text = String(raw ?? input).trim().slice(0, MAX_LEN);
    if (!text || typing) return;
    idleRef.current = Date.now();
    setInput('');
    const ctx = chatContext(messages);
    const chat = smallTalk(text, { name, greeting: getGreeting(), seed: messages.length, now: new Date(), role, ...ctx });
    setMessages((m) => [...m, { role: 'user', content: text, local: true }]);
    setTyping(true);
    const reply = chat?.reply || '';
    later(() => {
      setTyping(false);
      if (!chat) {
        const content = role === 'admin'
          ? 'Hmm, itu sepertinya **pertanyaan data klinik** — paling tepat ditanyakan ke **Asisten AI**. Atau coba perintah yang saya kuasai di bawah. 🤔'
          : 'Hmm, saya belum paham maksudnya. 🤔 Saya paling pandai soal **cara memakai Dentiva**: menu, tutorial langkah demi langkah, istilah, dan checklist harian. Coba salah satu di bawah.';
        setMessages((m) => [...m, {
          role: 'assistant', local: true, intent: 'unknown', content,
          action: role === 'admin' ? { type: 'askAi', text } : null,
        }]);
        play('confused', DENTI_DURATIONS.confused);
        return;
      }
      const action = chat.action || null;
      if (action?.type === 'clear') { setMessages([welcome()]); play(chat.state, DENTI_DURATIONS[chat.state] ?? 2400); return; }
      setMessages((m) => [...m, { role: 'assistant', content: chat.reply, local: true, intent: chat.intent, action, fresh: true }]);
      if (action?.type === 'showoff') {
        denti.sequence(action.seq.map((st) => (Array.isArray(st) ? st : [st])));
      } else {
        play(chat.state, DENTI_DURATIONS[chat.state] ? undefined : 3200);
      }
      if (action?.type === 'navigate') later(() => { navigate(action.to); if (window.innerWidth < 768) setOpen(false); }, 800);
      if (action?.type === 'back') later(() => navigate(-1), 800);
      if (action?.type === 'forward') later(() => navigate(1), 800);
      if (action?.type === 'reload') later(() => window.location.reload(), 1000);
      if (action?.type === 'theme') theme?.setThemeMode?.(action.mode);
    }, Math.min(500, 180 + reply.length * 1.1));
  };

  const openAi = (text) => {
    navigate('/admin/asisten-ai', { state: { ask: text } });
    setOpen(false);
  };

  // Halaman Asisten AI sudah punya Denti sendiri.
  if (location.pathname.startsWith('/admin/asisten-ai')) return null;

  const last = messages[messages.length - 1];
  // Sapaan & "belum paham": saran menyesuaikan halaman yang sedang dibuka, lalu saran bawaan per peran
  const hintsNow = [...pageHints(location.pathname, 2), ...(HINTS[role] || HINTS.admin)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
  const chips = last?.role === 'assistant' && !typing
    ? (['welcome', 'unknown'].includes(last.intent) ? hintsNow : (last.local && last.intent ? followUps(last.intent) : []))
    : [];

  return (
    <div className="denti-widget print:hidden" data-open={open}>
      {open && (
        <section className="denti-widget__panel" role="dialog" aria-label="Denti, pemandu Dentiva">
          <header className="denti-widget__head">
            <DentiMascot state={denti.state} size={64} track title="Denti, pemandu Dentiva" />
            <div className="denti-widget__title">
              <strong>Denti</strong>
              <span>Pemandu Dentiva · tanpa kuota</span>
            </div>
            <button type="button" className="denti-widget__icon" onClick={() => setMessages([welcome()])} aria-label="Mulai percakapan baru" title="Mulai baru"><RotateCcw size={15} /></button>
            <button type="button" className="denti-widget__icon" onClick={() => setOpen(false)} aria-label="Tutup Denti"><X size={17} /></button>
          </header>

          <div className="denti-widget__list" aria-live="polite">
            {messages.map((m, i) => (
              m.role === 'user'
                ? <div key={i} className="denti-widget__row denti-widget__row--me"><p>{m.content}</p></div>
                : (
                  <div key={i} className="denti-widget__row">
                    <Bubble text={m.content} />
                    {(m.action?.type === 'navigate' || m.action?.type === 'offer') && (
                      <button type="button" className="ai-chip ai-chip--action" onClick={() => { navigate(m.action.to); if (window.innerWidth < 768) setOpen(false); }}>
                        Buka {m.action.label} <ArrowRight size={13} />
                      </button>
                    )}
                    {m.action?.type === 'askAi' && (
                      <button type="button" className="ai-chip ai-chip--action" onClick={() => openAi(m.action.text)}>
                        Tanya Asisten AI <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                )
            ))}
            {typing && <div className="denti-widget__row"><span className="ai-dots" aria-label="Denti sedang mengetik"><span /><span /><span /></span></div>}
            {chips.length > 0 && (
              <div className="denti-widget__chips" aria-label="Saran">
                {chips.map((c) => <button key={c} type="button" className="ai-chip" onClick={() => ask(c)}>{c}</button>)}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="denti-widget__form" onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <input
              ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={MAX_LEN}
              placeholder="Tanya Denti: “buka jadwal”, “apa itu recall?”…" aria-label="Tulis pesan untuk Denti"
            />
            <button type="submit" disabled={!input.trim() || typing} aria-label="Kirim"><Send size={16} /></button>
          </form>
        </section>
      )}

      <button type="button" className="denti-widget__launch" onClick={toggle} aria-label={open ? 'Tutup Denti' : 'Buka Denti, pemandu Dentiva'} aria-expanded={open}>
        <DentiMascot state={open ? 'happy' : 'idle'} size={58} title="Denti" />
      </button>
    </div>
  );
}
