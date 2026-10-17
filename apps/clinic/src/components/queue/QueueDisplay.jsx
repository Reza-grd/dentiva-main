import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Stethoscope, Clock, MonitorOff } from 'lucide-react';
import DentiMascot, { useDentiDirector } from '../mascot/DentiMascot';
import { dentiScene, isClosed } from '../../utils/dentiQueue';
import './queue-display.css';

// ─────────────────────────────────────────────
//  QUEUE DISPLAY — layar TV ruang tunggu (tema kaca)
//  Dibuka lewat /antrean/<token> TANPA login. Data diambil dari RPC
//  get_queue_display(): server hanya mengirim nomor urut, inisial pasien,
//  nama dokter, jam, dan status — tidak ada nama lengkap/No. RM/kontak.
//  Palet berdiri sendiri (tidak bergantung tema aplikasi) agar selalu
//  tampil gelap & kontras di TV.
//  Maskot Eira: tips bergilir saat senggang, menunjuk saat pasien dipanggil,
//  berterima kasih saat pasien selesai, minta maaf bila antrean molor, tidur di
//  luar jam praktik dan bangun saat klinik buka. Mode anak memakai penanda `kid`.
// ─────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 10000;
const ANNOUNCE_MS = 7000;
const MESSAGE_INTERVAL_MS = 9000;

const pad = (n) => String(n ?? '').padStart(2, '0');

/** Angka yang "menghitung" halus menuju nilai baru. */
function useCountUp(value, duration = 900) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - (1 - k) ** 3;
      setShown(Math.round(a + (value - a) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}

function Stat({ label, value, tone }) {
  const n = useCountUp(value);
  return (
    <div className="qd-stat">
      <dd className={`qd-stat__value ${tone ? `qd-stat__value--${tone}` : ''}`}>{n}</dd>
      <dt className="qd-stat__label">{label}</dt>
    </div>
  );
}

const QueueDisplay = () => {
  const { token } = useParams();
  const [visits, setVisits] = useState([]);
  const [clinicName, setClinicName] = useState('');
  const [unavailable, setUnavailable] = useState(null); // null | 'invalid' | 'inactive'
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [announce, setAnnounce] = useState(null);
  const [messageIdx, setMessageIdx] = useState(0);
  const [hours, setHours] = useState(null);
  const seenOngoing = useRef(null);
  const seenCompleted = useRef(null);
  const wasClosed = useRef(null);

  // ─── Ambil antrean hari ini (data minimal) ───
  const fetchQueue = async () => {
    try {
      const { data, error } = await supabase.rpc('get_queue_display', { p_token: token || '' });
      if (error) throw error;
      if (!data?.ok) {
        setUnavailable(data?.reason === 'inactive' ? 'inactive' : 'invalid');
        setVisits([]);
        return;
      }
      setUnavailable(null);
      setClinicName(data.clinic_name || '');
      setHours(data.hours || null);
      setVisits(data.visits || []);
    } catch (err) {
      // Gangguan jaringan: pertahankan tampilan terakhir, coba lagi di interval berikutnya.
      console.error('Queue fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const q = setInterval(fetchQueue, REFRESH_INTERVAL_MS);
    const c = setInterval(() => setNow(new Date()), 1000);
    const m = setInterval(() => setMessageIdx((i) => i + 1), MESSAGE_INTERVAL_MS);
    return () => { clearInterval(q); clearInterval(c); clearInterval(m); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const ongoing = useMemo(() => visits.filter((v) => v.status === 'ongoing'), [visits]);
  const waiting = useMemo(() => visits.filter((v) => v.status === 'waiting'), [visits]);
  const completed = useMemo(() => visits.filter((v) => v.status === 'completed'), [visits]);

  // Pengumuman layar penuh saat ada pasien baru dipanggil (bukan saat layar pertama dibuka)
  useEffect(() => {
    const current = new Set(ongoing.map((v) => v.no));
    const prev = seenOngoing.current;
    seenOngoing.current = current;
    if (!prev) return undefined;
    const fresh = ongoing.find((v) => !prev.has(v.no));
    if (!fresh) return undefined;
    setAnnounce(fresh);
    const t = setTimeout(() => setAnnounce(null), ANNOUNCE_MS);
    return () => clearTimeout(t);
  }, [ongoing]);

  // ─── Eira ───
  const scene = dentiScene({ hours, now, primary: ongoing[0], waiting, tick: messageIdx });
  const denti = useDentiDirector(scene.state);
  const { play, sequence } = denti;

  // Pasien selesai → terima kasih (bukan saat layar pertama dibuka)
  useEffect(() => {
    const prev = seenCompleted.current;
    seenCompleted.current = completed.length;
    if (prev != null && completed.length > prev) play('thanks');
  }, [completed.length, play]);

  // Klinik baru buka → bangun lalu menyapa
  const closedNow = isClosed(hours, now);
  useEffect(() => {
    const prev = wasClosed.current;
    wasClosed.current = closedNow;
    if (prev === true && !closedNow) sequence([['wake'], ['wave', 3000]]);
  }, [closedNow, sequence]);

  const messages = useMemo(() => [
    `Selamat datang di ${clinicName || 'klinik kami'}. Nomor Anda akan segera dipanggil.`,
    'Mohon siapkan kartu identitas dan kartu asuransi bila ada, untuk mempercepat pelayanan.',
    'Sikat gigi dua kali sehari dan periksakan gigi setiap enam bulan untuk senyum yang sehat.',
    'Terima kasih telah mempercayakan perawatan gigi Anda kepada kami.',
  ], [clinicName]);

  const hhmm = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const sec = now.getSeconds();
  const date = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const monogram = (clinicName || 'D').trim().charAt(0).toUpperCase();
  const RING = 2 * Math.PI * 20;

  const backdrop = (
    <div className="qd-sky" aria-hidden="true">
      <span className="qd-orb qd-orb--a" />
      <span className="qd-orb qd-orb--b" />
      <span className="qd-orb qd-orb--c" />
      <span className="qd-grain" />
    </div>
  );

  if (unavailable || loading) {
    return (
      <div className="qd qd--center">
        {backdrop}
        <div className="qd-glass qd-notice">
          {unavailable ? (
            <>
              <MonitorOff size={40} strokeWidth={1.3} />
              <p>
                {unavailable === 'inactive'
                  ? 'Layar antrean tidak tersedia: klinik sedang tidak aktif.'
                  : 'Tautan layar antrean tidak valid atau sudah dicabut. Minta admin klinik membuat tautan baru di menu Layar Antrean.'}
              </p>
            </>
          ) : (
            <>
              <span className="qd-spinner" />
              <p>Menyiapkan layar antrean…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const next = waiting[0];
  const rest = waiting.slice(1, 6);
  const primary = ongoing[0];
  const others = ongoing.slice(1, 4);

  return (
    <div className="qd">
      {backdrop}

      {/* ── Header ───────────────────────────── */}
      <header className="qd-header">
        <div className="qd-brand">
          <div className="qd-monogram">{monogram}</div>
          <div>
            <h1 className="qd-clinic">{clinicName}</h1>
            <p className="qd-date">{date}</p>
          </div>
        </div>
        <div className="qd-glass qd-clock" aria-label={`Pukul ${hhmm}`}>
          <span className="qd-clock__time">{hhmm}</span>
          <svg className="qd-clock__ring" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="20" className="qd-clock__track" />
            <circle cx="24" cy="24" r="20" className="qd-clock__progress"
              style={{ strokeDasharray: RING, strokeDashoffset: RING * (1 - sec / 60) }} />
            <text x="24" y="28.5" textAnchor="middle" className="qd-clock__sec">{pad(sec)}</text>
          </svg>
        </div>
      </header>

      {/* ── Isi ──────────────────────────────── */}
      <main className="qd-body">
        <section className="qd-glass qd-serving" aria-label="Sedang diperiksa">
          <p className="qd-eyebrow qd-eyebrow--gold"><span className="qd-live" /> Sedang diperiksa</p>

          {!primary ? (
            <div className="qd-empty">
              <span className="qd-empty__halo" aria-hidden="true" />
              <DentiMascot className="qd-denti qd-denti--stage" state={denti.state} kid={scene.kid} size={300} />
              <p className="qd-empty__title">Belum ada pasien yang dipanggil</p>
              <p className="qd-empty__sub">Silakan menunggu dengan nyaman. Nomor Anda akan tampil di sini.</p>
            </div>
          ) : (
            <div className="qd-hero">
              <div className="qd-hero__stage">
                <span className="qd-ring qd-ring--1" aria-hidden="true" />
                <span className="qd-ring qd-ring--2" aria-hidden="true" />
                <span className="qd-ring qd-ring--3" aria-hidden="true" />
                <p key={primary.no} className="qd-hero__no">{pad(primary.no)}</p>
              </div>
              <p className="qd-hero__label">Nomor antrean</p>
              <p className="qd-hero__initials">{primary.initials}</p>
              <p className="qd-hero__doctor"><Stethoscope size={18} strokeWidth={1.5} /> {primary.doctor || 'Dokter'}</p>

              {others.length > 0 && (
                <div className="qd-also">
                  {others.map((v) => (
                    <div key={v.no} className="qd-also__item">
                      <span className="qd-also__no">{pad(v.no)}</span>
                      <span className="qd-also__doctor">{v.doctor || 'Dokter'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="qd-side">
          <div className="qd-glass qd-queue" aria-label="Antrean berikutnya">
            <div className="qd-queue__head">
              <p className="qd-eyebrow qd-eyebrow--ice">Antrean berikutnya</p>
              <span className="qd-chip">{waiting.length} menunggu</span>
            </div>

            {next ? (
              <>
                <div className="qd-next">
                  <div className="qd-next__inner">
                    <span className="qd-next__tag">Berikutnya</span>
                    <span key={next.no} className="qd-next__no">{pad(next.no)}</span>
                    <div className="qd-next__info">
                      <span className="qd-next__initials">{next.initials}</span>
                      <span className="qd-next__doctor">{next.doctor || '—'}</span>
                    </div>
                    {next.time && <span className="qd-time"><Clock size={15} strokeWidth={1.5} /> {next.time}</span>}
                  </div>
                </div>
                <ol className="qd-list">
                  {rest.map((v, i) => (
                    <li key={v.no} className="qd-row" style={{ animationDelay: `${i * 90}ms` }}>
                      <span className="qd-row__no">{pad(v.no)}</span>
                      <span className="qd-row__initials">{v.initials}</span>
                      <span className="qd-row__doctor">{v.doctor || '—'}</span>
                      {v.time && <span className="qd-time">{v.time}</span>}
                    </li>
                  ))}
                </ol>
                {waiting.length > 6 && <p className="qd-more">+{waiting.length - 6} pasien lainnya</p>}
              </>
            ) : (
              <div className="qd-empty qd-empty--small">
                <p className="qd-empty__title">Tidak ada antrean</p>
                <p className="qd-empty__sub">Semua pasien telah dilayani.</p>
              </div>
            )}
          </div>

          <dl className="qd-glass qd-stats">
            <Stat label="Diperiksa" value={ongoing.length} tone="gold" />
            <Stat label="Menunggu" value={waiting.length} tone="ice" />
            <Stat label="Selesai" value={completed.length} />
            <Stat label="Hari ini" value={visits.length} />
          </dl>
        </aside>
      </main>

      {/* ── Pesan bawah ──────────────────────── */}
      <footer className={`qd-glass qd-footer ${primary ? 'qd-footer--host' : ''}`}>
        {primary && <DentiMascot className="qd-denti qd-denti--host" state={denti.state} kid={scene.kid} size={120} />}
        <p key={messageIdx} className="qd-message">{scene.text || messages[messageIdx % messages.length]}</p>
        <span className="qd-powered">Dentiva</span>
      </footer>

      {/* ── Pengumuman pasien dipanggil ─────── */}
      {announce && (
        <div className="qd-announce" role="alert" aria-live="assertive">
          <div className="qd-announce__card">
            <span className="qd-ripple qd-ripple--1" aria-hidden="true" />
            <span className="qd-ripple qd-ripple--2" aria-hidden="true" />
            <p className="qd-announce__eyebrow">Dipanggil</p>
            <p className="qd-announce__no">{pad(announce.no)}</p>
            <p className="qd-announce__initials">{announce.initials}</p>
            <p className="qd-announce__doctor">Silakan menuju ruang periksa · {announce.doctor || 'Dokter'}</p>
            <DentiMascot className="qd-denti qd-denti--announce" state="point" kid={Boolean(announce.kid)} size={220}
              title="Eira mempersilakan pasien menuju ruang periksa" />
            <span className="qd-announce__timer" style={{ animationDuration: `${ANNOUNCE_MS}ms` }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueDisplay;
