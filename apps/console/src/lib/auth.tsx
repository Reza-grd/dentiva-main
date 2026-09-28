import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { canPerform, type ActionName, type Operator } from "@dentiva/shared";
import { callConsole, ConsoleApiError } from "./api";
import { queryClient } from "./query";
import { supabase } from "./supabase";

/**
 * Status autentikasi Console:
 *   loading        → memeriksa sesi
 *   signed_out     → belum login
 *   set_password   → datang dari tautan undangan/reset, wajib buat password
 *   mfa_enroll     → login aal1, belum punya faktor TOTP → wajib daftar
 *   mfa_verify     → login aal1, punya faktor TOTP → wajib verifikasi kode
 *   denied         → aal2 tetapi bukan operator aktif
 *   ready          → aal2 + operator aktif
 */
export type AuthStatus = "loading" | "signed_out" | "set_password" | "mfa_enroll" | "mfa_verify" | "denied" | "ready";

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  operator: Operator | null;
  deniedReason: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  can: (action: ActionName) => boolean;
  completePasswordSetup: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Operator Console otomatis keluar setelah 30 menit tanpa aktivitas. */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function isPasswordSetupUrl(): boolean {
  const hash = window.location.hash;
  return window.location.pathname === "/set-password" || /type=(invite|recovery)/.test(hash);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [deniedReason, setDeniedReason] = useState<string | null>(null);
  const needsPassword = useRef(isPasswordSetupUrl());

  const evaluate = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setOperator(null);
      setStatus("signed_out");
      return;
    }
    // Akun klinik ditolak sebelum MFA, agar tidak ada faktor TOTP "nyasar" di akun klinik.
    if ((s.user.app_metadata as Record<string, unknown> | undefined)?.clinic_id) {
      setOperator(null);
      setDeniedReason("Ini akun klinik. Akun klinik tidak dapat mengakses Dentiva Console.");
      setStatus("denied");
      return;
    }
    if (needsPassword.current) {
      setStatus("set_password");
      return;
    }

    const { data: aal, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalErr || !aal) {
      setStatus("signed_out");
      return;
    }
    if (aal.currentLevel !== "aal2") {
      setStatus(aal.nextLevel === "aal2" ? "mfa_verify" : "mfa_enroll");
      return;
    }

    try {
      const me = await callConsole("operators.me");
      setOperator(me);
      setDeniedReason(null);
      setStatus("ready");
    } catch (err) {
      setOperator(null);
      if (err instanceof ConsoleApiError && err.code === "mfa_required") {
        setStatus("mfa_verify");
        return;
      }
      setDeniedReason(err instanceof Error ? err.message : "Akses ditolak");
      setStatus("denied");
    }
  }, []);

  const refresh = useCallback(async () => {
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    await evaluate(s);
  }, [evaluate]);

  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") needsPassword.current = true;
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "MFA_CHALLENGE_VERIFIED" || event === "PASSWORD_RECOVERY") {
        // Hindari deadlock supabase-js: jangan await panggilan Supabase di dalam callback.
        setTimeout(() => void evaluate(s), 0);
      } else if (event === "TOKEN_REFRESHED") {
        setSession(s);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [evaluate, refresh]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    setOperator(null);
    setStatus("signed_out");
  }, []);

  // Idle timeout
  useEffect(() => {
    if (status !== "ready") return;
    let timer = window.setTimeout(() => void signOut(), IDLE_TIMEOUT_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void signOut(), IDLE_TIMEOUT_MS);
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [status, signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      operator,
      deniedReason,
      refresh,
      signOut,
      can: (action) => canPerform(operator?.role, action),
      completePasswordSetup: () => {
        needsPassword.current = false;
        void refresh();
      },
    }),
    [status, session, operator, deniedReason, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}
