import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, AlertCircle, MapPin, Phone } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@dentiva/ui';
import { supabase } from '../services/supabase';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
// Tanggal kalender murni (YYYY-MM-DD) dihitung di UTC agar tidak bergeser oleh zona waktu perangkat.
const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const dowOf = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/**
 * Halaman publik booking online: /booking/<slug-klinik>. Data dikirim ke RPC
 * submit_booking_request (validasi jadwal, kuota, batas spam, enkripsi di server).
 */
export default function BookingPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ doctorId: '', date: '', time: '', name: '', phone: '', complaint: '', agree: false });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    supabase.rpc('get_booking_page', { p_slug: slug }).then(({ data, error: err }) => {
      if (err) setPage({ ok: false, reason: 'error' });
      else setPage(data);
    });
  }, [slug]);

  const doctor = page?.doctors?.find((d) => d.id === form.doctorId);
  const today = page?.today;

  // Tanggal praktik 60 hari ke depan untuk dokter terpilih
  const dates = useMemo(() => {
    if (!doctor || !today) return [];
    const days = new Set(doctor.schedules.map((s) => s.hari));
    const out = [];
    for (let i = 0; i <= 60; i++) {
      const iso = addDays(today, i);
      if (days.has(dowOf(iso))) out.push(iso);
    }
    return out;
  }, [doctor, today]);

  // Slot 30 menit dalam jam praktik hari terpilih
  const slots = useMemo(() => {
    if (!doctor || !form.date) return [];
    const dow = dowOf(form.date);
    const now = new Date();
    const nowMin = form.date === today ? now.getHours() * 60 + now.getMinutes() : -1;
    const out = [];
    for (const s of doctor.schedules.filter((x) => x.hari === dow)) {
      for (let m = toMin(s.mulai); m + 30 <= toMin(s.selesai); m += 30) {
        if (m > nowMin) out.push(toHHMM(m));
      }
    }
    return [...new Set(out)];
  }, [doctor, form.date, today]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v, ...(k === 'doctorId' ? { date: '', time: '' } : {}), ...(k === 'date' ? { time: '' } : {}) }));
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.doctorId || !form.date || !form.time) return setError('Pilih dokter, tanggal, dan jam.');
    if (form.name.trim().length < 2) return setError('Nama wajib diisi.');
    if (!/^(\+?62|0)8[0-9\s-]{7,15}$/.test(form.phone.trim())) return setError('Nomor WhatsApp tidak valid (contoh 0812-3456-7890).');
    if (!form.agree) return setError('Mohon setujui penggunaan data untuk konfirmasi jadwal.');
    setSubmitting(true);
    const { data, error: err } = await supabase.rpc('submit_booking_request', {
      p_slug: slug, p_dokter_id: form.doctorId, p_date: form.date, p_time: form.time,
      p_name: form.name.trim(), p_phone: form.phone.trim(), p_complaint: form.complaint.trim() || null,
    });
    setSubmitting(false);
    if (err) return setError(err.message);
    setDone({ ...data, doctor: doctor?.name, date: form.date, time: form.time });
  };

  const shell = (children) => (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] flex items-start sm:items-center justify-center p-4">
      <Card className="w-full max-w-xl my-6"><CardContent className="p-6 sm:p-8">{children}</CardContent></Card>
    </div>
  );

  if (!page) return shell(<p className="text-sm text-gray-500 text-center">Memuat…</p>);

  if (!page.ok) {
    return shell(
      <div className="text-center">
        <AlertCircle className="mx-auto text-amber-500 mb-3" size={32} />
        <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Booking online tidak tersedia</h1>
        <p className="text-sm text-gray-500">
          {page.reason === 'disabled' ? 'Klinik ini belum membuka booking online. Silakan hubungi klinik langsung.' : 'Klinik tidak ditemukan. Periksa kembali tautan Anda.'}
        </p>
      </div>,
    );
  }

  if (done) {
    return shell(
      <div className="text-center">
        <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={40} />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Permintaan terkirim</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {page.clinic.name} akan mengonfirmasi jadwal Anda melalui WhatsApp. Jadwal belum pasti sebelum dikonfirmasi klinik.
        </p>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-left space-y-1">
          <p><span className="text-gray-500">Kode booking:</span> <strong className="font-mono">{done.reference}</strong></p>
          <p><span className="text-gray-500">Dokter:</span> {done.doctor}</p>
          <p><span className="text-gray-500">Waktu:</span> {HARI[dowOf(done.date)]}, {new Date(`${done.date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · {done.time} WIB</p>
        </div>
      </div>,
    );
  }

  const noDoctors = page.doctors.length === 0;

  return shell(
    <>
      <div className="mb-6">
        <div className="w-11 h-11 rounded-2xl bg-accent-primary/10 flex items-center justify-center mb-3">
          <CalendarCheck className="text-accent-primary" size={22} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{page.clinic.name}</h1>
        <p className="text-sm text-gray-500 mt-1">Booking jadwal periksa gigi</p>
        <div className="mt-3 space-y-1 text-xs text-gray-500">
          {page.clinic.address && <p className="flex items-start gap-1.5"><MapPin size={13} className="mt-0.5 flex-shrink-0" />{page.clinic.address}{page.clinic.city ? `, ${page.clinic.city}` : ''}</p>}
          {page.clinic.phone && <p className="flex items-center gap-1.5"><Phone size={13} />{page.clinic.phone}</p>}
        </div>
      </div>

      {noDoctors ? (
        <p className="text-sm text-gray-500">Jadwal dokter belum tersedia. Silakan hubungi klinik langsung.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Label text="Dokter">
            <select value={form.doctorId} onChange={set('doctorId')} className="glass-input w-full px-4 py-2.5 rounded-xl">
              <option value="">Pilih dokter…</option>
              {page.doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name} — {[...new Set(d.schedules.map((s) => HARI[s.hari]))].join(', ')}</option>
              ))}
            </select>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Label text="Tanggal">
              <select value={form.date} onChange={set('date')} disabled={!doctor} className="glass-input w-full px-4 py-2.5 rounded-xl disabled:opacity-50">
                <option value="">{doctor ? 'Pilih tanggal…' : 'Pilih dokter dulu'}</option>
                {dates.map((d) => (
                  <option key={d} value={d}>{HARI[dowOf(d)]}, {new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</option>
                ))}
              </select>
            </Label>
            <Label text="Jam">
              <select value={form.time} onChange={set('time')} disabled={!form.date} className="glass-input w-full px-4 py-2.5 rounded-xl disabled:opacity-50">
                <option value="">{form.date ? (slots.length ? 'Pilih jam…' : 'Tidak ada slot') : 'Pilih tanggal dulu'}</option>
                {slots.map((t) => <option key={t} value={t}>{t} WIB</option>)}
              </select>
            </Label>
          </div>
          <Label text="Nama lengkap"><Input value={form.name} onChange={set('name')} maxLength={100} autoComplete="name" /></Label>
          <Label text="Nomor WhatsApp"><Input type="tel" value={form.phone} onChange={set('phone')} placeholder="0812-3456-7890" autoComplete="tel" /></Label>
          <Label text="Keluhan (opsional)">
            <textarea value={form.complaint} onChange={set('complaint')} maxLength={500} rows={3} className="glass-input w-full px-4 py-2.5 rounded-xl resize-none" placeholder="mis. gigi geraham kiri bawah nyeri" />
          </Label>
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.agree} onChange={set('agree')} className="mt-1" />
            <span>Saya setuju data ini digunakan klinik untuk menghubungi saya dan mengonfirmasi jadwal.</span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full h-11" isLoading={submitting}>Kirim permintaan booking</Button>
        </form>
      )}
    </>,
  );
}

const Label = ({ text, children }) => (
  <div>
    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{text}</label>
    {children}
  </div>
);
