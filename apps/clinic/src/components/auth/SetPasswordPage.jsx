import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@dentiva/ui';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

const problemsOf = (pw) => {
  const p = [];
  if (pw.length < 8) p.push('minimal 8 karakter');
  if (!/[a-zA-Z]/.test(pw)) p.push('huruf');
  if (!/\d/.test(pw)) p.push('angka');
  return p;
};

/**
 * Tujuan tautan undangan (dari Dentiva Console / admin klinik) dan tautan reset password.
 * Supabase membuat sesi dari tautan tersebut; user lalu membuat password sendiri.
 */
const SetPasswordPage = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const problems = problemsOf(pw);

  const submit = async (e) => {
    e.preventDefault();
    if (problems.length) return setError(`Password belum memenuhi: ${problems.join(', ')}.`);
    if (pw !== pw2) return setError('Konfirmasi password tidak sama.');
    setSaving(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    if (err) {
      setSaving(false);
      return setError(err.message);
    }
    await supabase.rpc('record_login');
    setSaving(false);
    navigate(userProfile ? `/${userProfile.role}` : '/', { replace: true });
  };

  if (!loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0B0F17]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Tautan tidak valid atau kedaluwarsa</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Minta admin klinik atau tim Dentiva mengirim ulang undangan, atau gunakan "Lupa password" di halaman login.
            </p>
            <Button onClick={() => navigate('/login', { replace: true })} className="w-full">Ke halaman login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0B0F17]">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center mb-4">
            <KeyRound className="text-[var(--color-accent)]" size={24} aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Buat password</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-6">
            {user?.email ? <>Untuk akun <strong>{user.email}</strong>.</> : null} Gunakan minimal 8 karakter dengan huruf dan angka.
          </p>
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password baru</label>
              <Input id="new-password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
            </div>
            <div>
              <label htmlFor="new-password-2" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Ulangi password</label>
              <Input id="new-password-2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" isLoading={saving} disabled={loading}>Simpan & masuk</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetPasswordPage;
