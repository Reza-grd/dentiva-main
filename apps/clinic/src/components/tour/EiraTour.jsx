import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ArrowLeft, ArrowRight, Check, ChevronsRight, Clock, MessageCircle, MousePointerClick, Send, X } from 'lucide-react';
import DentiMascot, { useDentiDirector, DENTI_DURATIONS } from '../mascot/DentiMascot';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { miniMarkdown } from '../../utils/miniMarkdown';
import { smallTalk } from '../../utils/dentiMood';
import { getGreeting } from '../../utils/dateUtils';
import { namaPanggilan } from '../../utils/stringUtils';
import { TUR_VERSI, PERAN_LABEL, PEMBUKA, LANJUTAN, langkahUntuk, babUntuk } from './tourSteps';
import './eira-tour.css';

/**
 * Tur pengenalan bersama Eira untuk pengguna baru (admin, dokter, resepsionis).
 * - Tampil otomatis satu kali untuk akun berumur ≤ 30 hari; bisa diikuti penuh atau dilewati.
 * - Bisa diulang dari menu profil ("Tur pengenalan") atau dengan mengetik "mulai tur" ke Eira.
 * - Di setiap langkah pengguna bisa bertanya langsung ke Eira (otak lokal, tanpa kuota AI).
 * Status disimpan di user_metadata akun (ikut ke perangkat lain) dan localStorage (langsung berlaku).
 */
export const TUR_EVENT = 'dentiva:tur';
export const mulaiTur = () => window.dispatchEvent(new CustomEvent(TUR_EVENT));

const HARI_BARU = 30;
// Setiap rute memasang tata letaknya sendiri, jadi tur ini ikut terpasang ulang saat pindah halaman.
// Posisi tur disimpan per tab agar langkah berikutnya berlanjut di halaman baru.
const KUNCI_JALAN = 'dentiva-tur-jalan';
const bacaJalan = (uid) => {
  try {
    const j = JSON.parse(sessionStorage.getItem(KUNCI_JALAN) || 'null');
    return j && j.uid === uid && ['sambut', 'langkah', 'selesai'].includes(j.fase) ? j : null;
  } catch { return null; }
};
const kunciLokal = (id) => `dentiva-tur-v${TUR_VERSI}:${id}`;
const sudahTur = (user) => {
  if (!user) return true;
  if ((user.user_metadata?.tur_dentiva?.v || 0) >= TUR_VERSI) return true;
  try { return Boolean(localStorage.getItem(kunciLokal(user.id))); } catch { return false; }
};
const akunBaru = (user) => {
  const dibuat = Date.parse(user?.created_at || '');
  return Number.isFinite(dibuat) && Date.now() - dibuat < HARI_BARU * 864e5;
};
const Md = ({ text, className = '' }) => (
  <div className={`eira-tur__md ${className}`} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(miniMarkdown(text)) }} />
);
const terlihat = (r) => r && r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < window.innerWidth && r.top < window.innerHeight;
const adaUkuran = (el) => { const r = el?.getBoundingClientRect(); return Boolean(r && r.width > 0 && r.height > 0); };
const rapiTeks = (t) => String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Elemen yang dimaksud sebuah langkah: pemilih CSS (`target`) atau elemen pertama yang teksnya diawali `teks`. */
export function elemenLangkah(step) {
  if (!step) return { el: null, klikEl: null };
  let el = null;
  if (step.target) {
    el = [...document.querySelectorAll(step.target)].find(adaUkuran) || null;
  } else if (step.teks) {
    const cari = rapiTeks(step.teks);
    el = [...document.querySelectorAll(step.tag || 'h1,h2,h3,h4,button,label')]
      .find((x) => adaUkuran(x) && !x.closest('.eira-tur') && rapiTeks(x.textContent).startsWith(cari)) || null;
  }
  const klikEl = el;
  if (el && step.naik) el = el.parentElement?.closest(step.naik) || el;
  return { el, klikEl };
}
const diKolomIsian = (t) => t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable);

export default function EiraTour() {
  const { user, userProfile } = useAuth();
  const peran = userProfile?.role || 'admin';
  const nama = namaPanggilan(userProfile?.full_name);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const langkah = langkahUntuk(peran);
  const daftarBab = babUntuk(langkah);

  const [fase, setFase] = useState(() => bacaJalan(user?.id)?.fase || 'tutup'); // tutup | sambut | langkah | selesai
  const [i, setI] = useState(() => bacaJalan(user?.id)?.i || 0);
  const [sorot, setSorot] = useState(null); // DOMRect elemen yang disorot (null = tengah layar)
  const [posisi, setPosisi] = useState(null);
  const [tanyaBuka, setTanyaBuka] = useState(false);
  const [pertanyaan, setPertanyaan] = useState('');
  const [jawaban, setJawaban] = useState(null);
  const eira = useDentiDirector('idle');
  const kartuRef = useRef(null);
  const tombolUtamaRef = useRef(null);
  const sudahDitawarkan = useRef(false);
  const sudahDiklik = useRef(-1);
  const step = langkah[Math.min(i, langkah.length - 1)];

  const simpan = useCallback((status) => {
    if (!user) return;
    try { localStorage.setItem(kunciLokal(user.id), status); } catch { /* penyimpanan dimatikan */ }
    supabase.auth.updateUser({ data: { tur_dentiva: { v: TUR_VERSI, status, at: new Date().toISOString() } } }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    try {
      if (fase === 'tutup') sessionStorage.removeItem(KUNCI_JALAN);
      else sessionStorage.setItem(KUNCI_JALAN, JSON.stringify({ uid: user.id, fase, i }));
    } catch { /* penyimpanan dimatikan */ }
  }, [fase, i, user]);

  // Tawarkan otomatis satu kali untuk akun baru yang belum pernah mengikuti/melewati tur.
  useEffect(() => {
    if (sudahDitawarkan.current || !user || !userProfile || fase !== 'tutup') return undefined;
    if (sudahTur(user) || !akunBaru(user)) return undefined;
    sudahDitawarkan.current = true;
    const t = setTimeout(() => setFase('sambut'), 1200);
    return () => clearTimeout(t);
  }, [user, userProfile, fase]);

  // Dipanggil ulang dari menu profil atau perintah "mulai tur" ke Eira.
  useEffect(() => {
    const buka = () => { setI(0); setFase('sambut'); };
    window.addEventListener(TUR_EVENT, buka);
    return () => window.removeEventListener(TUR_EVENT, buka);
  }, []);

  // Gerak Eira: tenang & formal — salam saat menyambut, satu gestur singkat per langkah, terima kasih di akhir.
  const { sequence } = eira;
  useEffect(() => {
    if (fase === 'sambut') sequence([['idle', 500], ['welcome', DENTI_DURATIONS.welcome], ['bow', DENTI_DURATIONS.bow]]);
    if (fase === 'selesai') sequence([['thanks', DENTI_DURATIONS.thanks], ['bow', DENTI_DURATIONS.bow]]);
  }, [fase, sequence]);
  useEffect(() => {
    if (fase !== 'langkah') return;
    setTanyaBuka(false); setPertanyaan(''); setJawaban(null);
    sequence([[step.pose, DENTI_DURATIONS[step.pose] ?? 2400]]);
  }, [fase, i, step.pose, sequence]);

  // Buka halaman langkah (bila perlu), tunggu elemennya muncul, lalu sorot.
  const ukur = useCallback(() => {
    const { el } = elemenLangkah(step);
    const r = el?.getBoundingClientRect();
    if (!terlihat(r)) { setSorot(null); return; }
    // Area yang lebih tinggi dari layar dipotong ke bagian yang terlihat.
    const top = Math.max(r.top, 8), bottom = Math.min(r.bottom, window.innerHeight - 8);
    setSorot({ top, left: r.left, width: r.width, height: bottom - top, right: r.right, bottom, besar: r.height > window.innerHeight * 0.5 });
  }, [step]);
  useEffect(() => {
    if (fase !== 'langkah') { setSorot(null); return undefined; }
    if (step.ke) {
      const [jalur, kueri] = step.ke.split('?');
      if (pathname !== jalur || (kueri && search !== `?${kueri}`)) { navigate(step.ke); return undefined; }
    }
    setSorot(null);
    let n = 0;
    const cari = setInterval(() => {
      const { el, klikEl } = elemenLangkah(step);
      if (el || ++n > 40) {
        clearInterval(cari);
        if (!el) { ukur(); return; }
        // Buka tab yang dimaksud (sekali per langkah), lalu gulir agar bagian atasnya terlihat.
        if (step.klik && klikEl && sudahDiklik.current !== i) { sudahDiklik.current = i; klikEl.click(); }
        const tinggi = el.getBoundingClientRect().height > window.innerHeight * 0.5;
        el.style.scrollMarginTop = '96px';
        el.scrollIntoView?.({ block: tinggi ? 'start' : 'center', behavior: 'smooth' });
        setTimeout(ukur, 450);
      }
    }, 120);
    return () => clearInterval(cari);
  }, [fase, i, step, pathname, search, navigate, ukur]);
  useEffect(() => {
    if (fase !== 'langkah') return undefined;
    let raf = 0;
    const ulang = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(ukur); };
    window.addEventListener('resize', ulang);
    window.addEventListener('scroll', ulang, true);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', ulang); window.removeEventListener('scroll', ulang, true); };
  }, [fase, ukur]);

  // Letakkan kartu di samping sorotan: kanan → bawah → atas; tanpa sorotan di tengah layar.
  useLayoutEffect(() => {
    const k = kartuRef.current;
    if (!k || fase !== 'langkah') return;
    const W = k.offsetWidth, H = k.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, m = 16, jarak = 20;
    const batas = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    if (vw < 640) {
      // Ponsel: panel di bawah layar; pindah ke atas bila yang disorot ada di separuh bawah (mis. bilah Simpan).
      if (!sorot) { setPosisi({ left: (vw - W) / 2, top: Math.max(m, (vh - H) / 2), arah: 'tengah' }); return; }
      const diBawah = !sorot.besar && sorot.top > vh / 2;
      setPosisi({ left: (vw - W) / 2, top: diBawah ? m + 56 : Math.max(m, vh - H - m), arah: diBawah ? 'atas-layar' : 'bawah-layar' });
      return;
    }
    if (!sorot) { setPosisi({ left: (vw - W) / 2, top: Math.max(m, (vh - H) / 2), arah: 'tengah' }); return; }
    if (sorot.besar) { setPosisi({ left: vw - W - m - 8, top: Math.max(m, vh - H - m - 8), arah: 'pojok' }); return; }
    if (sorot.right + jarak + W <= vw - m) {
      setPosisi({ left: sorot.right + jarak, top: batas(sorot.top + sorot.height / 2 - H / 2, m, vh - H - m), arah: 'kanan' });
    } else if (sorot.bottom + jarak + H <= vh - m) {
      setPosisi({ left: batas(sorot.left + sorot.width / 2 - W / 2, m, vw - W - m), top: sorot.bottom + jarak, arah: 'bawah' });
    } else {
      setPosisi({ left: batas(sorot.right - W, m, vw - W - m), top: Math.max(m, sorot.top - jarak - H), arah: 'atas' });
    }
  }, [sorot, fase, i, tanyaBuka, jawaban]);

  useEffect(() => { if (fase !== 'tutup') setTimeout(() => tombolUtamaRef.current?.focus({ preventScroll: true }), 60); }, [fase, i]);

  const tutup = useCallback((status) => { simpan(status); setFase('tutup'); setSorot(null); eira.settle(); }, [simpan, eira]);
  const lanjut = useCallback(() => (i >= langkah.length - 1 ? setFase('selesai') : setI((v) => v + 1)), [i, langkah.length]);
  const kembali = useCallback(() => setI((v) => Math.max(0, v - 1)), []);
  const babKini = daftarBab.findIndex((b) => i >= b.mulai && i < b.mulai + b.jumlah);
  const babBerikut = daftarBab[babKini + 1];
  const lewatiBab = useCallback(() => (babBerikut ? setI(babBerikut.mulai) : setFase('selesai')), [babBerikut]);
  const mulaiDari = (idx) => { setI(idx); setFase('langkah'); };

  useEffect(() => {
    if (fase === 'tutup') return undefined;
    const onKey = (e) => {
      if (diKolomIsian(e.target)) return;
      if (e.key === 'Escape') tutup(fase === 'selesai' ? 'selesai' : 'dilewati');
      if (fase === 'langkah' && e.key === 'ArrowRight') lanjut();
      if (fase === 'langkah' && e.key === 'ArrowLeft') kembali();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fase, tutup, lanjut, kembali]);

  const bukaHalaman = (aksi) => { tutup('dijeda'); navigate(aksi.to); };
  const tanya = (teks) => {
    const q = String(teks ?? pertanyaan).trim().slice(0, 300);
    if (!q) return;
    setPertanyaan('');
    // "ya" / "boleh" setelah Eira menawarkan halaman → buka halaman itu (tur dijeda)
    if (jawaban?.aksi && /^(ya|iya|ya boleh|boleh|oke|ok|buka|silakan|mau)[.!]*$/i.test(q)) { bukaHalaman(jawaban.aksi); return; }
    const r = smallTalk(q, { name: nama, greeting: getGreeting(), seed: i, now: new Date(), role: peran });
    eira.play(r ? 'nod' : 'listen', 1800);
    const aksi = ['navigate', 'offer'].includes(r?.action?.type) ? r.action : null;
    // Di dalam tur tawaran dibuka lewat tombol, jadi kalimat "Ketik "ya"…" dari obrolan biasa dibuang.
    const rapi = (r?.reply || '').replace(/\n*Mau saya buka [^\n]*?(?:Ketik \*"ya"\*[^\n]*)$/m, '').trim();
    setJawaban({
      q,
      teks: rapi || 'Pertanyaan ini lebih tepat dibahas di obrolan Eira atau Asisten AI. Lanjutkan tur, lalu klik saya di pojok kanan bawah.',
      aksi,
    });
  };

  if (fase === 'tutup' || !user) return null;

  /* ---------- Sambutan & penutup: kartu di tengah ---------- */
  if (fase === 'sambut' || fase === 'selesai') {
    const selesai = fase === 'selesai';
    return (
      <div className="eira-tur eira-tur--modal" role="presentation">
        <section className="eira-tur__sambut" role="dialog" aria-modal="true" aria-labelledby="eira-tur-judul">
          <button type="button" className="eira-tur__x" onClick={() => tutup(selesai ? 'selesai' : 'dilewati')} aria-label="Tutup perkenalan"><X size={18} /></button>
          <div className="eira-tur__panggung" aria-hidden="true">
            <span className="eira-tur__halo" />
            <div className="eira-tur__eira eira-tur__eira--hadir"><DentiMascot state={eira.state} size={148} track title="Eira" /></div>
          </div>
          <p className="eira-tur__eyebrow">{selesai ? 'Perkenalan selesai' : `Selamat datang di Dentiva · ${PERAN_LABEL[peran] || 'Pengguna'}`}</p>
          <h2 id="eira-tur-judul" className="eira-tur__judul">
            {selesai ? <>Anda siap memulai{nama ? `, ${nama}` : ''}.</> : <>{getGreeting()}{nama ? `, ${nama}` : ''}. Saya Eira.</>}
          </h2>
          <p className="eira-tur__lead">
            {selesai
              ? 'Berikut langkah pertama yang kami sarankan. Bila ragu di tengah jalan, klik saya di pojok kanan bawah.'
              : `Pemandu Anda di Dentiva. ${PEMBUKA[peran] || PEMBUKA.admin}`}
          </p>
          {selesai ? (
            <div className="eira-tur__lanjutan">
              {(LANJUTAN[peran] || []).map(([label, ke]) => (
                <button key={ke} type="button" onClick={() => { tutup('selesai'); navigate(ke); }}>
                  {label} <ArrowRight size={14} />
                </button>
              ))}
            </div>
          ) : (
            <>
              <ul className="eira-tur__meta" aria-label="Ringkasan perkenalan">
                <li><Check size={14} /> {daftarBab.length} bagian · {langkah.length} langkah</li>
                <li><Clock size={14} /> ± {Math.max(1, Math.round(langkah.length * 0.2))} menit</li>
                <li><MessageCircle size={14} /> Bisa bertanya di setiap langkah</li>
              </ul>
              <div className="eira-tur__bab-daftar" aria-label="Mulai dari bagian tertentu">
                <span>Atau langsung ke bagian:</span>
                {daftarBab.filter((b) => b.nama !== 'Penutup').map((b) => (
                  <button key={b.nama} type="button" onClick={() => mulaiDari(b.mulai)}>{b.nama}</button>
                ))}
              </div>
            </>
          )}
          <div className="eira-tur__aksi eira-tur__aksi--tengah">
            {!selesai && <button type="button" className="eira-tur__btn eira-tur__btn--hantu" onClick={() => tutup('dilewati')}>Nanti saja</button>}
            <button
              ref={tombolUtamaRef} type="button" className="eira-tur__btn eira-tur__btn--utama"
              onClick={() => (selesai ? tutup('selesai') : (setI(0), setFase('langkah')))}
            >
              {selesai ? 'Selesai' : 'Ikuti semua'} {!selesai && <ArrowRight size={16} />}
            </button>
          </div>
          <p className="eira-tur__catatan">Ulangi kapan saja dari menu profil → <b>Tur pengenalan</b>, atau ketik “mulai tur” kepada Eira.</p>
        </section>
      </div>
    );
  }

  /* ---------- Langkah: sorotan + kartu Eira ---------- */
  const terakhir = i === langkah.length - 1;
  const menuTersembunyi = !sorot && step.target?.startsWith('[data-tur="/');
  return (
    <div className="eira-tur" role="presentation" data-coba={step.coba && sorot ? 'true' : undefined}>
      <div className={`eira-tur__tirai${sorot ? '' : ' eira-tur__tirai--penuh'}`} />
      {sorot && (
        <div
          className="eira-tur__sorot" aria-hidden="true"
          style={{ top: sorot.top - 6, left: sorot.left - 6, width: sorot.width + 12, height: sorot.height + 12 }}
        />
      )}
      <section
        ref={kartuRef} className="eira-tur__kartu" data-arah={posisi?.arah || 'tengah'}
        style={posisi ? { left: posisi.left, top: posisi.top } : { visibility: 'hidden' }}
        role="dialog" aria-modal="true" aria-labelledby="eira-tur-langkah"
      >
        <header className="eira-tur__kepala">
          <div className="eira-tur__eira"><DentiMascot state={eira.state} size={52} title="Eira" /></div>
          <div className="eira-tur__siapa"><strong>Eira</strong><span>{step.bab || 'Pemandu Dentiva'}</span></div>
          <span className="eira-tur__hitung">{i + 1} / {langkah.length}</span>
        </header>
        <div className="eira-tur__progres" aria-hidden="true"><i style={{ width: `${((i + 1) / langkah.length) * 100}%` }} /></div>

        <div className="eira-tur__isi" key={i}>
          <h3 id="eira-tur-langkah">{step.judul}</h3>
          <Md text={step.isi} />
          {menuTersembunyi && <p className="eira-tur__petunjuk">Menu ini ada di daftar menu (tombol ☰ di kiri atas).</p>}
          {step.coba && sorot && <p className="eira-tur__coba"><MousePointerClick size={14} /> Area yang disorot bisa langsung Anda isi atau klik.</p>}
        </div>

        <div className="eira-tur__tanya">
          {!tanyaBuka ? (
            <button type="button" className="eira-tur__tanya-buka" onClick={() => { setTanyaBuka(true); eira.play('listen', 2000); }}>
              <MessageCircle size={15} /> Tanya Eira tentang ini
            </button>
          ) : (
            <>
              {jawaban && (
                <div className="eira-tur__jawab" aria-live="polite">
                  <p className="eira-tur__q">{jawaban.q}</p>
                  <Md text={jawaban.teks} />
                  {jawaban.aksi && (
                    <button type="button" className="eira-tur__tautan" onClick={() => bukaHalaman(jawaban.aksi)}>
                      Buka {jawaban.aksi.label} (tur dijeda) <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              )}
              {!jawaban && step.tanya && (
                <button type="button" className="eira-tur__saran" onClick={() => tanya(step.tanya)}>{step.tanya}</button>
              )}
              <form className="eira-tur__form" onSubmit={(e) => { e.preventDefault(); tanya(); }}>
                <input
                  autoFocus value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} maxLength={300}
                  placeholder="Tulis pertanyaan Anda…" aria-label="Pertanyaan untuk Eira"
                />
                <button type="submit" disabled={!pertanyaan.trim()} aria-label="Kirim pertanyaan"><Send size={15} /></button>
              </form>
            </>
          )}
        </div>

        <footer className="eira-tur__aksi">
          <button type="button" className="eira-tur__lewati" onClick={() => tutup('dilewati')}>Lewati tur</button>
          {babBerikut && babBerikut.nama !== 'Penutup' && (
            <button type="button" className="eira-tur__lewati" onClick={lewatiBab} title={`Lompat ke: ${babBerikut.nama}`}>
              Lewati bagian <ChevronsRight size={13} />
            </button>
          )}
          <span className="eira-tur__spasi" />
          {i > 0 && (
            <button type="button" className="eira-tur__btn eira-tur__btn--hantu" onClick={kembali} aria-label="Langkah sebelumnya">
              <ArrowLeft size={16} />
            </button>
          )}
          <button ref={tombolUtamaRef} type="button" className="eira-tur__btn eira-tur__btn--utama" onClick={lanjut}>
            {terakhir ? 'Selesai' : 'Lanjut'} {terakhir ? <Check size={16} /> : <ArrowRight size={16} />}
          </button>
        </footer>
      </section>
    </div>
  );
}
