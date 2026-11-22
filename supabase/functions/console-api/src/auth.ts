import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { decodeJwtPayload } from "./http.ts";
import type { AuthAdmin, Identity } from "./types.ts";

export function createAdminClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

/**
 * Verifikasi token lewat Supabase Auth (tanda tangan + sesi masih hidup),
 * lalu baca klaim `aal` dari payload JWT.
 */
export function createTokenVerifier(admin: SupabaseClient) {
  return async function verifyToken(token: string): Promise<Identity | null> {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return null;

    const payload = decodeJwtPayload(token);
    if (!payload || payload.sub !== data.user.id) return null;

    return {
      userId: data.user.id,
      email: data.user.email ?? null,
      aal: typeof payload.aal === "string" ? payload.aal : null,
      appMetadata: (data.user.app_metadata ?? {}) as Record<string, unknown>,
    };
  };
}

export function createAuthAdmin(admin: SupabaseClient): AuthAdmin {
  return {
    async createUser({ email, fullName, appMetadata }) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { full_name: fullName },
        app_metadata: appMetadata ?? {},
      });
      if (error || !data.user) {
        throw Object.assign(new Error(error?.message ?? "Gagal membuat akun"), { code: "auth_create_failed" });
      }
      return { id: data.user.id };
    },

    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(`Gagal menghapus akun ${userId}: ${error.message}`);
    },

    async sendInvite(email, redirectTo) {
      const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (error) throw new Error(`Gagal mengirim undangan: ${error.message}`);
    },

    async sendPasswordReset(email, redirectTo) {
      const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw new Error(`Gagal mengirim email reset: ${error.message}`);
    },

    async buatTautan(jenis, email, redirectTo) {
      // Undangan untuk akun yang sudah ada bisa ditolak GoTrue → pakai tautan pemulihan (sama-sama membuka halaman buat password).
      const urutan: ("invite" | "recovery")[] = jenis === "invite" ? ["invite", "recovery"] : ["recovery"];
      let pesan = "";
      for (const type of urutan) {
        const { data, error } = await admin.auth.admin.generateLink({ type, email, options: { redirectTo } } as Parameters<typeof admin.auth.admin.generateLink>[0]);
        const link = data?.properties?.action_link;
        if (!error && link) return link;
        pesan = error?.message ?? "tautan kosong";
      }
      throw new Error(`Gagal membuat tautan: ${pesan}`);
    },
  };
}
