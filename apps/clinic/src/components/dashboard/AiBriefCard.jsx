import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, ArrowRight, Lightbulb, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { aiService } from '../../services/aiService';
import { getGreeting, getRelativeTime } from '../../utils/dateUtils';
import DentiMascot, { useDentiDirector } from '../mascot/DentiMascot';
import { moodForBrief, POKE_REACTIONS } from '../../utils/dentiMood';
import './ai-brief.css';

const TONE = {
  penting: { dot: 'bg-rose-500', label: 'Penting' },
  perhatian: { dot: 'bg-amber-500', label: 'Perlu dipantau' },
  baik: { dot: 'bg-emerald-500', label: 'Kabar baik' },
};

// Halaman tujuan tombol "Buka" pada catatan resepsionis
const STAFF_ROUTES = {
  booking: { to: '/booking-requests', label: 'Buka booking' },
  recall: { to: '/resepsionis/recall', label: 'Buka recall' },
  pembayaran: { to: '/resepsionis/pembayaran', label: 'Buka pembayaran' },
  jadwal: { to: '/resepsionis/jadwal', label: 'Buka jadwal' },
  pasien: { to: '/pasien', label: 'Buka data pasien' },
};

const firstName = (profile) => {
  const n = (profile?.full_name || '').trim().split(/\s+/)[0] || '';
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
};

/**
 * Kartu Asisten AI di Dashboard: sapaan + catatan singkat dari AI (disimpan server dan dipakai
 * ulang beberapa jam).
 *   variant="admin": laporan bisnis + kolom tanya yang membuka percakapan.
 *   variant="staff": catatan tugas resepsionis (tanpa angka uang) + tombol ke halaman terkait.
 * Disembunyikan bila AI belum dikonfigurasi / tidak tersedia di paket.
 */
export default function AiBriefCard({ variant = 'admin' }) {
  const isStaff = variant === 'staff';
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ phase: 'loading' }); // loading | ready | inactive | error | hidden
  const [refreshing, setRefreshing] = useState(false);
  const [question, setQuestion] = useState('');
  const mounted = useRef(true);
  const pokes = useRef(0);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    const res = await aiService.getBrief(refresh, variant);
    if (!mounted.current) return;
    setRefreshing(false);
    if (res.success && !res.data.brief) {
      setState({ phase: 'empty' });
      return;
    }
    if (res.success) {
      setState({ phase: 'ready', brief: res.data.brief, generatedAt: res.data.generated_at, stale: Boolean(res.data.stale) });
      return;
    }
    const st = res.status && typeof res.status === 'object' ? res.status : null;
    if (st && st.tersedia_di_paket && !st.aktif) setState({ phase: isStaff ? 'hidden' : 'inactive' });
    else if (res.httpStatus === 503 || res.httpStatus === 403) setState({ phase: 'hidden' });
    else setState((s) => (s.phase === 'ready' ? s : { phase: 'error', error: res.error }));
  }, [variant, isStaff]);

  useEffect(() => {
    mounted.current = true;
    load(false);
    return () => { mounted.current = false; };
  }, [load]);

  const ask = (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    navigate('/admin/asisten-ai', { state: { ask: q } });
  };

  // Ekspresi Eira mengikuti isi catatan; dicolek → reaksi lucu
  const dentiBase = refreshing || state.phase === 'loading' ? 'scan'
    : state.phase === 'ready' ? moodForBrief(state.brief)
      : state.phase === 'error' ? 'sorry' : 'wave';
  const denti = useDentiDirector(dentiBase);
  const poke = () => {
    const r = POKE_REACTIONS[pokes.current % POKE_REACTIONS.length];
    pokes.current += 1;
    denti.play(r.state, r.state === 'spin' ? undefined : 2400);
  };

  if (state.phase === 'hidden') return null;

  const name = firstName(userProfile);
  const greeting = `${getGreeting()}${name ? `, ${name}` : ''}.`;

  return (
    <section className="ai-brief relative overflow-hidden rounded-2xl border p-6 sm:p-7" aria-labelledby="ai-brief-title">
      <div className="ai-brief__glow" aria-hidden="true" />
      <div className="relative z-10 space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={poke} className="ai-brief__denti" aria-label="Colek Eira" title="Colek Eira">
            <DentiMascot state={denti.state} size={68} title="Eira, asisten AI Dentiva" />
          </button>
          <div className="space-y-1.5 min-w-0">
            <p className="ai-brief__eyebrow flex items-center gap-2">
              <Sparkles size={13} /> Eira · Asisten AI · {isStaff ? 'Tugas meja depan hari ini' : 'Catatan hari ini'}
            </p>
            <h2 id="ai-brief-title" className="ai-brief__greeting">{greeting}</h2>
          </div>
          </div>
          {state.phase === 'ready' && (
            <button type="button" onClick={() => load(true)} disabled={refreshing}
              className="ai-brief__icon-btn" title="Perbarui laporan" aria-label="Perbarui laporan">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}
        </header>

        {state.phase === 'loading' && (
          <div className="space-y-3" aria-live="polite">
            <p className="ai-brief__lead opacity-70">
              {isStaff ? 'Asisten sedang menyiapkan catatan tugas hari ini…' : 'Asisten sedang membaca data klinik Anda…'}
            </p>
            <div className="ai-brief__shimmer h-3 w-11/12" />
            <div className="ai-brief__shimmer h-3 w-9/12" />
            <div className="ai-brief__shimmer h-3 w-10/12" />
          </div>
        )}

        {state.phase === 'inactive' && (
          <div className="space-y-3">
            <p className="ai-brief__lead">
              Aktifkan Asisten AI untuk menerima ringkasan kondisi klinik setiap kali Anda membuka Dentiva —
              pendapatan, tagihan tertunda, stok, hingga pasien yang perlu dihubungi kembali.
            </p>
            <button type="button" onClick={() => navigate('/admin/asisten-ai')} className="ai-brief__link">
              Aktifkan Asisten AI <ArrowRight size={14} />
            </button>
          </div>
        )}

        {state.phase === 'empty' && (
          <div className="space-y-3">
            <p className="ai-brief__lead">
              {isStaff
                ? 'Catatan tugas disiapkan otomatis pukul 00.00 dan 12.00 WIB. Anda juga dapat menyusunnya sekarang.'
                : 'Catatan hari ini disiapkan otomatis pukul 00.00 dan 12.00 WIB. Anda juga dapat menyusunnya sekarang.'}
            </p>
            <button type="button" disabled={refreshing} onClick={() => load(true)} className="ai-brief__link">
              {refreshing ? 'Menyusun…' : 'Susun sekarang'} <ArrowRight size={14} />
            </button>
          </div>
        )}

        {state.phase === 'error' && (
          <div className="space-y-2">
            <p className="ai-brief__lead opacity-80">Catatan hari ini belum dapat disusun. {state.error}</p>
            <button type="button" onClick={() => { setState({ phase: 'loading' }); load(true); }} className="ai-brief__link">
              Coba lagi <ArrowRight size={14} />
            </button>
          </div>
        )}

        {state.phase === 'ready' && (
          <>
            {state.brief.ringkasan && <p className="ai-brief__lead">{state.brief.ringkasan}</p>}

            {state.brief.poin?.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2">
                {state.brief.poin.map((p, i) => {
                  const tone = TONE[p.tingkat] || TONE.perhatian;
                  const route = isStaff ? STAFF_ROUTES[p.aksi] : null;
                  return (
                    <li key={i} className="ai-brief__point flex flex-col">
                      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] opacity-60">
                        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} /> {tone.label}
                      </p>
                      <p className="mt-1.5 font-semibold leading-snug">{p.judul}</p>
                      <p className="mt-1 text-sm leading-relaxed opacity-75">{p.teks}</p>
                      {route && (
                        <button type="button" onClick={() => navigate(route.to)} className="ai-brief__link mt-2 self-start text-xs">
                          {route.label} <ChevronRight size={13} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {state.brief.saran && (
              <p className="ai-brief__advice">
                <Lightbulb size={16} className="mt-0.5 shrink-0" />
                <span><span className="font-semibold">{isStaff ? 'Selanjutnya — ' : 'Langkah hari ini — '}</span>{state.brief.saran}</span>
              </p>
            )}
          </>
        )}

        {!isStaff && (state.phase === 'ready' || state.phase === 'error' || state.phase === 'empty') && (
          <form onSubmit={ask} className="ai-brief__ask">
            <Sparkles size={16} className="shrink-0 opacity-50" />
            <input
              aria-label="Tanyakan pada Asisten AI"
              value={question}
              maxLength={1000}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Tanyakan sesuatu tentang klinik Anda…"
              className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
            />
            <button type="submit" disabled={!question.trim()} className="ai-brief__send" aria-label="Kirim pertanyaan">
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {state.phase === 'ready' && (
          <p className="text-[11px] tracking-wide opacity-50">
            {state.stale ? 'Layanan AI sedang ramai — menampilkan catatan terakhir' : 'Disusun AI dari data klinik'}
            {' · '}diperbarui {getRelativeTime(state.generatedAt)} · otomatis pukul 00.00 & 12.00 WIB
          </p>
        )}
      </div>
    </section>
  );
}
