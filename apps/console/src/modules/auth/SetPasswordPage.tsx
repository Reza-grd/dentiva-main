import { useState } from "react";
import { Button, Input } from "@dentiva/ui";
import { Field } from "@/components/Field";
import { useAuth } from "@/lib/auth";
import { passwordProblems } from "@/lib/password";
import { supabase } from "@/lib/supabase";
import { AuthLayout, FormAlert } from "./AuthLayout";

export function SetPasswordPage() {
  const { completePasswordSetup, signOut } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const problems = passwordProblems(pw);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (problems.length) return setError(`Password belum memenuhi: ${problems.join(", ")}.`);
    if (pw !== pw2) return setError("Konfirmasi password tidak sama.");
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setPending(false);
    if (err) {
      setError(err.message);
      return;
    }
    window.history.replaceState(null, "", "/");
    completePasswordSetup();
  }

  return (
    <AuthLayout title="Buat password" subtitle="Setelah ini Anda akan diminta mengaktifkan verifikasi dua langkah.">
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
