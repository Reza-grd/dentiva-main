import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type DentivaClient = SupabaseClient<Database>;

export interface CreateClientConfig {
  url: string | undefined;
  anonKey: string | undefined;
  /** Kunci localStorage sesi. Pisahkan Console dan klinik agar sesi tidak tercampur di domain yang sama. */
  storageKey?: string;
  options?: SupabaseClientOptions<"public">;
}

/**
 * Pembuat klien Supabase untuk aplikasi web.
 * Hanya menerima anon key — service role key TIDAK PERNAH boleh ada di kode aplikasi.
 */
export function createDentivaClient({ url, anonKey, storageKey, options }: CreateClientConfig): DentivaClient {
  if (!url || !anonKey) {
    throw new Error("VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY wajib diisi (lihat .env.example).");
  }
  if (looksLikeServiceRoleKey(anonKey)) {
    throw new Error("Service role key terdeteksi di konfigurasi frontend. Gunakan anon key.");
  }
  return createClient<Database>(url, anonKey, {
    ...options,
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      ...(storageKey ? { storageKey } : {}),
      ...options?.auth,
    },
  });
}

/** Cek payload JWT: role=service_role berarti kunci yang salah ikut ter-bundle. */
export function looksLikeServiceRoleKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json)?.role === "service_role";
  } catch {
    return false;
  }
}
