import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../common/ToastNotification';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';

const FEATURES = [
  'Rekam medis digital terintegrasi',
  'Manajemen jadwal & kunjungan pasien',
  'Laporan keuangan real-time',
  'Multi-role akses (Admin, Dokter, Resepsionis)',
];

const LoginPage = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [isLoading, setIsLoading]       = useState(false);

  const { signIn, user, userProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (user && userProfile) navigate(`/${userProfile.role}`, { replace: true });
  }, [user, userProfile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email wajib diisi'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Format email tidak valid'); return; }
    if (!password) { setError('Password wajib diisi'); return; }
    if (password.length < 6) { setError('Password minimal 6 karakter'); return; }

    setIsLoading(true);
    try {
      const { success, error: signInError } = await signIn(email, password);
      if (!success) setError(signInError || 'Email atau password salah');
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      toast.error(err.message || 'Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B0F17] transition-colors duration-300">
      {/* ========== LEFT PANEL (branding) ========== */}
      <div className="hidden lg:flex lg:w-[58%] bg-gradient-to-br from-[#0F4C81] via-[#083562] to-[#051f3e] flex-col justify-center items-start px-16 py-12 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-[60px]" />
        <div className="absolute -bottom-15 -left-10 w-60 h-60 rounded-full bg-orange-500/10 blur-[50px]" />
        <div className="absolute top-[45%] right-[10%] w-40 h-40 rounded-full bg-cyan-500/5 blur-[40px]" />

        {/* Logo */}
        <div className="flex items-center gap-3.5 mb-14 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl shadow-lg border border-white/20 overflow-hidden">
            <img src="/dentiva-logo.png" alt="Dentiva Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white tracking-tight leading-none mb-1">
              Dentiva
            </div>
            <div className="text-[10px] text-white/50 tracking-[0.12em] font-bold">
              KLINIK GIGI DIGITAL
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative max-w-lg z-10">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight mb-5">
            Kelola Klinik Gigi{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent">
              Lebih Cerdas
            </span>
          </h1>

          <p className="text-base text-white/70 leading-relaxed mb-10">
            Sistem manajemen klinik gigi all-in-one. Dari rekam medis hingga laporan keuangan, semuanya terintegrasi dalam satu platform.
          </p>

          {/* Feature list */}
          <div className="flex flex-col gap-3.5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={13} className="text-cyan-400" />
                </div>
                <span className="text-sm text-white/80 font-semibold">
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom SVG dental illustration (subtle) */}
        <div className="absolute bottom-8 right-10 opacity-[0.06] text-[160px] select-none pointer-events-none">
          🦷
        </div>
      </div>

      {/* ========== RIGHT PANEL (form) ========== */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-8 py-10 overflow-y-auto bg-slate-50 dark:bg-[#0B0F17] transition-colors duration-300">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-lg shadow-blue-500/20 flex items-center justify-center text-2xl mx-auto mb-3 overflow-hidden">
            <img src="/dentiva-logo.png" alt="Dentiva Logo" className="w-full h-full object-cover" />
          </div>
          <div className="text-2xl font-extrabold text-[#0F4C81] dark:text-blue-400">
            Dentiva
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 tracking-[0.08em] font-bold mt-0.5">
            KLINIK GIGI DIGITAL
          </div>
        </div>

        {/* Form card */}
        <Card className="w-full max-w-[400px]">
          <CardContent className="px-6 py-9 sm:px-8">
            <h2 className="text-2xl font-black text-slate-905 dark:text-slate-100 mb-1">
              Selamat Datang
            </h2>
            <p className="text-[13.5px] font-semibold text-slate-400 dark:text-slate-500 mb-7">
              Masuk ke akun Anda untuk melanjutkan
            </p>

            {/* Error */}
            {error && (
              <div className="flex gap-2.5 items-start p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl mb-5 animate-in fade-in">
                <AlertCircle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-rose-600 dark:text-rose-400 font-bold leading-normal">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  disabled={isLoading}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="w-full mt-7"
              size="lg"
            >
              {!isLoading && (
                <>
                  <LogIn size={17} className="mr-2" />
                  Masuk
                </>
              )}
            </Button>
          </form>
        </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-8 text-xs text-slate-300 dark:text-slate-600 text-center font-medium">
          © 2026 Dentiva · Sistem Manajemen Klinik Gigi · All rights reserved
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
