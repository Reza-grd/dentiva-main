import { useRef, useState } from "react";
import { Button, Input } from "@dentiva/ui";
import { Field } from "@/components/Field";
import { supabase } from "@/lib/supabase";
import { AuthLayout, FormAlert } from "./AuthLayout";
import { Turnstile, type TurnstileHandle } from "./Turnstile";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const captcha = useRef<TurnstileHandle>(null);

  async function ambilCaptcha(): Promise<string | undefined | null> {
    try {
      return await captcha.current?.ambilToken();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verifikasi keamanan gagal.");
      return null;
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const captchaToken = await ambilCaptcha();
    if (captchaToken === null) return setPending(false);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      ...(captchaToken ? { options: { captchaToken } } : {}),
    });
    captcha.current?.reset();
    setPending(false);
    if (err) {
      // Pesan generik: jangan bocorkan apakah email terdaftar.
      setError(
        /captcha/i.test(err.message)
          ? "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi."
          : "Email atau password salah.",
      );
    }
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const captchaToken = await ambilCaptcha();
    if (captchaToken === null) return setPending(false);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/set-password`,
      ...(captchaToken ? { captchaToken } : {}),
    });
    captcha.current?.reset();
    setPending(false);
    setInfo("Jika email terdaftar sebagai operator, tautan reset password sudah dikirim.");
  }

  if (mode === "forgot") {
    return (
      <AuthLayout title="Reset password" subtitle="Kami akan mengirim tautan untuk membuat password baru.">
        <form onSubmit={onForgot} className="space-y-4">
          {info && <FormAlert tone="info">{info}</FormAlert>}
          {error && <FormAlert>{error}</FormAlert>}
          <Field label="Email" htmlFor="forgot-email" required>
            <Input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Turnstile ref={captcha} />
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
        <Turnstile ref={captcha} />
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
