import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, ArrowRight, Lightbulb } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { aiService } from '../../services/aiService';
import { getGreeting, getRelativeTime } from '../../utils/dateUtils';
import './ai-brief.css';

const TONE = {
  penting: { dot: 'bg-rose-500', label: 'Penting' },
  perhatian: { dot: 'bg-amber-500', label: 'Perlu dipantau' },
  baik: { dot: 'bg-emerald-500', label: 'Kabar baik' },
};

const firstName = (profile) => {
  const n = (profile?.full_name || '').trim().split(/\s+/)[0] || '';
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
};

/**
 * Kartu Asisten AI di Dashboard admin: sapaan, laporan singkat dari AI (disimpan server dan
 * dipakai ulang beberapa jam), serta kolom tanya yang membuka percakapan.
 * Disembunyikan bila AI belum dikonfigurasi / tidak tersedia di paket.
 */
export default function AiBriefCard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ phase: 'loading' }); // loading | ready | inactive | error | hidden
  const [refreshing, setRefreshing] = useState(false);
  const [question, setQuestion] = useState('');
  const mounted = useRef(true);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    const res = await aiService.getBrief(refresh);
    if (!mounted.current) return;
    setRefreshing(false);
    if (res.success) {
      setState({ phase: 'ready', brief: res.data.brief, generatedAt: res.data.generated_at });
      return;
    }
    const st = res.status && typeof res.status === 'object' ? res.status : null;
    if (st && st.tersedia_di_paket && !st.aktif) setState({ phase: 'inactive' });
    else if (res.httpStatus === 503 || res.httpStatus === 403) setState({ phase: 'hidden' });
    else setState((s) => (s.phase === 'ready' ? s : { phase: 'error', error: res.error }));
  }, []);

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

  if (state.phase === 'hidden') return null;

  const name = firstName(userProfile);
  const greeting = `${getGreeting()}${name ? `, ${name}` : ''}.`;

  return (
    <section className="ai-brief relative overflow-hidden rounded-2xl border p-6 sm:p-7" aria-labelledby="ai-brief-title">
      <div className="ai-brief__glow" aria-hidden="true" />
      <div className="relative z-10 space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="ai-brief__eyebrow flex items-center gap-2">
              <Sparkles size={13} /> Asisten AI · Catatan hari ini
            </p>
            <h2 id="ai-brief-title" className="ai-brief__greeting">{greeting}</h2>
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
            <p className="ai-brief__lead opacity-70">Asisten sedang membaca data klinik Anda…</p>
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
                  return (
                    <li key={i} className="ai-brief__point">
                      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] opacity-60">
                        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} /> {tone.label}
                      </p>
                      <p className="mt-1.5 font-semibold leading-snug">{p.judul}</p>
                      <p className="mt-1 text-sm leading-relaxed opacity-75">{p.teks}</p>
                    </li>
                  );
                })}
              </ul>
            )}

            {state.brief.saran && (
              <p className="ai-brief__advice">
                <Lightbulb size={16} className="mt-0.5 shrink-0" />
                <span><span className="font-semibold">Langkah hari ini — </span>{state.brief.saran}</span>
              </p>
            )}
          </>
        )}

        {(state.phase === 'ready' || state.phase === 'error') && (
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
            Disusun AI dari data klinik · diperbarui {getRelativeTime(state.generatedAt)} · periksa kembali angka penting
          </p>
        )}
      </div>
    </section>
  );
}
