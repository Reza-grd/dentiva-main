import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isDesktop, DOWNLOAD_URL } from '../../utils/platform';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../common/ToastNotification';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@dentiva/ui';
import { Input } from '@dentiva/ui';
import { FormError } from '@dentiva/ui';
import { Card, CardContent } from '@dentiva/ui';

const FEATURES = [
  'Rekam medis, odontogram, dan resep digital',
  'Jadwal, booking online, dan pengingat WhatsApp',
  'Kasir, stok bahan, dan HPP per tindakan',
  'Akses sesuai peran: manajer, dokter, resepsionis',
];

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid').min(1, 'Email wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const GENERIC_LOGIN_ERROR = 'Email atau password salah.';
const NETWORK_LOGIN_ERROR = 'Tidak dapat terhubung ke server. Periksa koneksi Anda.';
const RATE_LIMIT_LOGIN_ERROR = 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';

export const normalizeLoginError = (msg) => {
  if (!msg) return '';
  const text = String(msg);

  // 1. Batas laju (HTTP 429 / over_request_rate_limit)
  if (/429|rate[_\s-]?limit|too many requests|terlalu banyak percobaan/i.test(text)) {
    return RATE_LIMIT_LOGIN_ERROR;
  }

  // 2. Galat jaringan (fetch gagal / koneksi terputus / server tidak terjangkau)
  if (
    /failed to fetch|networkerror|fetch failed|load failed|network request failed|tidak dapat terhubung|err_internet|err_connection|err_name_not_resolved/i.test(
      text
    )
  ) {
    return NETWORK_LOGIN_ERROR;
  }

  // 3. Galat kredensial (HTTP 400 invalid login credentials / invalid_grant / user not found)
  if (
    /invalid login credentials|invalid_credentials|invalid_grant|email not confirmed|user not found|invalid email or password|email atau password salah/i.test(
      text
    )
  ) {
    return GENERIC_LOGIN_ERROR;
  }

  // 4. Pesan status akun / validasi form lain (mis. akun ditangguhkan, lupa password tanpa isi email)
  return text;
};

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const { signIn, requestPasswordReset, user, userProfile, error: authError } = useAuth();
  const displayError = normalizeLoginError(serverError || authError);
  const [resetState, setResetState] = useState(null); // null | 'sending' | 'sent'
  const navigate = useNavigate();
  const toast = useToast();

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  useEffect(() => {
    if (user && userProfile) navigate(`/${userProfile.role}`, { replace: true });
  }, [user, userProfile, navigate]);

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const { success, error: signInError } = await signIn(data.email, data.password);
      if (!success) setServerError(normalizeLoginError(signInError || GENERIC_LOGIN_ERROR));
    } catch (err) {
      setServerError(normalizeLoginError(err?.message || 'Terjadi kesalahan. Silakan coba lagi.'));
      toast.error(err.message || 'Terjadi kesalahan saat login');
    }
  };

  const onForgotPassword = async () => {
    const email = (getValues('email') || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setServerError('Isi email Anda di kolom Email terlebih dahulu, lalu klik "Lupa password?".');
      return;
    }
    setServerError('');
    setResetState('sending');
    const res = await requestPasswordReset(email);
    if (!res.success) {
      setResetState(null);
      setServerError(res.error);
      return;
    }
    setResetState('sent');
  };

  return (
    <div className="min-h-screen flex bg-background transition-colors duration-300">
      {/* ========== PANEL KIRI (merek; navy solid, selaras iklan peluncuran) ========== */}
      <div className="hidden lg:flex lg:w-[56%] bg-[#0E1B31] flex-col justify-center items-start px-16 py-12 relative overflow-hidden">

        {/* Logo */}
        <div className="flex items-center gap-3.5 mb-12 [@media(max-height:760px)]:mb-8 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-white p-2 flex items-center justify-center overflow-hidden">
            <img src="/dentiva-logo.svg" alt="Dentiva Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-white tracking-tight leading-none mb-1">
              Dentiva
            </div>
            <div className="text-xs text-white/60">
              Klinik gigi digital
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative max-w-[560px] z-10">
          <h1 className="text-[42px] [@media(max-height:760px)]:text-[34px] font-normal text-white leading-[1.12] mb-5">
            Dental Klinik yang tertata,{' '}
            <em className="text-[#D9B36B]">dari pasien datang hingga laporan bulanan.</em>
          </h1>

          <p className="text-base text-white/70 leading-relaxed mb-10 [@media(max-height:760px)]:mb-7 max-w-md">
            Satu aplikasi untuk rekam medis, jadwal, kasir, stok bahan, hingga laporan keuangan klinik gigi Anda.
          </p>

          {/* Feature list */}
          <div className="flex flex-col gap-3.5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle size={16} className="text-[#D9B36B] flex-shrink-0" />
                <span className="text-sm text-white/80">
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ========== RIGHT PANEL (form) ========== */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-8 py-10 overflow-y-auto bg-background transition-colors duration-300">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white p-2 flex items-center justify-center mx-auto mb-3 overflow-hidden border border-border">
            <img src="/dentiva-logo.svg" alt="Dentiva Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-2xl font-semibold text-accent-primary">
            Dentiva
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            Klinik gigi digital
          </div>
        </div>

        {/* Form card */}
        <Card className="w-full max-w-[400px] bg-card border-border">
          <CardContent className="px-6 py-9 sm:px-8">
            <div className="mb-8">
              <h2 className="font-display text-[28px] font-medium leading-tight text-text-primary mb-1.5">
                Masuk ke Dentiva
              </h2>
              <p className="text-sm text-text-muted">
                Gunakan email dan password akun klinik Anda.
              </p>
            </div>

            {/* Error Message */}
            {displayError && (
              <div role="alert" className="mb-6 bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium text-red-700 dark:text-red-400 leading-snug">
                  {displayError}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                  placeholder="nama@email.com"
                  disabled={isSubmitting}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    error={errors.password?.message}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    disabled={isSubmitting}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-text-primary hover:bg-background rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  disabled={isSubmitting || resetState === 'sending'}
                  className="text-xs font-medium text-accent-primary hover:underline bg-transparent border-0 cursor-pointer"
                >
                  {resetState === 'sending' ? 'Mengirim…' : 'Lupa password?'}
                </button>
              </div>
              {resetState === 'sent' && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 -mt-2">
                  Jika email terdaftar, tautan untuk membuat password baru sudah dikirim. Periksa juga folder Spam.
                </p>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 text-[15px] font-semibold bg-accent-primary hover:opacity-90 text-white border-0"
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? 'Memeriksa…' : 'Masuk'}
                </Button>
              </div>
            </form>
            <p className="mt-6 text-sm text-center text-text-muted">
              Belum menggunakan Dentiva?{' '}
              <Link to="/daftar" className="font-semibold text-accent-primary hover:underline">Daftarkan klinik Anda</Link>
            </p>
            {!isDesktop && (
              <p className="mt-2 text-sm text-center text-text-muted">
                <a href={DOWNLOAD_URL} className="font-semibold text-accent-primary hover:underline">Unduh aplikasi desktop</a>
                {' '}untuk Windows &amp; macOS
              </p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-8 text-xs text-text-muted text-center font-medium">
          © 2026 Dentiva · Sistem manajemen klinik gigi
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

