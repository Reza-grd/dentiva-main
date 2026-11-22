import { useEffect, useState } from "react";
import { Button, Input } from "@dentiva/ui";
import { Field } from "@/components/Field";
import { useAuth } from "@/lib/auth";
import { passwordProblems } from "@/lib/password";
import { supabase } from "@/lib/supabase";
import { AuthLayout, FormAlert } from "./AuthLayout";

/**
 * Buat / atur ulang password dari tautan undangan atau "Lupa password".
 * Akun yang sudah memakai verifikasi dua langkah wajib memasukkan kode authenticator dulu:
 * layanan Auth menolak ganti password dari sesi tanpa MFA (aal1).
 */
export function SetPasswordPage() {
  const { completePasswordSetup, signOut } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [kode, setKode] = useState("");
  const [perluKode, setPerluKode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const problems = passwordProblems(pw);

  useEffect(() => {
    void supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (data?.nextLevel === "aal2" && data.currentLevel !== "aal2") setPerluKode(true);
    });
  }, []);

  async function verifikasiKode(): Promise<boolean> {
    const { data: faktor } = await supabase.auth.mfa.listFactors();
    const totp = faktor?.totp?.find((f) => f.status === "verified");
    if (!totp) {
      setError("Faktor verifikasi dua langkah tidak ditemukan. Hubungi owner Console.");
      return false;
    }
    const { error: vErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code: kode.trim() });
    if (vErr) {
      setError("Kode verifikasi salah atau kedaluwarsa. Masukkan kode terbaru dari aplikasi authenticator.");
      return false;
    }
    setPerluKode(false);
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (problems.length) return setError(`Password belum memenuhi: ${problems.join(", ")}.`);
    if (pw !== pw2) return setError("Konfirmasi password tidak sama.");
    if (perluKode && !/^\d{6}$/.test(kode)) return setError("Masukkan 6 digit kode dari aplikasi authenticator.");
    setPending(true);
    setError(null);
    if (perluKode && !(await verifikasiKode())) {
      setPending(false);
      return;
    }
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setPending(false);
    if (err) {
      if (/aal2/i.test(err.message)) {
        setPerluKode(true);
        setError("Akun ini memakai verifikasi dua langkah. Masukkan kode dari aplikasi authenticator, lalu simpan lagi.");
      } else {
        setError(err.message);
      }
      return;
    }
    window.history.replaceState(null, "", "/");
    completePasswordSetup();
  }

  return (
    <AuthLayout
      title="Buat password"
      subtitle={perluKode ? "Akun ini memakai verifikasi dua langkah." : "Setelah ini Anda akan diminta mengaktifkan verifikasi dua langkah."}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}
        <Field
          label="Password baru"
          htmlFor="new-password"
          required
          hint={pw && problems.length ? `Kurang: ${problems.join(", ")}` : "Minimal 12 karakter, huruf besar, huruf kecil, dan angka."}
        >
          <Input id="new-password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
        </Field>
        <Field label="Ulangi password" htmlFor="new-password-2" required>
          <Input id="new-password-2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
        </Field>
        {perluKode && (
          <Field label="Kode verifikasi dua langkah" htmlFor="kode-mfa" required hint="6 digit dari Google Authenticator atau aplikasi sejenis.">
            <Input
              id="kode-mfa" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={kode}
              onChange={(e) => setKode(e.target.value.replace(/\D/g, "").slice(0, 6))} required
            />
          </Field>
        )}
        <Button type="submit" className="w-full" isLoading={pending}>
          Simpan password
        </Button>
        <button type="button" onClick={() => void signOut()} className="w-full text-center text-sm text-text-muted hover:text-text-primary">
          Batal
        </button>
      </form>
    </AuthLayout>
  );
}
