import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Stethoscope, Clock, MonitorOff } from 'lucide-react';
import './queue-display.css';

// ─────────────────────────────────────────────
//  QUEUE DISPLAY — layar TV ruang tunggu
//  Dibuka lewat /antrean/<token> TANPA login. Data diambil dari RPC
//  get_queue_display(): server hanya mengirim nomor urut, inisial pasien,
//  nama dokter, jam, dan status — tidak ada nama lengkap/No. RM/kontak.
//  Palet warna berdiri sendiri (tidak bergantung tema aplikasi) agar selalu
//  tampil gelap & kontras di TV.
// ─────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 10000;
const HIGHLIGHT_MS = 8000;
const MESSAGE_INTERVAL_MS = 9000;

const pad = (n) => String(n ?? '').padStart(2, '0');

const QueueDisplay = () => {
  const { token } = useParams();
  const [visits, setVisits] = useState([]);
  const [clinicName, setClinicName] = useState('');
  const [unavailable, setUnavailable] = useState(null); // null | 'invalid' | 'inactive'
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [justCalled, setJustCalled] = useState(() => new Set());
  const [messageIdx, setMessageIdx] = useState(0);
  const seenOngoing = useRef(null);

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

  // Sorot pasien yang baru dipanggil (bukan saat layar pertama kali dibuka)
  useEffect(() => {
    const current = new Set(ongoing.map((v) => v.no));
    if (seenOngoing.current) {
      const fresh = [...current].filter((n) => !seenOngoing.current.has(n));
      if (fresh.length) {
        setJustCalled(new Set(fresh));
        const t = setTimeout(() => setJustCalled(new Set()), HIGHLIGHT_MS);
        seenOngoing.current = current;
        return () => clearTimeout(t);
      }
    }
    seenOngoing.current = current;
    return undefined;
  }, [ongoing]);

  const messages = useMemo(() => [
    `Selamat datang di ${clinicName || 'klinik kami'}. Silakan menunggu, nomor Anda akan segera dipanggil.`,
    'Mohon siapkan kartu identitas dan kartu asuransi bila ada, untuk mempercepat pelayanan.',
    'Sikat gigi dua kali sehari dan periksakan gigi setiap enam bulan untuk senyum yang sehat.',
    'Terima kasih telah mempercayakan perawatan gigi Anda kepada kami.',
  ], [clinicName]);

  const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const seconds = pad(now.getSeconds());
  const date = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const monogram = (clinicName || 'D').trim().charAt(0).toUpperCase();

  if (unavailable || loading) {
    return (
      <div className="qd qd--center">
        <div className="qd__ambient" aria-hidden="true" />
        {unavailable ? (
          <div className="qd__notice">
            <MonitorOff size={44} strokeWidth={1.4} />
            <p>
              {unavailable === 'inactive'
                ? 'Layar antrean tidak tersedia: klinik sedang tidak aktif.'
                : 'Tautan layar antrean tidak valid atau sudah dicabut. Minta admin klinik membuat tautan baru di Pengaturan → Layar Antrean TV.'}
            </p>
          </div>
        ) : (
          <div className="qd__notice">
            <span className="qd__spinner" />
            <p>Menyiapkan layar antrean…</p>
          </div>
        )}
      </div>
    );
  }

  const next = waiting[0];
  const rest = waiting.slice(1, 7);

  return (
    <div className="qd">
      <div className="qd__ambient" aria-hidden="true" />

      {/* ── Header ───────────────────────────── */}
      <header className="qd__header">
        <div className="qd__brand">
          <div className="qd__monogram">{monogram}</div>
          <div>
            <h1 className="qd__clinic">{clinicName}</h1>
            <p className="qd__date">{date}</p>
          </div>
        </div>
        <div className="qd__clock" aria-label={`Pukul ${time}`}>
          <span className="qd__clock-main">{time}</span>
          <span className="qd__clock-sec">{seconds}</span>
          <span className="qd__clock-zone">WIB</span>
        </div>
      </header>

      {/* ── Isi ──────────────────────────────── */}
      <main className="qd__body">
        <section className="qd__serving" aria-label="Sedang diperiksa">
          <p className="qd__eyebrow qd__eyebrow--gold"><span className="qd__live" /> Sedang diperiksa</p>

          {ongoing.length === 0 ? (
            <div className="qd__empty">
              <p className="qd__empty-title">Belum ada pasien yang dipanggil</p>
              <p className="qd__empty-sub">Silakan menunggu dengan nyaman. Nomor Anda akan tampil di sini.</p>
            </div>
          ) : (
            <div className={`qd__serving-grid ${ongoing.length > 1 ? 'qd__serving-grid--multi' : ''}`}>
              {ongoing.slice(0, 4).map((v) => (
                <article key={v.no} className={`qd__ticket ${justCalled.has(v.no) ? 'is-called' : ''}`}>
                  <p className="qd__ticket-label">Nomor antrean</p>
                  <p className="qd__ticket-no">{pad(v.no)}</p>
                  <p className="qd__ticket-initials">{v.initials}</p>
                  <p className="qd__ticket-doctor"><Stethoscope size={18} strokeWidth={1.6} /> {v.doctor || 'Dokter'}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="qd__queue" aria-label="Antrean berikutnya">
          <div className="qd__queue-head">
            <p className="qd__eyebrow qd__eyebrow--ice">Antrean berikutnya</p>
            <span className="qd__count">{waiting.length} menunggu</span>
          </div>

          {next ? (
            <>
              <div className="qd__next">
                <span className="qd__next-tag">Berikutnya</span>
                <span className="qd__next-no">{pad(next.no)}</span>
                <div className="qd__next-info">
                  <span className="qd__next-initials">{next.initials}</span>
                  <span className="qd__next-doctor">{next.doctor || '—'}</span>
                </div>
                {next.time && <span className="qd__time"><Clock size={15} strokeWidth={1.6} /> {next.time}</span>}
              </div>
              <ol className="qd__list">
                {rest.map((v) => (
                  <li key={v.no} className="qd__row">
                    <span className="qd__row-no">{pad(v.no)}</span>
                    <span className="qd__row-initials">{v.initials}</span>
                    <span className="qd__row-doctor">{v.doctor || '—'}</span>
                    {v.time && <span className="qd__time">{v.time}</span>}
                  </li>
                ))}
              </ol>
              {waiting.length > 7 && <p className="qd__more">+{waiting.length - 7} pasien lainnya</p>}
            </>
          ) : (
            <div className="qd__empty qd__empty--small">
              <p className="qd__empty-title">Tidak ada antrean</p>
              <p className="qd__empty-sub">Semua pasien telah dilayani.</p>
            </div>
          )}

          <dl className="qd__stats">
            <div><dt>Diperiksa</dt><dd className="qd__stat--gold">{ongoing.length}</dd></div>
            <div><dt>Menunggu</dt><dd className="qd__stat--ice">{waiting.length}</dd></div>
            <div><dt>Selesai</dt><dd>{completed.length}</dd></div>
            <div><dt>Hari ini</dt><dd>{visits.length}</dd></div>
          </dl>
        </aside>
      </main>

      {/* ── Pesan bawah (berganti perlahan) ─── */}
      <footer className="qd__footer">
        <p key={messageIdx % messages.length} className="qd__message">{messages[messageIdx % messages.length]}</p>
        <span className="qd__powered">Dentiva</span>
      </footer>
    </div>
  );
};

export default QueueDisplay;
