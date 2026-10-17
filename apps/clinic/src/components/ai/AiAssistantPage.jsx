import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  Sparkles, Send, RotateCcw, ShieldCheck, Lock, Database, Power, AlertTriangle, BookCheck, Zap, ArrowRight, Volume2, Square, Copy, Mic, MicOff, Camera,
} from 'lucide-react';
import AnswerFeedback from './AnswerFeedback';
import KnowledgePanel from './KnowledgePanel';
import AgentActions from './AgentActions';
import { Card, CardContent, Button, Badge } from '@dentiva/ui';
import { aiService } from '../../services/aiService';
import { miniMarkdown } from '../../utils/miniMarkdown';
import { resizeImageToJpeg } from '../../utils/imageResize';
import { notaMessage } from '../../utils/notaMessage';
import { providerNotice } from '../../utils/aiProvider';
import { useToast } from '../common/ToastNotification';
import { useAuth } from '../../contexts/AuthContext';
import { getGreeting } from '../../utils/dateUtils';
import { useDentiDirector, DENTI_DURATIONS } from '../mascot/DentiMascot';
import DentiCompanion from './DentiCompanion';
import { useSpeech, useDictation } from './useDentiVoice';
import { useTheme } from '../../contexts/ThemeContext';
import { smallTalk, topicOf, moodForAnswer, POKE_REACTIONS, greetLine, followUps, lineForQuestion } from '../../utils/dentiMood';
import './ai-assistant.css';

const SUGGESTION_GROUPS = [
  { label: 'Keuangan', items: [
    'Berapa pendapatan bulan ini dibanding bulan lalu?',
    'Tindakan apa yang paling menguntungkan dalam 3 bulan terakhir?',
    'Bandingkan pendapatan dan pengeluaran bulan ini.',
    'Ada kunjungan selesai yang belum dibayar?',
  ] },
  { label: 'Perencanaan', items: [
    'Kalau harga scaling naik 10%, berapa dampaknya per bulan?',
    'Berapa titik impas (BEP) klinik per bulan?',
    'Proyeksikan arus kas 3 bulan ke depan.',
  ] },
  { label: 'Panduan Dentiva', items: [
    'Bagaimana cara membuat tautan layar antrean TV di menu Layar Antrean?',
    'Bagaimana cara mengaktifkan booking online untuk pasien?',
    'Apa saja yang perlu diisi agar HPP dan margin tindakan terhitung?',
  ] },
  { label: 'Eira Agen (bisa bertindak)', items: [
    'Briefing hari ini: apa yang perlu saya urus?',
    'Catat pengeluaran listrik bulan ini Rp 1.250.000',
    'Bahan apa yang perlu dipesan ulang? Buatkan draf pesan ke pemasoknya.',
    'Bahan apa yang sudah kadaluarsa dan berapa nilainya?',
    'Tindakan mana yang margin-nya tipis atau rugi?',
    'Ada pengeluaran yang janggal bulan ini?',
    'Tambahkan bahan baru: sarung tangan nitril M, satuan pcs, stok awal 100, harga 2000, stok minimum 20',
    'Naikkan harga semua tindakan 5%, dibulatkan ke 5.000',
    'Atur biaya overhead sewa ruko Rp 8.000.000 per bulan',
  ] },
  { label: 'Manajemen', items: [
    'Ringkas kondisi klinik hari ini.',
    'Beri saran jadwal dokter berdasarkan pola kunjungan.',
    'Berapa pasien yang perlu di-recall?',
    'Bahan apa yang stoknya menipis atau hampir kadaluarsa?',
  ] },
];
const TOOL_LABEL = {
  ringkasan_pendapatan: 'Pendapatan',
  kinerja_tindakan: 'Tindakan & HPP',
  pengeluaran_dan_laba: 'Pengeluaran',
  kinerja_dokter: 'Kinerja dokter',
  statistik_kunjungan: 'Kunjungan',
  peringatan_stok: 'Stok bahan',
  kunjungan_belum_dibayar: 'Belum dibayar',
  simulasi_harga: 'Simulasi harga',
  titik_impas: 'BEP',
  proyeksi_arus_kas: 'Arus kas',
  ringkasan_hari_ini: 'Hari ini',
  beban_jadwal_dokter: 'Jadwal dokter',
  statistik_recall: 'Recall',
  cari_bahan: 'Cari bahan',
  kartu_stok: 'Kartu stok',
  saran_pemesanan: 'Saran pemesanan',
  cari_pengeluaran: 'Cari pengeluaran',
  daftar_overhead: 'Overhead',
  cari_tindakan: 'Cari tindakan',
  resep_tindakan: 'Resep bahan',
  riwayat_agen: 'Riwayat agen',
  ringkasan_gudang: 'Gudang',
  bahan_kadaluarsa: 'Kadaluarsa',
  riwayat_harga_bahan: 'Harga pemasok',
  analisis_margin: 'Margin tindakan',
  anomali_pengeluaran: 'Anomali biaya',
  draf_pesan_pemasok: 'Draf pesan pemasok',
};
/** Bank saran saat mengetik (dicocokkan per kata). */
const SUGGEST_BANK = [
  ...SUGGESTION_GROUPS.flatMap((g) => g.items),
  'Hitung diskon 10% dari 500rb', '6 bulan lagi tanggal berapa?', 'Buka jadwal dokter', 'Terbilang 1.250.000',
  'Harga 350rb modal 120rb, untung berapa?', 'Dari 10 juta jadi 12 juta naik berapa persen?', 'Berapa hari lagi akhir bulan?',
  'Biaya tetap 30 juta margin 150rb, BEP berapa pasien?', 'Kasih tips gigi', 'Bacakan jawabannya', 'Ganti mode gelap',
  'Buka layar antrean', 'Kamu bisa apa saja?',
];
/** Ajakan singkat di gelembung Eira saat dibiarkan — memperkenalkan kemampuan tanpa mengganggu. */
const IDLE_NUDGES = [
  'Bosan? Ketik "kuis" untuk menguji pengetahuan gigi 🎯', 'Ketik "tahukah kamu" — saya punya fakta gigi seru 🦷', 'Mau lihat atraksi? Ketik "semua gerakan" 🎭',
  'Bingung mulai dari mana? Ketik "checklist harian" 📋', 'Istilah baru? Tanya "apa itu odontogram?" 📖', 'Ketik "ajarkan cara …" — saya pandu langkah demi langkah 🧭',
  'Saya bisa membuka halaman: coba "buka laporan" ✨', 'Butuh jeda? Ketik "ngopi" ☕', 'Main suit yuk? Ketik "main suit" ✊✌️✋', 'Bingung memutuskan? Ketik "lempar koin" 🪙',
];
/** Gerakan kecil saat Eira dibiarkan (agar terasa hidup). */
const IDLE_MOVES = [
  ['think', 1800], ['happy', 1600], ['nod', 1800], ['wave', 1600], ['wink', 1500], ['peek', 2400], ['sigh', 2300],
  ['shrug', 1900], ['idea', 2400], ['jump', 1600], ['cool', 2600], ['salute', 2000], ['stretch', 2800], ['search', 3000], ['coffee', 3000],
  ['dreamy', 3600], ['yawn', 3000], ['giggle', 2400], ['curious', 2800], ['listen', 3000], ['smug', 2800],
];
const MAX_LEN = 1000;
/** Tanpa aktivitas selama ini → Eira tertidur (bangun lagi saat pengguna mengetik/bertanya). */
const DOZE_AFTER_MS = 2 * 60 * 1000;
const STORE_KEY = 'dentiva-ai-chat';

const loadChat = () => {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
};
const saveChat = (msgs) => {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-40).map(({ fresh, ...m }) => m))); } catch { /* abaikan */ }
};
/** Nama panggilan pilihan pengguna ("panggil aku …") — kenyamanan per perangkat. */
const NICK_KEY = 'dentiva-denti-nickname';
const loadNick = () => { try { return localStorage.getItem(NICK_KEY) || ''; } catch { return ''; } };
const saveNick = (n) => { try { localStorage.setItem(NICK_KEY, n); } catch { /* abaikan */ } };
/** Kalimat pendek untuk gelembung Eira (baris pertama, tanpa format Markdown). */
const bubble = (text) => {
  const plain = String(text || '').replace(/[*_`]/g, '').split('\n').find((l) => l.trim()) || '';
  return plain.length > 110 ? `${plain.slice(0, 107).trimEnd()}…` : plain;
};

/** Isi jawaban. `fresh` → baris muncul bertahap seperti sedang diketik (maks. ±0,7 detik). */
function Answer({ text, fresh = false }) {
  const ref = useRef(null);
  const html = DOMPurify.sanitize(miniMarkdown(text));
  useEffect(() => {
    if (!fresh || !ref.current) return;
    [...ref.current.children].forEach((el, i) => { el.style.animationDelay = `${Math.min(i * 70, 700)}ms`; });
  }, [fresh, html]);
  return <div ref={ref} className={`ai-md ${fresh ? 'ai-md--stream' : ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

const firstName = (profile) => {
  const n = (profile?.full_name || '').trim().split(/\s+/)[0] || '';
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
};

export default function AiAssistantPage() {
  const toast = useToast();
  const { userProfile } = useAuth();
  const [nick, setNick] = useState(loadNick);
  const name = nick || firstName(userProfile);
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [provider, setProvider] = useState(null);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [knowledgeKey, setKnowledgeKey] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const pendingAsk = useRef(location.state?.ask || '');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Eira: pendamping yang bereaksi (aturan lokal, tanpa kuota AI) ───
  const [dentiLine, setDentiLine] = useState('');
  const [typing, setTyping] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  const [dozing, setDozing] = useState(false);
  const lastActive = useRef(Date.now());
  const pokes = useRef(0);
  const dentiBase = busy ? 'scan' : dozing ? 'sleep' : input.trim() ? 'happy' : 'idle';
  const denti = useDentiDirector(dentiBase);
  const { play, settle } = denti;
  const [burst, setBurst] = useState(0);
  const react = useCallback((state, line, ms) => {
    play(state, ms);
    if (line) setDentiLine(line);
    if (state === 'celebrate' || state === 'clap') setBurst((b) => b + 1);
  }, [play]);
  const theme = useTheme();
  const busyRef = useRef(false);
  busyRef.current = busy;
  const stateRef = useRef('idle');
  stateRef.current = denti.state;
  const [inputFocus, setInputFocus] = useState(false);

  /** Tandai ada aktivitas; bangunkan Eira bila sedang tidur. */
  const dozingRef = useRef(false);
  const touch = useCallback(() => {
    lastActive.current = Date.now();
    if (!dozingRef.current) return;
    dozingRef.current = false;
    setDozing(false);
    react('wave', 'Oh, saya di sini! Ada yang bisa dibantu?', 2500);
  }, [react]);

  useEffect(() => {
    const t = setInterval(() => {
      if (dozingRef.current || Date.now() - lastActive.current < DOZE_AFTER_MS) return;
      dozingRef.current = true;
      setDozing(true);
      setDentiLine('Zzz… ketik apa saja untuk membangunkan saya.');
    }, 15000);
    return () => clearInterval(t);
  }, []);

  // Sesekali bergerak sendiri saat dibiarkan (berpikir, mengangguk, melambai)
  useEffect(() => {
    const t = setInterval(() => {
      if (busyRef.current || dozingRef.current || stateRef.current !== 'idle') return;
      if (Date.now() - lastActive.current < 12000 || Math.random() < 0.45) return;
      const [move, ms] = IDLE_MOVES[Math.floor(Math.random() * IDLE_MOVES.length)];
      play(move, ms);
      if (Math.random() < 0.35) setDentiLine(IDLE_NUDGES[Math.floor(Math.random() * IDLE_NUDGES.length)]);
    }, 9000);
    return () => clearInterval(t);
  }, [play]);

  // Kursor mendekat → menyapa singkat (paling sering sekali per 45 detik, lihat DentiCompanion)
  const hoverHello = () => {
    if (busyRef.current || dozingRef.current || stateRef.current !== 'idle') return;
    react('wave', name ? `Hai, ${name}! 👋` : 'Hai! 👋 Ada yang bisa saya bantu?', 1600);
  };

  // Suara: bacakan jawaban (mulut Eira bergerak) & bertanya lewat suara
  const speech = useSpeech();
  const speakMsg = (text) => speech.speak(text, {
    onStart: () => { play('talk', 120000); setDentiLine('Saya bacakan, ya… 🔊'); },
    onEnd: () => settle(),
  });
  const dictation = useDictation({
    onInterim: (text) => setInput(text),
    onFinal: (text) => { setInput(''); settle(); ask(text); },
  });
  const toggleMic = () => {
    if (dictation.listening) { dictation.stop(); return; }
    touch();
    play('happy', 60000);
    setDentiLine('Saya mendengarkan… 🎤 Silakan bicara.');
    dictation.start();
  };
  const copyText = (text) => {
    navigator.clipboard?.writeText(String(text || '').replace(/\*\*/g, ''))
      .then(() => toast.success('Jawaban disalin.'))
      .catch(() => toast.error('Gagal menyalin.'));
  };

  const poke = () => {
    touch();
    const r = POKE_REACTIONS[pokes.current % POKE_REACTIONS.length];
    pokes.current += 1;
    react(r.state, r.line, r.state === 'spin' ? undefined : 2400);
  };

  const refreshStatus = useCallback(async () => {
    const res = await aiService.getStatus();
    if (res.success) setStatus(res.data);
    else setStatusError(res.error);
  }, []);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);
  // Sapaan pembuka begitu asisten siap
  const greeted = useRef(false);
  const [insight, setInsight] = useState(null);
  useEffect(() => {
    if (!status?.aktif || greeted.current) return;
    greeted.current = true;
    react('wave', greetLine(getGreeting(), name), 3000);
    // Catatan hari ini dari cache Dashboard (cached_only → tidak memicu AI / kuota)
    aiService.getBrief?.(false, 'admin')?.then((r) => {
      const point = r?.success && r.data?.brief?.poin?.[0];
      if (!point) return;
      setInsight(point);
      later(() => {
        if (busyRef.current || stateRef.current !== 'idle') return;
        react(point.tingkat === 'penting' ? 'think' : point.tingkat === 'baik' ? 'happy' : 'talk',
          `Catatan hari ini: ${point.judul}. Mau saya jelaskan?`, 3200);
      }, 3300);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.aktif, name, react]);
  useEffect(() => { aiService.getProvider().then((r) => r.success && setProvider(r.data)); }, []);
  useEffect(() => { saveChat(messages); endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy, typing]);

  const typeahead = React.useMemo(() => {
    const q = input.toLowerCase().trim();
    if (q.length < 2 || busy) return [];
    const words = q.split(/\s+/);
    return SUGGEST_BANK.filter((x) => { const n = x.toLowerCase(); return n !== q && words.every((w) => n.includes(w)); }).slice(0, 3);
  }, [input, busy]);

  const toAssistant = (data, question, extra = {}) => ({
    role: 'assistant', content: data.answer, tools: data.tools || [], question, topic: topicOf(question), fresh: true,
    usageId: data.usage_id || null, cached: Boolean(data.cached), fast: Boolean(data.fast), references: data.references || 0,
    actions: (data.actions || []).map((a) => ({ ...a, state: 'pending', at: Date.now(), error: '' })), ...extra,
  });

  // Pindai nota → Eira memeriksa duplikat lalu menyiapkan usulan pengeluaran + stok masuk
  const notaRef = useRef(null);
  const onNotaPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || busy) return;
    touch();
    let img;
    try { img = await resizeImageToJpeg(file); } catch (err) { toast.error(err.message); return; }
    setBusy(true);
    setDentiLine('Membaca nota Anda…');
    const res = await aiService.scanReceipt(img.base64, img.mediaType);
    setBusy(false);
    if (!res.success) { toast.error(res.error); return; }
    if (res.data?.status) setStatus(res.data.status);
    const d = res.data?.draft;
    if (!d?.adalah_nota) { toast.error('Foto ini sepertinya bukan nota. Coba foto ulang yang lebih jelas.'); return; }
    ask(notaMessage(d), { force: true });
  };

  const setActions = (idx, next) => setMessages((list) => list.map((m, i) => (i === idx ? { ...m, actions: next } : m)));
  const onActionsApplied = (applied) => {
    toast.success(applied.length > 1 ? `${applied.length} tindakan dijalankan.` : 'Tindakan dijalankan.');
    react('celebrate', 'Beres! Sudah saya jalankan. Cek hasilnya lewat tombol di kartu.', 3200);
  };

  const ask = async (q, opts = {}) => {
    const question = (q ?? input).trim();
    if (!question || (busy && !opts.force)) return;
    touch();
    // Obrolan ringan dijawab Eira langsung — tidak memakai kuota AI
    const replies = [...messages].reverse().filter((m) => m.role === 'assistant');
    // Konteks percakapan: tawaran buka halaman (hanya bila balasan terakhir), dan kuis yang sedang berjalan
    const lastMsg = messages[messages.length - 1];
    const offer = lastMsg?.role === 'assistant' && lastMsg.action?.type === 'offer' ? { to: lastMsg.action.to, label: lastMsg.action.label } : null;
    const lastQuiz = replies.find((m) => m.action?.type === 'quiz');
    const quiz = lastQuiz && lastQuiz.action.idx != null ? lastQuiz.action.idx : null;
    const chat = smallTalk(question, {
      name, greeting: getGreeting(), seed: messages.length, now: new Date(),
      role: userProfile?.role || 'admin', offer, quiz,
      afterAnswer: replies.some((m) => !m.local && !m.error),
      lastIntent: replies[0]?.intent || null,
      lastTopic: replies.find((m) => !m.local && !m.error)?.topic || null,
      recent: replies.filter((m) => m.local).slice(0, 6).map((m) => m.content),
      provider: provider?.configured ? provider.label : '',
    });
    if (chat) {
      // Obrolan & keterampilan lokal: jeda "mengetik" singkat agar terasa natural (≤ 0,55 dtk), tanpa kuota AI
      setMessages((m) => [...m, { role: 'user', content: question, local: true }]);
      setInput('');
      setTyping(true);
      later(() => {
        setTyping(false);
        const action = chat.action || null;
        const ms = DENTI_DURATIONS[chat.state] ? undefined : 3200;
        if (action?.type === 'clear') {
          setMessages([]);
          react(chat.state, 'Percakapan dibersihkan. Kita mulai dari awal! ✨', ms);
          return;
        }
        setMessages((m) => [...m, { role: 'assistant', content: chat.reply, local: true, intent: chat.intent, action, fresh: true }]);
        if (action?.type === 'showoff') {
          setDentiLine(bubble(chat.reply));
          denti.sequence(action.seq.map((st) => (Array.isArray(st) ? st : [st])));
          later(() => setBurst((b) => b + 1), 1500);
        } else {
          react(chat.state, bubble(chat.reply), ms);
        }
        if (action?.type === 'setName') { saveNick(action.name); setNick(action.name); }
        if (action?.type === 'navigate') later(() => navigate(action.to), 900);
        if (action?.type === 'back') later(() => navigate(-1), 900);
        if (action?.type === 'forward') later(() => navigate(1), 900);
        if (action?.type === 'reload') later(() => window.location.reload(), 1100);
        if (action?.type === 'theme') theme?.setThemeMode?.(action.mode);
        if (action?.type === 'speak') {
          const lastAi = replies.find((m) => !m.local && !m.error);
          if (lastAi) later(() => speakMsg(lastAi.content), 300);
        }
      }, Math.min(550, 200 + chat.reply.length * 1.2));
      inputRef.current?.focus();
      return;
    }
    const history = messages.filter((m) => !m.error && !m.local).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setInput('');
    setDentiLine(lineForQuestion(question));
    settle();
    setBusy(true);
    const res = await aiService.ask(question, history);
    setBusy(false);
    if (res.success) {
      setMessages((m) => [...m, toAssistant(res.data, question)]);
      if (res.data.status) setStatus(res.data.status);
      const mood = moodForAnswer(res.data.answer);
      const blocks = (String(res.data.answer).match(/\n\s*\n|\n\s*[-*\d|]/g) || []).length + 1;
      const talkMs = Math.min(1400, 450 + blocks * 90);
      setDentiLine(mood.line);
      denti.sequence([['talk', talkMs], [mood.state, mood.state === 'celebrate' ? 2400 : 3500]]);
      if (mood.state === 'celebrate') later(() => setBurst((b) => b + 1), talkMs);
    } else {
      setMessages((m) => [...m, { role: 'assistant', content: res.error, error: true }]);
      const mood = moodForAnswer('', { error: true });
      react(mood.state, mood.line, 3500);
    }
    inputRef.current?.focus();
  };

  const setFeedback = (idx, value) => setMessages((list) => list.map((m, i) => (i === idx ? { ...m, feedback: value } : m)));

  // 👍 Tepat → simpan sebagai jawaban terverifikasi
  const markCorrect = async (idx) => {
    const msg = messages[idx];
    const res = await aiService.feedback(msg.usageId, true);
    if (!res.success) return toast.error('Gagal menyimpan penilaian: ' + res.error);
    setFeedback(idx, 'up');
    setKnowledgeKey((k) => k + 1);
    react('love', 'Terima kasih! Jawaban ini saya simpan untuk pertanyaan serupa.', 3000);
  };

  // 👎 Kurang tepat → catat, lalu minta AI menjawab ulang dengan catatan tersebut
  const retry = async (idx, note) => {
    const msg = messages[idx];
    if (busy || !msg?.question) return;
    touch();
    await aiService.feedback(msg.usageId, false, note);
    setFeedback(idx, 'down');
    setDentiLine('Maaf, saya periksa ulang datanya…');
    settle();
    // Riwayat sampai sebelum pertanyaan yang dijawab kurang tepat
    const qIdx = messages.slice(0, idx).map((m) => m.role).lastIndexOf('user');
    const history = messages.slice(0, Math.max(qIdx, 0)).filter((m) => !m.error && !m.local).map(({ role, content }) => ({ role, content }));
    setBusy(true);
    const res = await aiService.ask(msg.question, history, { retry: true, note });
    setBusy(false);
    if (res.success) {
      setMessages((m) => [...m, toAssistant(res.data, msg.question, { revised: true })]);
      if (res.data.status) setStatus(res.data.status);
      react('happy', 'Sudah saya perbaiki. Semoga kali ini tepat!', 3000);
    } else {
      setMessages((m) => [...m, { role: 'assistant', content: res.error, error: true }]);
      react('sorry', 'Maaf, ada kendala. Coba sebentar lagi, ya.', 3500);
    }
  };

  // Pertanyaan dari kolom tanya di Dashboard: kirim sekali setelah status AI siap.
  useEffect(() => {
    if (!pendingAsk.current || !status?.aktif || busy) return;
    const q = pendingAsk.current;
    pendingAsk.current = '';
    navigate(location.pathname, { replace: true, state: null });
    ask(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.aktif]);

  const toggle = async (enabled) => {
    setToggling(true);
    const res = await aiService.setEnabled(enabled);
    setToggling(false);
    if (res.success) {
      setStatus(res.data);
      toast.success(enabled ? 'Asisten AI diaktifkan.' : 'Asisten AI dinonaktifkan.');
    } else {
      toast.error('Gagal menyimpan: ' + res.error);
    }
  };

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="text-[var(--color-accent)]" /> Eira · Asisten AI
          <Badge variant="warning" className="!text-amber-800 dark:!text-amber-300">Beta</Badge>
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Tanyakan keuangan, perencanaan, dan operasional klinik dalam bahasa sehari-hari.</p>
      </div>
      {status?.aktif && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
            {status.terpakai_bulan_ini} / {status.kuota_bulanan} pertanyaan bulan ini
          </span>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowKnowledge((v) => !v)}>
            <BookCheck size={14} /> Jawaban terverifikasi
          </Button>
          {messages.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setMessages([]); react('wave', 'Siap, kita mulai dari awal!', 2500); }}>
              <RotateCcw size={14} /> Percakapan baru
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (statusError) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        {header}
        <Card><CardContent className="p-6 text-sm text-gray-600 dark:text-gray-300">
          Asisten Keuangan hanya dapat dibuka oleh admin klinik. ({statusError})
        </CardContent></Card>
      </div>
    );
  }
  if (!status) {
    return <div className="space-y-5 max-w-4xl mx-auto">{header}<Card><CardContent className="p-6 text-sm text-gray-500">Memuat…</CardContent></Card></div>;
  }

  if (!status.tersedia_di_paket) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        {header}
        <Card><CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tersedia di paket Pro dan Enterprise</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Paket klinik saat ini: <strong>{status.paket || 'belum berlangganan'}</strong>. Tingkatkan paket untuk memakai Asisten Keuangan.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  if (!status.aktif) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        {header}
        <Card><CardContent className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Aktifkan Asisten Keuangan</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Asisten menjawab pertanyaan seperti pendapatan, pengeluaran, tindakan paling menguntungkan, kinerja dokter, dan stok bahan, memakai data klinik Anda. Sebagai Eira Agen, ia juga bisa mengusulkan pencatatan pengeluaran, stok masuk, bahan baru, opname, overhead, tarif, dan resep bahan — tetapi data baru berubah hanya setelah Anda menekan Setujui.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
            <li className="flex gap-3"><Database size={18} className="shrink-0 text-[var(--color-accent)] mt-0.5" />
              Yang dikirim ke AI hanya <strong>angka ringkasan</strong> (total, jumlah, per tindakan/dokter/kategori) saat Anda bertanya, serta <strong>foto nota pembelian</strong> saat Anda memakai Pindai nota.</li>
            <li className="flex gap-3"><Lock size={18} className="shrink-0 text-[var(--color-accent)] mt-0.5" />
              <span><strong>Tidak ada</strong> nama, NIK, kontak, atau isi rekam medis pasien yang dikirim.</span></li>
            <li className="flex gap-3"><ShieldCheck size={18} className="shrink-0 text-[var(--color-accent)] mt-0.5" />
              <span>{providerNotice(provider)} Setiap pertanyaan tercatat, dan fitur ini bisa dinonaktifkan kapan saja.</span></li>
          </ul>
          {provider && !provider.configured && (
            <p className="text-sm rounded-lg p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 flex gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" /> Penyedia AI belum dipasang oleh pengelola Dentiva. Fitur bisa diaktifkan, tetapi belum dapat menjawab.
            </p>
          )}
          <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
            <input id="ai-agree" type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            Saya admin klinik ini dan menyetujui pemrosesan data ringkasan keuangan klinik (dan foto nota yang saya pindai) oleh Asisten AI{provider?.configured ? ` (${provider.label})` : ''}.
          </label>
          <Button disabled={!agree || toggling} onClick={() => toggle(true)} className="gap-2">
            <Sparkles size={16} /> {toggling ? 'Menyimpan…' : 'Aktifkan Asisten Keuangan'}
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  const left = Math.max(0, status.kuota_bulanan - status.terpakai_bulan_ini);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {header}

      {showKnowledge && <KnowledgePanel onClose={() => setShowKnowledge(false)} refreshKey={knowledgeKey} />}

      <DentiCompanion state={denti.state} line={dentiLine} onPoke={poke} onHover={hoverHello} track burst={burst}
        look={inputFocus && input.trim() ? { x: 0.15, y: 1 } : null} />

      <Card>
        <CardContent className="p-0">
          <div className="min-h-[420px] max-h-[calc(100vh-330px)] overflow-y-auto p-5 space-y-5">
            {messages.length === 0 && (
              <div className="py-6 text-center space-y-5">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Mau tahu apa tentang klinik hari ini?</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pilih contoh di bawah atau ketik pertanyaan Anda sendiri.</p>
                </div>
                {insight && (
                  <button type="button" className="ai-chip ai-chip--action mx-auto" onClick={() => ask('Ringkas kondisi klinik hari ini')}>
                    <Sparkles size={14} /> Jelaskan catatan hari ini: {insight.judul}
                  </button>
                )}
                <div className="space-y-4 text-left">
                  {SUGGESTION_GROUPS.map((g) => (
                    <div key={g.label}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-2">{g.label}</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {g.items.map((s) => (
                          <button key={s} type="button" onClick={() => ask(s)}
                            className="text-sm px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] transition-colors text-gray-700 dark:text-gray-200">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-md px-4 py-2.5 text-sm text-white bg-[var(--color-accent)] whitespace-pre-wrap">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 shrink-0 rounded-xl grid place-items-center bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]">
                  <Sparkles size={16} className="text-[var(--color-accent)]" />
                </div>
                <div className={`min-w-0 flex-1 rounded-2xl rounded-tl-md px-4 py-3 border ${m.error ? 'border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'}`}>
                  {m.revised && !m.error && (
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">Jawaban diperbaiki</p>
                  )}
                  {m.error ? m.content : <Answer text={m.content} fresh={m.fresh} />}
                  {!m.error && m.actions?.length > 0 && (
                    <AgentActions actions={m.actions} onChange={(next) => setActions(i, next)} onApplied={onActionsApplied} />
                  )}
                  {(m.action?.type === 'navigate' || m.action?.type === 'offer') && (
                    <button type="button" onClick={() => navigate(m.action.to)} className="ai-chip ai-chip--action mt-3">
                      Buka {m.action.label} <ArrowRight size={14} />
                    </button>
                  )}
                  {!m.error && m.local && (
                    <p className="mt-3 text-xs text-gray-400">Dijawab langsung oleh Eira · tidak memakai kuota</p>
                  )}
                  {!m.error && !m.local && (
                    <p className="mt-3 text-xs text-gray-400 flex items-center gap-1 flex-wrap">
                      {m.cached ? (
                        <><Zap size={12} className="text-amber-500" /> {m.fast ? 'Jawaban cepat dari data terbaru klinik' : 'Jawaban terverifikasi · instan'}</>
                      ) : (
                        <>
                          Dibuat AI, periksa kembali angka penting
                          {m.tools?.length ? ` · data: ${[...new Set(m.tools.map((t) => TOOL_LABEL[t] || (t.startsWith('usulkan_') ? 'Usulan tindakan' : t)))].join(', ')}` : ''}
                          {m.references ? ` · mengacu ${m.references} jawaban terverifikasi` : ''}
                        </>
                      )}
                    </p>
                  )}
                  {!m.error && (
                    <div className="ai-msg-tools">
                      {speech.supported && (
                        <button type="button" onClick={() => (speech.speaking ? speech.stop() : speakMsg(m.content))} aria-label={speech.speaking ? 'Berhenti membacakan' : 'Bacakan jawaban'}>
                          {speech.speaking ? <Square size={13} /> : <Volume2 size={13} />} {speech.speaking ? 'Berhenti' : 'Bacakan'}
                        </button>
                      )}
                      <button type="button" onClick={() => copyText(m.content)} aria-label="Salin jawaban"><Copy size={13} /> Salin</button>
                    </div>
                  )}
                  {!m.error && m.usageId && (
                    <AnswerFeedback feedback={m.feedback} busy={busy}
                      onCorrect={() => markCorrect(i)} onRetry={(note) => retry(i, note)} />
                  )}
                </div>
              </div>
            )))}

            {(() => {
              const last = messages[messages.length - 1];
              if (!last || last.role !== 'assistant' || last.error || busy || typing) return null;
              const chips = followUps(last.local ? last.intent : (last.topic || topicOf(last.question || '')), last.question || '');
              return chips.length ? (
                <div className="ai-chips" aria-label="Saran pertanyaan lanjutan">
                  {chips.map((c) => (
                    <button key={c} type="button" className="ai-chip" onClick={() => ask(c)}>{c}</button>
                  ))}
                </div>
              ) : null;
            })()}

            {typing && (
              <div className="flex gap-3 items-center text-sm text-gray-500" aria-live="polite">
                <div className="w-8 h-8 rounded-xl grid place-items-center bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]">
                  <Sparkles size={16} className="text-[var(--color-accent)]" />
                </div>
                Eira sedang mengetik <span className="ai-dots"><span /><span /><span /></span>
              </div>
            )}

            {busy && (
              <div className="flex gap-3 items-center text-sm text-gray-500">
                <div className="w-8 h-8 rounded-xl grid place-items-center bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]">
                  <Sparkles size={16} className="text-[var(--color-accent)]" />
                </div>
                Menganalisis data klinik <span className="ai-dots"><span /><span /><span /></span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {typeahead.length > 0 && (
            <div className="ai-typeahead" aria-label="Saran saat mengetik">
              <span className="ai-typeahead__label">Mungkin maksud Anda</span>
              {typeahead.map((x, k) => (
                <button key={x} type="button" className="ai-chip" onClick={() => ask(x)}>{x}{k === 0 && <kbd>Tab</kbd>}</button>
              ))}
            </div>
          )}
          <form className="border-t border-gray-200 dark:border-gray-700 p-3 flex gap-2 items-end"
            onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <textarea
              id="ai-question"
              ref={inputRef}
              rows={2}
              maxLength={MAX_LEN}
              value={input}
              disabled={busy || left === 0}
              onChange={(e) => { setInput(e.target.value); touch(); }}
              onFocus={() => setInputFocus(true)}
              onBlur={() => setInputFocus(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); }
                if (e.key === 'Tab' && typeahead[0]) { e.preventDefault(); setInput(typeahead[0]); }
              }}
              placeholder={left === 0 ? 'Kuota bulan ini sudah habis.' : 'Tulis pertanyaan… (Enter untuk kirim, Shift+Enter baris baru)'}
              className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <input ref={notaRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" data-testid="nota-input" onChange={onNotaPhoto} />
            <Button type="button" variant="outline" className="h-11" disabled={busy || left === 0} onClick={() => notaRef.current?.click()}
              aria-label="Pindai nota agar Eira mencatatnya" title="Pindai nota: Eira membaca lalu menyiapkan usulan pengeluaran & stok masuk">
              <Camera size={16} />
            </Button>
            {dictation.supported && (
              <Button type="button" variant="outline" className={`h-11 ${dictation.listening ? 'ai-mic--on' : ''}`} disabled={busy || left === 0}
                onClick={toggleMic} aria-label={dictation.listening ? 'Berhenti mendengarkan' : 'Tanya dengan suara'}>
                {dictation.listening ? <MicOff size={16} /> : <Mic size={16} />}
              </Button>
            )}
            <Button type="submit" disabled={busy || !input.trim() || left === 0} className="gap-1 h-11">
              <Send size={16} /> Kirim
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-gray-400 gap-3 flex-wrap">
        <span>
          Hanya angka ringkasan (dan foto nota yang Anda pindai) yang dikirim ke AI. Tidak ada data identitas atau rekam medis pasien.
          {provider?.configured && <> Penyedia: {provider.label}.</>}
          {provider?.provider === 'gemini' && provider.free_tier && <> Versi gratis: data dapat dipakai Google untuk meningkatkan layanannya.</>}
        </span>
        <button type="button" disabled={toggling} onClick={() => toggle(false)} className="inline-flex items-center gap-1 hover:text-red-500">
          <Power size={12} /> Nonaktifkan Asisten AI
        </button>
      </div>
    </div>
  );
}
