import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MailCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@dentiva/ui';
import { useAuth } from '../../contexts/AuthContext';

// Sama dengan kebijakan password Supabase Auth proyek ini (min. 8, huruf + angka).
const passwordProblems = (pw) => {
  const p = [];
  if (pw.length < 8) p.push('minimal 8 karakter');
  if (!/[a-zA-Z]/.test(pw)) p.push('huruf');
  if (!/\d/.test(pw)) p.push('angka');
  return p;
};
const PHONE_RE = /^[0-9+() -]{8,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const clinicFields = [
  { name: 'clinicName', label: 'Nama klinik', placeholder: 'Klinik Gigi Senyum Sehat', required: true },
  { name: 'clinicPhone', label: 'Telepon klinik', placeholder: '0812-3456-7890', type: 'tel', required: true },
  { name: 'city', label: 'Kota / kabupaten', placeholder: 'Bandung' },
  { name: 'province', label: 'Provinsi', placeholder: 'Jawa Barat' },
  { name: 'ownerName', label: 'Nama pemilik / penanggung jawab', placeholder: 'drg. Rina Pratiwi', required: true },
  { name: 'ownerPhone', label: 'No. HP pemilik (WhatsApp)', placeholder: '0812-3456-7890', type: 'tel', required: true },
];

export const validateClinicForm = (f) => {
  const e = {};
  if ((f.clinicName || '').trim().length < 3) e.clinicName = 'Minimal 3 karakter';
  if (!PHONE_RE.test(f.clinicPhone || '')) e.clinicPhone = 'Nomor telepon tidak valid';
  if ((f.ownerName || '').trim().length < 3) e.ownerName = 'Minimal 3 karakter';
  if (!PHONE_RE.test(f.ownerPhone || '')) e.ownerPhone = 'Nomor HP tidak valid';
  return e;
};

export const Field = ({ label, error, required, children }) => (
  <div>
    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
      {label}
      {required && <span className="text-red-500"> *</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

/**
 * Halaman publik "Daftarkan klinik". Membuat akun pemilik; klinik dibuat setelah
 * email terverifikasi dan menunggu persetujuan tim Dentiva (status 'pending').
 */
const RegisterClinicPage = () => {
  const { signUpClinic } = useAuth();
  const [form, setForm] = useState({
    clinicName: '', clinicPhone: '', city: '', province: '', ownerName: '', ownerPhone: '',
    email: '', password: '', password2: '', agree: false,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [showPw, setShowPw] = useState(false);

  const set = (name) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = validateClinicForm(form);
    if (!EMAIL_RE.test(form.email)) er.email = 'Format email tidak valid';
    const pwp = passwordProblems(form.password);
    if (pwp.length) er.password = `Belum memenuhi: ${pwp.join(', ')}`;
    if (form.password !== form.password2) er.password2 = 'Konfirmasi password tidak sama';
    if (!form.agree) er.agree = 'Wajib disetujui';
    setErrors(er);
    if (Object.keys(er).length) return;

    setSubmitting(true);
    setServerError('');
    const res = await signUpClinic({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      ownerName: form.ownerName.trim(),
      ownerPhone: form.ownerPhone.trim(),
      clinicName: form.clinicName.trim(),
      clinicPhone: form.clinicPhone.trim(),
      city: form.city.trim(),
      province: form.province.trim(),
    });
    setSubmitting(false);
    if (!res.success) {
      setServerError(res.error);
      return;
    }
    // Tanpa konfirmasi email, sesi langsung aktif dan App menampilkan langkah berikutnya.
    if (res.needsEmailConfirmation) setSentTo(form.email.trim());
  };

  if (sentTo) {
    return (
      <Shell>
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
            <MailCheck className="text-emerald-600" size={30} aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cek email Anda</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
            Kami mengirim tautan verifikasi ke <strong>{sentTo}</strong>. Buka tautan tersebut untuk menyelesaikan
            pendaftaran klinik. Email bisa tiba beberapa menit kemudian — periksa juga folder Spam.
          </p>
          <Link to="/login" className="text-sm font-medium text-accent-primary underline">
            Kembali ke halaman masuk
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6">
        <div className="w-12 h-12 bg-accent-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <Building2 className="text-accent-primary" size={24} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Daftarkan klinik Anda</h1>
        <p className="text-sm text-text-muted mt-1">
          Setelah diverifikasi tim Dentiva (biasanya 1×24 jam kerja), klinik Anda mendapat masa uji coba gratis 14
          hari.
        </p>
      </div>

      {serverError && (
        <div className="mb-5 bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{serverError}</p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clinicFields.map((f) => (
            <Field key={f.name} label={f.label} error={errors[f.name]} required={f.required}>
              <Input type={f.type || 'text'} value={form[f.name]} onChange={set(f.name)} placeholder={f.placeholder} disabled={submitting} />
            </Field>
          ))}
        </div>

        <hr className="border-border" />

        <Field label="Email pemilik (untuk masuk)" error={errors.email} required>
          <Input type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="nama@email.com" disabled={submitting} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Password" error={errors.password} required>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={set('password')} disabled={submitting} className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted bg-transparent border-0" aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <Field label="Ulangi password" error={errors.password2} required>
            <Input type={showPw ? 'text' : 'password'} autoComplete="new-password" value={form.password2} onChange={set('password2')} disabled={submitting} />
          </Field>
        </div>
        <p className="text-xs text-text-muted">Minimal 8 karakter, berisi huruf dan angka.</p>

        <label className="flex items-start gap-2 text-sm text-text-primary">
          <input type="checkbox" checked={form.agree} onChange={set('agree')} className="mt-1" disabled={submitting} />
          <span>
            Saya menyetujui Ketentuan Layanan dan Kebijakan Privasi Dentiva, serta menyatakan data yang saya isi benar.
            {errors.agree && <span className="block text-xs text-red-500">{errors.agree}</span>}
          </span>
        </label>

        <Button type="submit" className="w-full h-11" isLoading={submitting}>
          Daftarkan klinik
        </Button>
        <p className="text-sm text-center text-text-muted">
          Sudah punya akun? <Link to="/login" className="font-medium text-accent-primary underline">Masuk</Link>
        </p>
      </form>
    </Shell>
  );
};

const Shell = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F17] p-4">
    <Card className="w-full max-w-2xl">
      <CardContent className="p-6 sm:p-8">{children}</CardContent>
    </Card>
  </div>
);

export default RegisterClinicPage;
