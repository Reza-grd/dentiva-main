import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { X, Send, ArrowRight, RotateCcw } from 'lucide-react';
import AgentActions from './AgentActions';
import { aiService } from '../../services/aiService';
import { useToast } from '../common/ToastNotification';
import DentiMascot, { useDentiDirector, DENTI_DURATIONS } from '../mascot/DentiMascot';
import { miniMarkdown } from '../../utils/miniMarkdown';
import { smallTalk, followUps } from '../../utils/dentiMood';
import { chatContext } from '../../utils/dentiChatContext';
import { pageHints } from '../../utils/dentiPageHints';
import { getGreeting } from '../../utils/dateUtils';
import { namaPanggilan } from '../../utils/stringUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { mulaiTur } from '../tour/EiraTour';
import './ai-assistant.css';
import './denti-widget.css';

/**
 * Eira — pendamping mengambang di SEMUA halaman untuk semua peran.
 * 1. Otak lokal lebih dulu (instan, tanpa kuota): membuka halaman/tab, "di mana …", tutorial, istilah, checklist, tur.
 * 2. Admin dengan Asisten AI aktif: pertanyaan yang tidak dikuasai otak lokal (data klinik, analisis, permintaan tindakan)
 *    langsung dijawab AI di sini — jawaban bertahap + kartu usulan yang dijalankan setelah disetujui.
 *    Dokter & resepsionis tetap memakai otak lokal (server hanya mengizinkan Asisten AI untuk admin).
 */
const STORE_KEY = 'dentiva-denti-widget';
const MAX_KEEP = 30;
const MAX_LEN = 300;
// "mulai tur", "ulangi perkenalan", "tur pengenalan" … → buka tur pengenalan Eira
const MINTA_TUR = /^(tolong |coba |aku mau |saya mau )?((mulai|ulangi|ulang|buka|tampilkan|ikuti|lihat)( lagi)? )?(tur|tour|perkenalan|pengenalan)( pengenalan| aplikasi| dentiva| lagi)*[.!?]*$/i;

const HINTS = {
  admin: ['Briefing hari ini', 'Bahan apa yang perlu dipesan?', 'Tindakan mana yang margin-nya tipis?', 'Checklist harian', 'Apa itu HPP?'],
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
const firstName = (profile) => namaPanggilan(profile?.full_name);

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
  const [draft, setDraft] = useState(''); // jawaban AI yang sedang mengalir
  const [ai, setAi] = useState(null); // status Asisten AI (admin): { aktif, tersedia_di_paket, kuota_bulanan, terpakai_bulan_ini }
  const toast = useToast();
  const isAdmin = role === 'admin';
  const aiSiap = Boolean(isAdmin && ai?.aktif && ai?.tersedia_di_paket && ai.terpakai_bulan_ini < ai.kuota_bulanan);
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
  useEffect(() => { if (draft) endRef.current?.scrollIntoView?.({ block: 'end' }); }, [draft]);
  // Status Asisten AI dibaca sekali saat panel dibuka (tanpa memakai kuota)
  useEffect(() => {
    if (!open || !isAdmin || ai) return;
    aiService.getStatus().then((r) => setAi(r.success ? r.data : { aktif: false, gagal: r.error }));
  }, [open, isAdmin, ai]);
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
    content: isAdmin
      ? `${getGreeting()}${name ? `, ${name}` : ''}! 👋 Saya **Eira**. Di halaman mana pun, Anda bisa menanyakan **data klinik** (pendapatan, stok, margin, piutang), meminta **briefing**, atau meminta saya **menyiapkan tindakan** yang baru dijalankan setelah Anda setujui. Saya juga bisa membuka halaman dan mengajarkan fitur. 👇`
      : `${getGreeting()}${name ? `, ${name}` : ''}! 👋 Saya **Eira**, pemandu Dentiva: bisa membuka halaman, mengajarkan cara memakai fitur, menjelaskan istilah, dan memberi checklist harian. Coba salah satu tombol di bawah, atau ketik bebas. 👇`,
  }), [name, isAdmin]);

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
    if (MINTA_TUR.test(text)) {
      setMessages((m) => [...m, { role: 'user', content: text, local: true },
        { role: 'assistant', local: true, intent: 'tur', fresh: true, content: 'Baik, saya mulai **tur pengenalan** sekarang. Anda bisa melewatinya kapan saja.' }]);
      play('bow', DENTI_DURATIONS.bow);
      later(() => { setOpen(false); mulaiTur(); }, 900);
      return;
    }
    const ctx = chatContext(messages);
    const chat = smallTalk(text, { name, greeting: getGreeting(), seed: messages.length, now: new Date(), role, ...ctx });
    // Tidak dikuasai otak lokal → admin dengan AI aktif dijawab Asisten AI langsung di sini
    if (!chat && aiSiap) { tanyaAi(text); return; }
    setMessages((m) => [...m, { role: 'user', content: text, local: true }]);
    setTyping(true);
    const reply = chat?.reply || '';
    later(() => {
      setTyping(false);
      if (!chat) {
        const content = role === 'admin'
          ? (ai && !ai.tersedia_di_paket
            ? 'Pertanyaan data klinik dijawab oleh **Asisten AI**, yang tersedia di paket **Pro** dan **Enterprise**. Sementara itu saya bisa membantu soal menu, tutorial, dan istilah. 👇'
            : ai && ai.aktif && ai.terpakai_bulan_ini >= ai.kuota_bulanan
              ? 'Kuota **Asisten AI** bulan ini sudah habis, jadi pertanyaan data klinik belum bisa saya jawab. Saya tetap bisa membantu soal menu, tutorial, dan istilah. 👇'
              : 'Itu pertanyaan **data klinik**. Agar saya bisa menjawabnya di halaman mana pun, **aktifkan Asisten AI** sekali di halamannya. 🤔')
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

  const setActions = (idx, next) => setMessages((list) => list.map((m, i) => (i === idx ? { ...m, actions: next } : m)));

  /** Tanya Asisten AI dari widget: jawaban mengalir bertahap; usulan tampil sebagai kartu Setujui/Tolak. */
  const tanyaAi = async (text) => {
    const history = messages.filter((m) => !m.local && !m.error && m.content).map(({ role: r, content }) => ({ role: r, content }));
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setTyping(true);
    play('think', 3200);
    const res = await aiService.ask(text, history, {
      onDelta: (t) => { setTyping(false); setDraft((d) => d + t); },
      onReset: () => setDraft(''),
    });
    setDraft('');
    setTyping(false);
    if (res.success) {
      const d = res.data;
      if (d.status) setAi(d.status);
      const actions = (d.actions || []).map((a) => ({ ...a, state: 'pending', at: Date.now(), error: '' }));
      setMessages((m) => [...m, { role: 'assistant', content: d.answer, ai: true, actions, fresh: true }]);
      play(actions.length ? 'point' : 'nod', 2400);
    } else {
      setMessages((m) => [...m, { role: 'assistant', content: res.error || 'Asisten AI belum dapat dihubungi. Coba lagi sebentar.', error: true }]);
      play('sorry', DENTI_DURATIONS.sorry ?? 2400);
      setAi(null); // baca ulang status (mis. kuota) saat pertanyaan berikutnya
    }
  };

  const openAi = (text) => {
    navigate('/admin/asisten-ai', { state: { ask: text } });
    setOpen(false);
  };

  // Halaman Asisten AI sudah punya Eira sendiri.
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
        <section className={`denti-widget__panel${isAdmin ? ' denti-widget__panel--ai' : ''}`} role="dialog" aria-label="Eira, asisten Dentiva">
          <header className="denti-widget__head">
            <DentiMascot state={denti.state} size={64} track title="Eira, pemandu Dentiva" />
            <div className="denti-widget__title">
              <strong>Eira</strong>
              <span>{aiSiap ? `Asisten klinik · AI ${ai.terpakai_bulan_ini}/${ai.kuota_bulanan} bulan ini` : 'Pemandu Dentiva'}</span>
            </div>
            <button type="button" className="denti-widget__icon" onClick={() => setMessages([welcome()])} aria-label="Mulai percakapan baru" title="Mulai baru"><RotateCcw size={15} /></button>
            <button type="button" className="denti-widget__icon" onClick={() => setOpen(false)} aria-label="Tutup Eira"><X size={17} /></button>
          </header>

          <div className="denti-widget__list" aria-live="polite">
            {messages.map((m, i) => (
              m.role === 'user'
                ? <div key={i} className="denti-widget__row denti-widget__row--me"><p>{m.content}</p></div>
                : (
                  <div key={i} className="denti-widget__row">
                    <Bubble text={m.content} />
                    {m.actions?.length > 0 && (
                      <div className="denti-widget__actions">
                        <AgentActions
                          actions={m.actions}
                          onChange={(next) => setActions(i, next)}
                          onApplied={(applied) => toast.success(applied.length > 1 ? `${applied.length} tindakan dijalankan.` : 'Tindakan dijalankan.')}
                        />
                      </div>
                    )}
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
            {draft && <div className="denti-widget__row"><Bubble text={draft} /></div>}
            {typing && !draft && <div className="denti-widget__row"><span className="ai-dots" aria-label="Eira sedang mengetik"><span /><span /><span /></span></div>}
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
              placeholder="Tanya Eira: “buka jadwal”, “apa itu recall?”…" aria-label="Tulis pesan untuk Eira"
            />
            <button type="submit" disabled={!input.trim() || typing} aria-label="Kirim"><Send size={16} /></button>
          </form>
        </section>
      )}

      <button type="button" className="denti-widget__launch" onClick={toggle} aria-label={open ? 'Tutup Eira' : 'Buka Eira, pemandu Dentiva'} aria-expanded={open}>
        <DentiMascot state={open ? 'happy' : 'idle'} size={58} title="Eira" />
      </button>
    </div>
  );
}
