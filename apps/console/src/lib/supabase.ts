import { createDentivaClient } from "@dentiva/supabase";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const APP_ENV = (import.meta.env.VITE_APP_ENV as string | undefined) ?? (import.meta.env.PROD ? "production" : "development");

/**
 * Klien Supabase Console. Dipakai HANYA untuk Auth (login, MFA, reset password).
 * Semua data dibaca/ditulis lewat console-api (lihat ./api.ts).
 * storageKey dipisah agar sesi Console tidak pernah tertukar dengan sesi aplikasi klinik.
 */
export const supabase = createDentivaClient({
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  storageKey: "dentiva-console-auth",
});
