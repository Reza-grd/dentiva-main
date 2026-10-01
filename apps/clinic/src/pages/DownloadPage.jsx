import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Monitor, Laptop, ShieldCheck, Info, ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent } from '@dentiva/ui';
import { supabase } from '../services/supabase';

const BUCKET = 'downloads';

/** "Dentiva_1.10.0_x64-setup.exe" → "1.10.0" */
const versionOf = (name) => name.match(/_(\d+\.\d+\.\d+)_/)?.[1] ?? null;
const sizeOf = (bytes) => (bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '');
const dateOf = (iso) => (iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

function detectOs() {
  const ua = navigator.userAgent || '';
  if (/Mac/i.test(ua) && !/iPhone|iPad/i.test(ua)) return 'mac';
  if (/Windows/i.test(ua)) return 'windows';
  return null;
}

/**
 * Halaman publik /unduh: installer Dentiva Desktop untuk Windows & macOS.
 * Berkas diunggah ke bucket Supabase Storage "downloads" (publik); berkas terbaru
 * per jenis (.exe / .msi / .dmg) dipilih otomatis — cukup unggah berkas hasil build apa adanya.
 */
export default function DownloadPage() {
  const [files, setFiles] = useState(null);
  const [error, setError] = useState(false);
  const os = useMemo(detectOs, []);

  useEffect(() => {
    supabase.storage.from(BUCKET)
      .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
      .then(({ data, error: err }) => {
        if (err) { setError(true); setFiles([]); return; }
        setFiles((data || []).filter((f) => f.id));
      });
  }, []);

  const pick = (ext) => {
    const f = files?.find((x) => x.name.toLowerCase().endsWith(ext));
    if (!f) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(f.name, { download: f.name });
    return { url: data.publicUrl, version: versionOf(f.name), size: sizeOf(f.metadata?.size), date: dateOf(f.created_at) };
  };
  const win = pick('.exe');
  const msi = pick('.msi');
  const mac = pick('.dmg');

  const platforms = [
    {
      key: 'windows',
      title: 'Windows',
      subtitle: 'Windows 10 & 11 (64-bit)',
      icon: Monitor,
      file: win,
      extra: msi ? { label: 'Paket .msi (instalasi massal oleh IT)', url: msi.url } : null,
      steps: [
        'Buka berkas yang sudah diunduh.',
        'Jika muncul "Windows protected your PC", klik More info → Run anyway.',
        'Ikuti langkah instalasi, lalu buka Dentiva dari Start Menu.',
      ],
    },
    {
      key: 'mac',
      title: 'macOS',
      subtitle: 'macOS 11 ke atas (Intel & Apple Silicon)',
      icon: Laptop,
      file: mac,
      extra: null,
      steps: [
        'Buka berkas .dmg yang sudah diunduh.',
        'Seret ikon Dentiva ke folder Applications.',
        'Pembukaan pertama: klik kanan Dentiva → Open → Open.',
      ],
    },
  ];
  if (os === 'mac') platforms.reverse();

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col items-center text-center">
          <img src="/dentiva-logo.png" alt="Dentiva" className="h-20 w-20 object-contain" />
          <h1 className="mt-4 text-3xl font-bold text-text-primary sm:text-4xl">Unduh Dentiva Desktop</h1>
          <p className="mt-3 max-w-xl text-text-muted">
            Aplikasi Dentiva untuk komputer klinik. Data sama dengan versi web — masuk dengan akun yang sama.
          </p>
        </div>

        {error && (
          <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            Daftar unduhan gagal dimuat. Muat ulang halaman ini atau coba beberapa saat lagi.
          </p>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {platforms.map((p) => {
            const Icon = p.icon;
            const recommended = os === p.key;
            return (
              <Card key={p.key} className={recommended ? 'border-accent-primary shadow-lg shadow-accent-primary/10' : ''}>
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10 text-accent-primary">
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-text-primary">{p.title}</h2>
                      <p className="text-sm text-text-muted">{p.subtitle}</p>
                    </div>
                    {recommended && (
                      <span className="rounded-full bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-accent-primary">
                        Perangkat Anda
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    {files === null ? (
                      <div className="h-11 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
                    ) : p.file ? (
                      <>
                        <a href={p.file.url} rel="noopener">
                          <Button className="h-11 w-full gap-2 text-[15px] font-semibold">
                            <Download size={18} /> Unduh untuk {p.title}
                          </Button>
                        </a>
                        <p className="mt-2 text-center text-xs text-text-muted">
                          {[p.file.version && `Versi ${p.file.version}`, p.file.size, p.file.date].filter(Boolean).join(' · ')}
                        </p>
                        {p.extra && (
                          <a href={p.extra.url} className="mt-1 block text-center text-xs text-accent-primary hover:underline">
                            {p.extra.label}
                          </a>
                        )}
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-3 text-center text-sm text-text-muted">
                        Segera hadir
                      </div>
                    )}
                  </div>

                  <ol className="mt-6 space-y-2 text-sm text-text-muted">
                    {p.steps.map((s, i) => (
                      <li key={s} className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-xs font-semibold">{i + 1}</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3 rounded-xl bg-slate-100 dark:bg-white/5 p-4 text-sm text-text-muted">
            <ShieldCheck className="mt-0.5 shrink-0 text-accent-primary" size={18} />
            <p>Data pasien tetap tersimpan aman di server Dentiva (terenkripsi), bukan di komputer.</p>
          </div>
          <div className="flex gap-3 rounded-xl bg-slate-100 dark:bg-white/5 p-4 text-sm text-text-muted">
            <Info className="mt-0.5 shrink-0 text-accent-primary" size={18} />
            <p>Tidak ingin memasang aplikasi? Dentiva juga bisa dipakai langsung dari browser.</p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-accent-primary hover:underline">
            <ArrowLeft size={16} /> Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    </div>
  );
}
