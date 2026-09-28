/**
 * @dentiva/shared — konstanta, kontrak console-api, dan formatter.
 *
 * Konstanta & kontrak disimpan fisik di supabase/functions/_shared/contract
 * supaya Edge Function (Deno) bisa mengimpornya tanpa keluar dari folder
 * supabase/functions saat di-bundle. Paket ini adalah pintu masuk untuk
 * aplikasi web; jangan menduplikasi nilai di tempat lain.
 */
export * from "../../../supabase/functions/_shared/contract/index.ts";
export * from "./format";
