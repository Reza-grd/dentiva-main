import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, CreditCard, MessageSquare, Send, Trash2, X, Info, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/ToastNotification';
import { notifikasiService } from '../../services/notifikasiService';

const LABEL_PERAN = { admin: 'Manajer Klinik', dokter: 'Dokter', resepsionis: 'Resepsionis' };

function waktuRelatif(iso) {
  const detik = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (detik < 60) return 'baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} mnt lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  if (detik < 7 * 86400) return `${Math.floor(detik / 86400)} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

const IkonJenis = ({ jenis }) => {
  const Ikon = jenis === 'langganan' ? CreditCard : jenis === 'pesan' ? MessageSquare : Info;
  const warna = jenis === 'langganan' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-accent-primary/15 text-accent-primary';
  return <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${warna}`}><Ikon size={15} /></span>;
};

function keteranganSasaran(n) {
  if (n.penerima_id) return 'pribadi';
  if (n.penerima_role) return `ke ${LABEL_PERAN[n.penerima_role] || n.penerima_role}`;
  return 'ke semua staf';
}

function FormKirim({ userId, onTerkirim, onBatal }) {
  const { addToast } = useToast();
  const [staf, setStaf] = useState([]);
  const [sasaran, setSasaran] = useState('semua');
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [mengirim, setMengirim] = useState(false);

  useEffect(() => {
    notifikasiService.daftarStaf().then((d) => setStaf(d.filter((s) => s.id !== userId))).catch(() => setStaf([]));
  }, [userId]);

  const kirim = async (e) => {
    e.preventDefault();
    if (!judul.trim()) return;
    const s = sasaran === 'semua' ? {}
      : sasaran.startsWith('peran:') ? { penerima_role: sasaran.slice(6) }
      : { penerima_id: sasaran.slice(5) };
    try {
      setMengirim(true);
      await notifikasiService.kirim({ judul, isi, sasaran: s });
      addToast('Pesan terkirim', 'success');
      onTerkirim();
    } catch (err) {
      addToast(`Gagal mengirim: ${err.message}`, 'error');
    } finally {
      setMengirim(false);
    }
  };

  return (
    <form onSubmit={kirim} className="space-y-2.5 border-b border-border p-3">
      <label className="block text-xs font-medium text-text-muted">
        Kepada
        <select value={sasaran} onChange={(e) => setSasaran(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-text-primary">
          <option value="semua">Semua staf klinik</option>
          <optgroup label="Peran">
            {Object.entries(LABEL_PERAN).map(([k, v]) => <option key={k} value={`peran:${k}`}>Semua {v}</option>)}
          </optgroup>
          {staf.length > 0 && (
            <optgroup label="Orang">
              {staf.map((s) => <option key={s.id} value={`user:${s.id}`}>{s.full_name} · {LABEL_PERAN[s.role] || s.role}</option>)}
            </optgroup>
          )}
        </select>
      </label>
      <input value={judul} onChange={(e) => setJudul(e.target.value)} maxLength={120} required placeholder="Judul, mis. Pasien a.n. Budi sudah datang"
        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-text-primary" />
      <textarea value={isi} onChange={(e) => setIsi(e.target.value)} maxLength={1000} rows={2} placeholder="Pesan (opsional)"
        className="w-full resize-none rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-text-primary" />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onBatal} className="rounded-lg px-3 py-1.5 text-sm text-text-muted hover:bg-background">Batal</button>
        <button type="submit" disabled={mengirim || !judul.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
          {mengirim ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Kirim
        </button>
      </div>
    </form>
  );
}

export default function NotifikasiLonceng() {
  const { user, userProfile } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [buka, setBuka] = useState(false);
  const [tulis, setTulis] = useState(false);
  const [tab, setTab] = useState('semua');
  const [daftar, setDaftar] = useState([]);
  const [memuat, setMemuat] = useState(false);
  const userId = user?.id;
  const clinicId = userProfile?.clinic_id;

  const muat = useCallback(async () => {
    if (!userId) return;
    try {
      setMemuat(true);
      setDaftar(await notifikasiService.daftar(userId));
    } catch (err) {
      console.warn('Notifikasi gagal dimuat:', err.message);
    } finally {
      setMemuat(false);
    }
  }, [userId]);

  useEffect(() => { muat(); }, [muat]);

  // Realtime + jaring pengaman berkala (jika koneksi realtime terputus).
  useEffect(() => {
    if (!clinicId) return undefined;
    const berhenti = notifikasiService.pantau(clinicId, (n) => {
      muat();
      if (n.pengirim_id !== userId) addToast(`🔔 ${n.judul}`, 'info');
    });
    const t = setInterval(muat, 120_000);
    return () => { berhenti(); clearInterval(t); };
  }, [clinicId, userId, muat, addToast]);

  const belumDibaca = daftar.filter((n) => !n.sudahDibaca).length;
  const terlihat = useMemo(
    () => daftar.filter((n) => tab === 'semua' || (tab === 'pesan' ? n.jenis === 'pesan' : n.jenis !== 'pesan')),
    [daftar, tab],
  );

  const klik = async (n) => {
    if (!n.sudahDibaca) {
      setDaftar((d) => d.map((x) => (x.id === n.id ? { ...x, sudahDibaca: true } : x)));
      notifikasiService.tandaiDibaca(n.id).catch(() => {});
    }
    if (n.tautan) { setBuka(false); navigate(n.tautan); }
  };

  const tandaiSemua = async () => {
    setDaftar((d) => d.map((x) => ({ ...x, sudahDibaca: true })));
    try { await notifikasiService.tandaiSemuaDibaca(); } catch { muat(); }
  };

  const hapus = async (e, n) => {
    e.stopPropagation();
    setDaftar((d) => d.filter((x) => x.id !== n.id));
    try { await notifikasiService.hapus(n.id); } catch (err) { addToast(`Gagal menghapus: ${err.message}`, 'error'); muat(); }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setBuka((b) => !b); if (!buka) muat(); }}
        aria-label={belumDibaca ? `Notifikasi, ${belumDibaca} belum dibaca` : 'Notifikasi'}
        aria-expanded={buka}
        className="relative p-2 rounded-full text-text-muted hover:bg-background transition-colors"
      >
        <Bell size={20} />
        {belumDibaca > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {belumDibaca > 9 ? '9+' : belumDibaca}
          </span>
        )}
      </button>

      {buka && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setBuka(false)} />
          <div className="fixed inset-x-3 top-16 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">Notifikasi</p>
              <div className="flex items-center gap-1">
                {belumDibaca > 0 && (
                  <button type="button" onClick={tandaiSemua} title="Tandai semua dibaca"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted hover:bg-background hover:text-text-primary">
                    <CheckCheck size={14} /> Tandai dibaca
                  </button>
                )}
                <button type="button" onClick={() => setTulis((t) => !t)}
                  className="inline-flex items-center gap-1 rounded-lg bg-accent-primary/10 px-2 py-1 text-xs font-semibold text-accent-primary hover:bg-accent-primary/20">
                  {tulis ? <X size={14} /> : <Send size={14} />} {tulis ? 'Tutup' : 'Kirim pesan'}
                </button>
              </div>
            </div>

            {tulis && <FormKirim userId={userId} onBatal={() => setTulis(false)} onTerkirim={() => { setTulis(false); muat(); }} />}

            <div className="flex gap-1 border-b border-border px-3 py-2">
              {[['semua', 'Semua'], ['pesan', 'Pesan staf'], ['info', 'Sistem & langganan']].map(([k, v]) => (
                <button key={k} type="button" onClick={() => setTab(k)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${tab === k ? 'bg-accent-primary text-white' : 'text-text-muted hover:bg-background'}`}>
                  {v}
                </button>
              ))}
            </div>

            <ul className="flex-1 overflow-y-auto">
              {memuat && daftar.length === 0 && <li className="p-6 text-center text-sm text-text-muted">Memuat…</li>}
              {!memuat && terlihat.length === 0 && (
                <li className="p-8 text-center text-sm text-text-muted">
                  <Bell size={22} className="mx-auto mb-2 opacity-40" />
                  Belum ada notifikasi.
                </li>
              )}
              {terlihat.map((n) => (
                <li key={n.id}>
                  <div role="button" tabIndex={0} onClick={() => klik(n)} onKeyDown={(e) => e.key === 'Enter' && klik(n)}
                    className={`group flex cursor-pointer gap-3 border-b border-border/60 px-4 py-3 hover:bg-background ${n.sudahDibaca ? '' : 'bg-accent-primary/5'}`}>
                    <IkonJenis jenis={n.jenis} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm text-text-primary ${n.sudahDibaca ? '' : 'font-semibold'}`}>{n.judul}</p>
                      {n.isi && <p className="mt-0.5 whitespace-pre-line text-xs text-text-muted line-clamp-3">{n.isi}</p>}
                      <p className="mt-1 text-[11px] text-text-muted">
                        {n.jenis === 'pesan'
                          ? `${n.milikSaya ? 'Anda' : (n.pengirim?.full_name || 'Staf')} · ${keteranganSasaran(n)} · `
                          : n.jenis === 'langganan' ? 'Langganan · ' : 'Sistem · '}
                        {waktuRelatif(n.created_at)}
                      </p>
                    </div>
                    {!n.sudahDibaca && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-accent-primary" aria-label="Belum dibaca" />}
                    {n.milikSaya && n.jenis === 'pesan' && (
                      <button type="button" onClick={(e) => hapus(e, n)} aria-label="Hapus pesan"
                        className="self-start rounded p-1 text-text-muted opacity-0 hover:text-red-500 group-hover:opacity-100 focus:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
