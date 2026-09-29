import React, { useState } from 'react';
import { Building2, AlertCircle, LogOut } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@dentiva/ui';
import { useAuth } from '../../contexts/AuthContext';
import { clinicFields, validateClinicForm, Field } from './RegisterClinicPage';

/**
 * Langkah kedua pendaftaran mandiri: email sudah terverifikasi, akun belum
 * terhubung ke klinik. Data diisi ulang dari user_metadata.signup_clinic
 * (bisa diperbaiki), lalu register_clinic() membuat klinik berstatus 'pending'.
 */
const CompleteRegistration = () => {
  const { user, completeClinicRegistration, signOut } = useAuth();
  const meta = user?.user_metadata?.signup_clinic ?? {};
  const [form, setForm] = useState({
    clinicName: meta.clinic_name ?? '',
    clinicPhone: meta.clinic_phone ?? '',
    city: meta.city ?? '',
    province: meta.province ?? '',
    ownerName: user?.user_metadata?.full_name ?? '',
    ownerPhone: meta.owner_phone ?? '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (name) => (e) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = validateClinicForm(form);
    setErrors(er);
    if (Object.keys(er).length) return;
    setSubmitting(true);
    setServerError('');
    const res = await completeClinicRegistration({
      clinicName: form.clinicName.trim(),
      clinicPhone: form.clinicPhone.trim(),
      city: form.city.trim(),
      province: form.province.trim(),
      ownerName: form.ownerName.trim(),
      ownerPhone: form.ownerPhone.trim(),
    });
    setSubmitting(false);
    // Sukses → AuthContext memuat status 'pending' dan App menampilkan halaman menunggu persetujuan.
    if (!res.success) setServerError(res.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F17] p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6">
            <div className="w-12 h-12 bg-accent-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Building2 className="text-accent-primary" size={24} aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Email terverifikasi — satu langkah lagi</h1>
            <p className="text-sm text-text-muted mt-1">
              Periksa kembali data klinik Anda ({user?.email}), lalu kirim pendaftaran untuk diverifikasi tim Dentiva.
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
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button type="button" variant="outline" onClick={signOut} className="sm:flex-1 gap-2" disabled={submitting}>
                <LogOut size={16} aria-hidden="true" /> Keluar
              </Button>
              <Button type="submit" className="sm:flex-1" isLoading={submitting}>
                Kirim pendaftaran
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteRegistration;
