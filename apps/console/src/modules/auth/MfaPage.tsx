import { useEffect, useState } from "react";
import { Button, Input } from "@dentiva/ui";
import { Field } from "@/components/Field";
import { LoadingBlock } from "@/components/States";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AuthLayout, FormAlert } from "./AuthLayout";

const FRIENDLY_NAME = "Dentiva Console";

/** Kode TOTP 6 digit. */
function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      id="mfa-code"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className="text-center font-mono text-lg tracking-[0.5em]"
      autoFocus
      required
    />
  );
}

export function MfaPage({ mode }: { mode: "enroll" | "verify" }) {
  return mode === "enroll" ? <Enroll /> : <Verify />;
}

function Enroll() {
  const { refresh, signOut } = useAuth();
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Bersihkan faktor TOTP yang belum terverifikasi dari percobaan sebelumnya.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.factor_type === "totp" && f.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: FRIENDLY_NAME });
      if (cancelled) return;
      if (err || !data) {
        setError(err?.message ?? "Gagal memulai pendaftaran MFA");
        return;
      }
      setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factor) return;
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    setPending(false);
    if (err) {
      setError("Kode tidak cocok. Pastikan jam di ponsel Anda akurat lalu coba lagi.");
      setCode("");
      return;
    }
    await refresh();
  }

  return (
    <AuthLayout
      title="Aktifkan verifikasi dua langkah"
      subtitle="Wajib untuk semua operator. Pindai kode QR dengan Google Authenticator, 1Password, atau aplikasi TOTP lain."
    >
      {!factor && !error && <LoadingBlock label="Menyiapkan kode QR…" />}
      {error && !factor && <FormAlert>{error}</FormAlert>}
      {factor && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex justify-center rounded-xl border border-border bg-white p-4">
            <img src={factor.qr} alt="Kode QR untuk aplikasi authenticator" className="h-44 w-44" />
          </div>
          <details className="text-xs text-text-muted">
            <summary className="cursor-pointer">Tidak bisa memindai? Masukkan kode manual</summary>
            <code className="mt-2 block break-all rounded bg-background p-2 font-mono text-text-primary">{factor.secret}</code>
          </details>
          {error && <FormAlert>{error}</FormAlert>}
          <Field label="Kode 6 digit dari aplikasi" htmlFor="mfa-code" required>
            <CodeInput value={code} onChange={setCode} />
          </Field>
          <Button type="submit" className="w-full" isLoading={pending} disabled={code.length !== 6}>
            Verifikasi & aktifkan
          </Button>
        </form>
      )}
      <button type="button" onClick={() => void signOut()} className="mt-4 w-full text-center text-sm text-text-muted hover:text-text-primary">
        Keluar
      </button>
    </AuthLayout>
  );
}

function Verify() {
  const { refresh, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { data: list, error: listErr } = await supabase.auth.mfa.listFactors();
    const totp = list?.totp?.find((f) => f.status === "verified");
    if (listErr || !totp) {
      setPending(false);
      setError("Faktor TOTP tidak ditemukan. Hubungi owner Console untuk reset MFA.");
      return;
    }
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
    setPending(false);
    if (err) {
      setError("Kode tidak cocok atau sudah kedaluwarsa.");
      setCode("");
      return;
    }
    await refresh();
  }

  return (
    <AuthLayout title="Verifikasi dua langkah" subtitle="Masukkan kode 6 digit dari aplikasi authenticator Anda.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}
        <Field label="Kode" htmlFor="mfa-code" required>
          <CodeInput value={code} onChange={setCode} />
        </Field>
        <Button type="submit" className="w-full" isLoading={pending} disabled={code.length !== 6}>
          Verifikasi
        </Button>
        <button type="button" onClick={() => void signOut()} className="w-full text-center text-sm text-text-muted hover:text-text-primary">
          Gunakan akun lain
        </button>
      </form>
    </AuthLayout>
  );
}
