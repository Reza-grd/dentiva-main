/**
 * Edge Function: satusehat-kfa
 * Pencarian & verifikasi kode obat di Kamus Farmasi dan Alat Kesehatan (KFA) resmi
 * SATUSEHAT, menggantikan daftar kode contoh (93000001, …) yang dulu ada di aplikasi.
 *
 *   POST { action: "search", keyword, page? }            → staf klinik aktif (admin/dokter)
 *   POST { action: "verify", masterBahanId, kfaCode }    → admin klinik
 *
 * "verify" mengambil produk dari API KFA di server lalu menyimpan kode, nama resmi,
 * dan bentuk sediaan ke master_bahan dengan kfa_verified_at. Kolom verifikasi hanya
 * bisa diisi service_role (trigger master_bahan_kfa_guard), sehingga browser tidak
 * bisa menandai kode sembarang sebagai terverifikasi. MedicationRequest hanya
 * dikirim untuk obat yang terverifikasi.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { getCorsHeaders } from "../_shared/corsHelper.ts";
import { getAccessToken } from "../_shared/satusehatAuth.ts";
import { getKfaBaseUrl } from "../_shared/satusehatConfig.ts";

type KfaProduct = {
  kfa_code: string;
  name: string;
  active?: boolean;
  state?: string;
  manufacturer?: string;
  uom?: { name?: string };
  dosage_form?: { code?: string; name?: string };
  product_template?: { kfa_code?: string; name?: string };
};

const KFA_CODE_RE = /^\d{8,10}$/;

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function toItem(p: KfaProduct) {
  return {
    kfa_code: p.kfa_code,
    name: p.name,
    active: p.active !== false,
    manufacturer: p.manufacturer ?? null,
    uom: p.uom?.name ?? null,
    dosage_form_code: p.dosage_form?.code ?? null,
    dosage_form_name: p.dosage_form?.name ?? null,
    template_code: p.product_template?.kfa_code ?? null,
    template_name: p.product_template?.name ?? null,
  };
}

async function kfaGet(admin: ReturnType<typeof createClient>, path: string) {
  const token = await getAccessToken(admin);
  const res = await fetch(`${getKfaBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error(`KFA HTTP ${res.status}`), { status: res.status, data });
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(req, 401, { error: "Unauthorized" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(url, serviceKey);

  // Status akun & klinik dari RPC yang sama dengan aplikasi (RLS: klinik aktif saja).
  const { data: account } = await userClient.rpc("get_my_account_status").maybeSingle();
  const acc = account as { has_access?: boolean; role?: string; clinic_id?: string } | null;
  if (!acc?.has_access || !["admin", "dokter"].includes(acc.role ?? "")) {
    return json(req, 403, { error: "Hanya admin/dokter klinik aktif yang dapat mengakses KFA" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: "Body harus JSON" });
  }

  try {
    if (body.action === "search") {
      const keyword = String(body.keyword ?? "").trim();
      if (keyword.length < 3 || keyword.length > 100) {
        return json(req, 400, { error: "Kata kunci minimal 3 karakter" });
      }
      const page = Math.max(1, Math.min(50, Number(body.page) || 1));
      const qs = new URLSearchParams({ page: String(page), size: "20", product_type: "farmasi", keyword });
      const data = await kfaGet(admin, `/products/all?${qs}`);
      const items: KfaProduct[] = data?.items?.data ?? [];
      return json(req, 200, { items: items.map(toItem), total: data?.total ?? items.length, page });
    }

    if (body.action === "verify") {
      if (acc.role !== "admin") return json(req, 403, { error: "Hanya admin klinik yang dapat menetapkan kode KFA" });
      const masterBahanId = String(body.masterBahanId ?? "");
      const kfaCode = String(body.kfaCode ?? "").trim();
      if (!KFA_CODE_RE.test(kfaCode)) return json(req, 400, { error: "Kode KFA harus 8–10 digit" });

      // Pastikan item milik klinik pemanggil (RLS lewat userClient).
      const { data: item } = await userClient.from("master_bahan").select("id").eq("id", masterBahanId).maybeSingle();
      if (!item) return json(req, 404, { error: "Item obat tidak ditemukan di klinik Anda" });

      const data = await kfaGet(admin, `/products?${new URLSearchParams({ identifier: "kfa", code: kfaCode })}`);
      const product: KfaProduct | undefined = data?.result ?? data?.items?.data?.[0] ?? (data?.kfa_code ? data : undefined);
      if (!product?.kfa_code || product.kfa_code !== kfaCode) {
        return json(req, 404, { error: `Kode ${kfaCode} tidak ditemukan di KFA SATUSEHAT` });
      }
      if (product.active === false) {
        return json(req, 422, { error: `Produk KFA ${kfaCode} berstatus tidak aktif` });
      }

      const { data: updated, error } = await admin
        .from("master_bahan")
        .update({
          kode_kfa: product.kfa_code,
          kfa_nama: product.name,
          kode_bentuk_sediaan: product.dosage_form?.code ?? null,
          kfa_bentuk_sediaan_nama: product.dosage_form?.name ?? null,
          kfa_verified_at: new Date().toISOString(),
        })
        .eq("id", masterBahanId)
        .eq("clinic_id", acc.clinic_id!)
        .select("id, kode_kfa, kfa_nama, kode_bentuk_sediaan, kfa_bentuk_sediaan_nama, kfa_verified_at")
        .single();
      if (error) throw error;
      return json(req, 200, { item: updated, product: toItem(product) });
    }

    return json(req, 400, { error: "action harus 'search' atau 'verify'" });
  } catch (e) {
    const err = e as { message?: string; status?: number };
    if (/SATUSEHAT_CLIENT_ID|SATUSEHAT_CLIENT_SECRET/.test(err.message ?? "")) {
      return json(req, 503, { error: "Kredensial SATUSEHAT belum dikonfigurasi. Hubungi tim Dentiva.", code: "satusehat_not_configured" });
    }
    console.error("satusehat-kfa error", err.message, err.status);
    return json(req, 502, { error: "Layanan KFA SATUSEHAT tidak dapat dihubungi. Coba lagi nanti." });
  }
});
