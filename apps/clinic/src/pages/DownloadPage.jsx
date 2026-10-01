import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download, Monitor, Laptop, ShieldCheck, Zap, RefreshCw, Users, Printer, Tv,
  CheckCircle2, ChevronDown, ArrowRight, Lock, Cloud,
} from 'lucide-react';
import { supabase } from '../services/supabase';
import pkg from '../../package.json';

const BUCKET = 'downloads';
const FALLBACK_VERSION = pkg.version;

/** "Dentiva_1.10.0_x64-setup.exe" → "1.10.0" */
const versionOf = (name) => name.match(/_(\d+\.\d+\.\d+)_/)?.[1] ?? null;
const sizeOf = (bytes) => (bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : null);
const dateOf = (iso) => (iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null);

const publicUrl = (name) => supabase.storage.from(BUCKET).getPublicUrl(name, { download: name }).data.publicUrl;

// Nama berkas bawaan hasil build Tauri — dipakai bila daftar berkas tidak bisa dibaca.
const FALLBACK = {
  windows: `Dentiva_${FALLBACK_VERSION}_x64-setup.exe`,
  msi: `Dentiva_${FALLBACK_VERSION}_x64_en-US.msi`,
  mac: `Dentiva_${FALLBACK_VERSION}_universal.dmg`,
};

function detectOs() {
  const ua = navigator.userAgent || '';
  if (/Mac/i.test(ua) && !/iPhone|iPad/i.test(ua)) return 'mac';
  return 'windows';
}

const FEATURES = [
  { icon: Zap, title: 'Cepat & ringan', text: 'Terbuka dalam hitungan detik, hemat memori — nyaman untuk komputer resepsionis dan ruang praktik.' },
  { icon: Lock, title: 'Data terenkripsi', text: 'Rekam medis dienkripsi di server dan hanya terbaca oleh dokter. Tidak ada data pasien di komputer.' },
  { icon: Cloud, title: 'Satu akun, semua perangkat', text: 'Masuk dengan akun yang sama seperti versi web. Data selalu sinkron di semua komputer klinik.' },
  { icon: Users, title: 'Untuk seluruh tim klinik', text: 'Dokter, resepsionis, dan kasir bekerja di aplikasi yang sama sesuai hak akses masing-masing.' },
  { icon: Printer, title: 'Siap untuk kasir', text: 'Pembayaran, kwitansi, dan resep dari satu jendela. Cetak langsung ke printer thermal menyusul di pembaruan berikutnya.' },
  { icon: Tv, title: 'Layar antrean', text: 'Tampilkan antrean pasien di monitor atau TV ruang tunggu langsung dari komputer klinik.' },
];

const FAQ = [
  {
    q: 'Muncul peringatan "Windows protected your PC". Apakah aman?',
    a: 'Aman. Peringatan ini muncul untuk aplikasi baru yang belum dikenal Windows SmartScreen. Klik "More info" lalu "Run anyway". Peringatan akan hilang setelah sertifikat tanda tangan Dentiva aktif.',
  },
  {
    q: 'Di mana data pasien disimpan?',
    a: 'Di server Dentiva yang terenkripsi, bukan di komputer. Jika komputer rusak atau hilang, data klinik tetap aman — cukup pasang Dentiva di komputer lain dan masuk kembali.',
  },
  {
    q: 'Apa bedanya dengan versi web?',
    a: 'Fiturnya sama dan datanya sama. Versi desktop berjalan di jendelanya sendiri tanpa tab browser, terbuka lebih cepat, dan disiapkan untuk fitur khusus komputer klinik seperti cetak thermal dan layar antrean.',
  },
  {
    q: 'Macbook saya tidak bisa membuka aplikasinya.',
    a: 'Pada pembukaan pertama, klik kanan ikon Dentiva di folder Applications, pilih "Open", lalu "Open" sekali lagi. Selanjutnya Dentiva bisa dibuka seperti biasa.',
  },
];

function useInstallers() {
  const [state, setState] = useState({ loading: true, files: [] });
  useEffect(() => {
    supabase.storage.from(BUCKET)
      .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
      .then(({ data, error }) => setState({ loading: false, files: error ? [] : (data || []).filter((f) => f.id) }));
  }, []);

  return useMemo(() => {
    const pick = (ext, fallbackName) => {
      const f = state.files.find((x) => x.name.toLowerCase().endsWith(ext));
      const name = f?.name ?? fallbackName;
      return {
        found: Boolean(f),
        url: publicUrl(name),
        version: versionOf(name) ?? FALLBACK_VERSION,
        size: sizeOf(f?.metadata?.size),
        date: dateOf(f?.created_at),
      };
    };
    return {
      loading: state.loading,
      windows: pick('.exe', FALLBACK.windows),
      msi: pick('.msi', FALLBACK.msi),
      mac: pick('.dmg', FALLBACK.mac),
    };
  }, [state]);
}

function AppMockup() {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-amber-400/20 via-sky-400/10 to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1b2e] shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs font-medium text-white/50">Dentiva</span>
        </div>
        <div className="flex">
          <div className="hidden w-44 shrink-0 flex-col gap-2 border-r border-white/10 p-4 sm:flex">
            <div className="mb-3 flex items-center gap-2">
              <img src="/dentiva-logo.png" alt="" className="h-7 w-7 rounded-md bg-white p-0.5" />
              <span className="text-sm font-semibold text-white">Dentiva</span>
            </div>
            {['Dashboard', 'Jadwal', 'Pasien', 'Rekam Medis', 'Pembayaran', 'Laporan'].map((m, i) => (
              <div key={m} className={`rounded-lg px-3 py-2 text-xs ${i === 0 ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2b4f7e] font-semibold text-white' : 'text-white/45'}`}>{m}</div>
            ))}
          </div>
          <div className="flex-1 p-5">
            <div className="h-4 w-40 rounded bg-white/80" />
            <div className="mt-2 h-2.5 w-56 rounded bg-white/20" />
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[['Pasien', '1.284'], ['Hari ini', '24'], ['Pendapatan', 'Rp 8,4 jt'], ['Antrean', '6']].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] text-white/45">{l}</div>
                  <div className="mt-1 text-sm font-bold text-white">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-5 gap-3">
              <div className="col-span-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex h-24 items-end gap-1.5">
                  {[40, 62, 48, 75, 58, 88, 70, 95, 66, 80].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#c4a052] to-[#e8cf8f]" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="col-span-2 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-sky-400/30" />
                    <div className="h-2 flex-1 rounded bg-white/15" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 py-5 text-left">
        <span className="font-semibold text-slate-900">{q}</span>
        <ChevronDown size={20} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="-mt-1 pb-5 pr-8 leading-relaxed text-slate-600">{a}</p>}
    </div>
  );
}

/**
 * Halaman publik /unduh — Dentiva Desktop untuk Windows & macOS.
 * Berkas dibaca dari bucket Supabase Storage "downloads" (berkas terbaru per jenis);
 * bila daftar tidak terbaca, tautan memakai nama berkas bawaan build versi saat ini.
 */
export default function DownloadPage() {
  const os = useMemo(detectOs, []);
  const inst = useInstallers();
  const primary = os === 'mac'
    ? { ...inst.mac, label: 'Unduh untuk macOS', Icon: Laptop }
    : { ...inst.windows, label: 'Unduh untuk Windows', Icon: Monitor };
  const secondary = os === 'mac'
    ? { ...inst.windows, label: 'Windows' }
    : { ...inst.mac, label: 'macOS' };

  const platforms = [
    {
      key: 'windows', name: 'Windows', Icon: Monitor, file: inst.windows,
      req: ['Windows 10 atau 11 (64-bit)', 'RAM 4 GB, ruang kosong 200 MB', 'Koneksi internet'],
      extra: inst.msi.found ? { label: 'Paket .msi untuk instalasi massal (IT)', url: inst.msi.url } : null,
    },
    {
      key: 'mac', name: 'macOS', Icon: Laptop, file: inst.mac,
      req: ['macOS 11 Big Sur atau lebih baru', 'Intel & Apple Silicon (M1/M2/M3/M4)', 'Koneksi internet'],
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      {/* Navigasi */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link to="/login" className="flex items-center gap-2.5">
            <img src="/dentiva-logo.png" alt="Dentiva" className="h-9 w-9 rounded-xl bg-white p-1 shadow" />
            <span className="text-lg font-bold tracking-tight text-white">Dentiva</span>
          </Link>
          <Link to="/login" className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
            Masuk versi web
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0a1628] pb-20 pt-32 sm:pt-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,120,190,0.35),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3.5 py-1.5 text-xs font-semibold text-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> Dentiva Desktop {primary.version}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Klinik gigi Anda,{' '}
            <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-500 bg-clip-text text-transparent">kini di desktop.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
            Rekam medis, jadwal, antrean, dan kasir dalam satu aplikasi yang cepat dan aman
            untuk Windows dan macOS.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={primary.url}
              className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-7 py-4 text-base font-bold text-[#0a1628] shadow-lg shadow-amber-500/25 transition hover:shadow-amber-500/40"
            >
              <Download size={20} className="transition group-hover:translate-y-0.5" />
              {primary.label}
            </a>
            <a href={secondary.url} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
              Unduh untuk {secondary.label} <ArrowRight size={16} />
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            {[`Versi ${primary.version}`, primary.size, primary.label.endsWith('macOS') ? 'macOS 11+' : 'Windows 10 & 11'].filter(Boolean).join('  ·  ')}
          </p>

          <div className="mt-16">
            <AppMockup />
          </div>
        </div>
      </section>

      {/* Kepercayaan */}
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 text-center sm:px-6 md:grid-cols-4">
          {[
            [ShieldCheck, 'Enkripsi rekam medis'],
            [Cloud, 'Data tersimpan di cloud'],
            [RefreshCw, 'Sinkron web & desktop'],
            [CheckCircle2, 'Akses sesuai peran'],
          ].map(([Icon, t]) => (
            <div key={t} className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
              <Icon size={18} className="text-[#c4a052]" /> {t}
            </div>
          ))}
        </div>
      </section>

      {/* Fitur */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-[#c4a052]">Mengapa versi desktop</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Dibuat untuk ritme kerja klinik</h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/60">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2f5a8f] text-white">
                <Icon size={20} />
              </div>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform */}
      <section id="unduh" className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pilih sistem operasi Anda</h2>
            <p className="mt-3 text-slate-600">Pasang dalam kurang dari satu menit, lalu masuk dengan akun klinik Anda.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {platforms.map((p) => {
              const mine = os === p.key;
              return (
                <div key={p.key} className={`relative rounded-3xl bg-white p-8 shadow-sm ring-1 ${mine ? 'ring-2 ring-[#c4a052]' : 'ring-slate-200'}`}>
                  {mine && (
                    <span className="absolute -top-3 left-8 rounded-full bg-[#c4a052] px-3 py-1 text-xs font-bold text-white">Direkomendasikan untuk perangkat Anda</span>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0a1628] text-white">
                      <p.Icon size={26} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{p.name}</h3>
                      <p className="text-sm text-slate-500">
                        {[`Versi ${p.file.version}`, p.file.size, p.file.date].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-6 space-y-2.5">
                    {p.req.map((r) => (
                      <li key={r} className="flex items-center gap-2.5 text-slate-600">
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-500" /> {r}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={p.file.url}
                    className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-bold transition ${mine ? 'bg-[#0a1628] text-white hover:bg-[#13284a]' : 'border border-slate-300 text-slate-800 hover:bg-slate-50'}`}
                  >
                    <Download size={18} /> Unduh untuk {p.name}
                  </a>
                  {p.extra && (
                    <a href={p.extra.url} className="mt-3 block text-center text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline">
                      {p.extra.label}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cara pasang */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">Tiga langkah, langsung bekerja</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            ['Unduh', 'Pilih Windows atau macOS. Berkas installer berukuran kecil dan cepat diunduh.'],
            ['Pasang', 'Windows: jalankan berkas .exe. macOS: seret Dentiva ke folder Applications.'],
            ['Masuk', 'Gunakan email & password akun Dentiva Anda — data klinik langsung tersedia.'],
          ].map(([t, d], i) => (
            <div key={t} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#c4a052] text-xl font-extrabold text-[#c4a052]">{i + 1}</div>
              <h3 className="mt-5 text-lg font-bold">{t}</h3>
              <p className="mt-2 leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">Pertanyaan umum</h2>
          <div className="mt-10">
            {FAQ.map((f) => <FaqItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* CTA akhir */}
      <section className="relative overflow-hidden bg-[#0a1628]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(196,160,82,0.25),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Siap memindahkan klinik ke desktop?</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">Unduh Dentiva Desktop dan masuk dengan akun klinik Anda.</p>
          <a href={primary.url} className="mt-8 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-7 py-4 font-bold text-[#0a1628] shadow-lg shadow-amber-500/25">
            <Download size={20} /> {primary.label}
          </a>
        </div>
      </section>

      <footer className="bg-[#07101e] py-8 text-center text-sm text-slate-500">
        © 2026 Dentiva · Sistem Manajemen Klinik Gigi ·{' '}
        <Link to="/login" className="text-slate-300 hover:text-white">Masuk</Link>
      </footer>
    </div>
  );
}
