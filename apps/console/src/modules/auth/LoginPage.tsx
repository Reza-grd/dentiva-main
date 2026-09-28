import { useState } from "react";
import { Button, Input } from "@dentiva/ui";
import { Field } from "@/components/Field";
import { supabase } from "@/lib/supabase";
import { AuthLayout, FormAlert } from "./AuthLayout";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    if (err) {
      // Pesan generik: jangan bocorkan apakah email terdaftar.
      setError("Email atau password salah.");
    }
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/set-password`,
    });
    setPending(false);
    setInfo("Jika email terdaftar sebagai operator, tautan reset password sudah dikirim.");
  }

  if (mode === "forgot") {
    return (
      <AuthLayout title="Reset password" subtitle="Kami akan mengirim tautan untuk membuat password baru.">
        <form onSubmit={onForgot} className="space-y-4">
          {info && <FormAlert tone="info">{info}</FormAlert>}
          <Field label="Email" htmlFor="forgot-email" required>
            <Input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button type="submit" className="w-full" isLoading={pending}>
            Kirim tautan reset
          </Button>
          <button type="button" className="w-full text-center text-sm text-text-muted hover:text-text-primary" onClick={() => setMode("login")}>
            Kembali ke login
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Masuk" subtitle="Gunakan akun operator Dentiva. Verifikasi dua langkah wajib.">
      <form onSubmit={onLogin} className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}
        <Field label="Email" htmlFor="login-email" required>
          <Input id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password" htmlFor="login-password" required>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" className="w-full" isLoading={pending}>
          Masuk
        </Button>
        <button type="button" className="w-full text-center text-sm text-text-muted hover:text-text-primary" onClick={() => setMode("forgot")}>
          Lupa password?
        </button>
      </form>
    </AuthLayout>
  );
}
