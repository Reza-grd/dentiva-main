import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Check, X, MessageCircle, UserPlus, RefreshCw } from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@dentiva/ui';
import { supabase } from '../../services/supabase';
import { encryptionService } from '../../services/encryptionService';
import { useAuth } from '../../contexts/AuthContext';
import { useClinicSettings } from '../../contexts/ClinicSettingsContext';
import { useToast } from '../common/ToastNotification';

const STATUS = {
  pending: { label: 'Menunggu', variant: 'warning' },
  confirmed: { label: 'Dikonfirmasi', variant: 'success' },
  rejected: { label: 'Ditolak', variant: 'danger' },
  cancelled: { label: 'Dibatalkan', variant: 'secondary' },
};
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const fmtDate = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${HARI[d.getUTCDay()]}, ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
};
const waNumber = (phone) => (phone || '').replace(/[^0-9]/g, '').replace(/^0/, '62');

/** Permintaan booking online dari halaman publik /booking/<slug>. */
export default function BookingRequests() {
  const { userProfile } = useAuth();
  const { settings } = useClinicSettings();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const navigate = useNavigate();
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const canHandle = ['admin', 'resepsionis'].includes(userProfile?.role);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('booking_requests')
      .select('id, requested_date, requested_time, patient_name, patient_phone, complaint, status, reference_code, created_at, note, dokter:users!booking_requests_dokter_id_fkey(full_name, gelar_depan)')
      .order('requested_date', { ascending: true })
      .order('requested_time', { ascending: true })
      .limit(200);
    if (status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) {
      toastRef.current.error('Gagal memuat booking: ' + error.message);
      setLoading(false);
      return;
    }
    const list = data || [];
    const plain = await encryptionService.decryptBatch(list.flatMap((r) => [r.patient_name, r.patient_phone, r.complaint || '']));
    setRows(list.map((r, i) => ({ ...r, patient_name: plain[i * 3], patient_phone: plain[i * 3 + 1], complaint: plain[i * 3 + 2] })));
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const setRowStatus = async (row, next) => {
    let note = null;
    if (next === 'rejected') {
      note = window.prompt('Alasan penolakan (opsional, untuk catatan internal):') ?? null;
    }
    const { error } = await supabase
      .from('booking_requests')
      .update({ status: next, handled_by: userProfile.id, handled_at: new Date().toISOString(), note })
      .eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success(next === 'confirmed' ? 'Booking dikonfirmasi — kabari pasien lewat WhatsApp.' : 'Booking ditolak.');
    load();
  };

  const waLink = (row, kind) => {
    const clinic = settings?.clinic_name || 'klinik kami';
    const doctor = [row.dokter?.gelar_depan, row.dokter?.full_name].filter(Boolean).join(' ');
    const when = `${fmtDate(row.requested_date)} pukul ${row.requested_time.slice(0, 5)} WIB`;
    const text = kind === 'confirmed'
      ? `Halo ${row.patient_name}, booking Anda di ${clinic} (kode ${row.reference_code}) sudah DIKONFIRMASI: ${when} dengan ${doctor}. Mohon datang 10 menit lebih awal. Terima kasih.`
      : `Halo ${row.patient_name}, mohon maaf booking Anda di ${clinic} (kode ${row.reference_code}) untuk ${when} belum dapat kami terima. Silakan balas pesan ini untuk memilih waktu lain.`;
    return `https://wa.me/${waNumber(row.patient_phone)}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="text-[var(--color-accent)]" /> Booking Online
          </h1>
          <p className="text-sm text-gray-500">Permintaan jadwal dari pasien lewat halaman booking klinik.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['pending', 'confirmed', 'rejected', 'all'].map((s) => (
            <Button key={s} size="sm" variant={status === s ? 'primary' : 'outline'} onClick={() => setStatus(s)}>
              {s === 'all' ? 'Semua' : STATUS[s].label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={load} aria-label="Muat ulang"><RefreshCw size={14} /></Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Memuat…</p>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-gray-500">Tidak ada permintaan booking.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white">{r.patient_name}</span>
                    <Badge variant={STATUS[r.status].variant}>{STATUS[r.status].label}</Badge>
                    <span className="font-mono text-xs text-gray-400">{r.reference_code}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {fmtDate(r.requested_date)} · {r.requested_time.slice(0, 5)} WIB · {[r.dokter?.gelar_depan, r.dokter?.full_name].filter(Boolean).join(' ') || 'Dokter'}
                  </p>
                  <p className="text-xs text-gray-500">WA {r.patient_phone}{r.complaint ? ` · Keluhan: ${r.complaint}` : ''}</p>
                  {r.note && <p className="text-xs text-gray-400 italic">Catatan: {r.note}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status === 'pending' && canHandle && (
                    <>
                      <Button size="sm" className="gap-1" onClick={() => setRowStatus(r, 'confirmed')}><Check size={14} /> Konfirmasi</Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setRowStatus(r, 'rejected')}><X size={14} /> Tolak</Button>
                    </>
                  )}
                  {(r.status === 'confirmed' || r.status === 'rejected') && (
                    <a href={waLink(r, r.status)} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 h-8 px-3 text-xs rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                      <MessageCircle size={14} /> Kabari via WA
                    </a>
                  )}
                  {r.status === 'confirmed' && (
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => navigate('/pasien/daftar', { state: { fromBooking: { nama: r.patient_name, no_wa: r.patient_phone } } })}>
                      <UserPlus size={14} /> Daftarkan pasien
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
