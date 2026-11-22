import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { buatTokenPengguna, permintaanInternal } from "./waBridge.ts";

const ID = "11111111-2222-4333-8444-555555555555";

Deno.test("buatTokenPengguna: JWT HS256 dengan klaim pengguna & klinik, berlaku 5 menit", async () => {
  const token = await buatTokenPengguna({ id: ID, email: "a@x.test", clinic_id: "c1" }, "rahasia-uji", 300, 1_800_000_000);
  const [h, p, s] = token.split(".");
  assert(h && p && s);
  const payload = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
  assertEquals(payload.sub, ID);
  assertEquals(payload.role, "authenticated");
  assertEquals(payload.app_metadata.clinic_id, "c1");
  assertEquals(payload.exp - payload.iat, 300);
  // tanda tangan dapat diverifikasi dengan rahasia yang sama
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("rahasia-uji"), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const sig = Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  assert(await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(`${h}.${p}`)));
});

Deno.test("permintaanInternal: hanya chat / setujui / tolak yang valid", () => {
  assertEquals(permintaanInternal({ user_id: ID, question: " halo " })?.inner, { mode: "chat", question: "halo", history: [] });
  assertEquals(permintaanInternal({ user_id: ID, aksi: "setujui", ids: [ID, "bukan-uuid"] })?.inner, { mode: "agent_apply", ids: [ID] });
  assertEquals(permintaanInternal({ user_id: ID, aksi: "tolak", ids: [] }), null);
  assertEquals(permintaanInternal({ user_id: "x", question: "halo" }), null);
  assertEquals(permintaanInternal({ user_id: ID, question: "   " }), null);
});
