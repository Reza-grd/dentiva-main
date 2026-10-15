// deno test --config supabase/functions/ai-assistant/deno.json supabase/functions/ai-assistant/agent.test.ts
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { AGENT_PROMPT, AGENT_READ_TOOLS, AGENT_TOOL_NAMES, AGENT_TOOLS, AGENT_WRITE_TOOLS, isAgentIntent, pendingText, runAgentTool, susunPesanPemasok, type AgentCtx } from "./agent.ts";
import { normalizeQuestion } from "./knowledge.ts";

// deno-lint-ignore no-explicit-any
type Call = { fn: string; params: any };
// deno-lint-ignore no-explicit-any
function fakeDb(respond: (fn: string, params: any) => { data?: any; error?: { code?: string; message: string } | null }) {
  const calls: Call[] = [];
  // deno-lint-ignore no-explicit-any
  const db: any = {
    // deno-lint-ignore no-explicit-any
    rpc: (fn: string, params: any) => { calls.push({ fn, params }); const r = respond(fn, params); return Promise.resolve({ data: r.data ?? null, error: r.error ?? null }); },
    from: (table: string) => ({ select: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: table === "clinics" ? { name: "Klinik Senyum" } : null, error: null }) }) }) }),
  };
  return { db, calls };
}
const newCtx = (): AgentCtx => ({ group: "g-1", actions: [] });

Deno.test("skema alat: nama unik, objek bertipe, wajib ⊆ properti, deskripsi terisi", () => {
  const names = AGENT_TOOLS.map((t) => t.name);
  assertEquals(new Set(names).size, names.length);
  assertEquals(AGENT_TOOL_NAMES.size, names.length);
  for (const t of AGENT_TOOLS) {
    assert(t.description.length > 20, t.name);
    const s = t.input_schema as { type: string; properties: Record<string, { type: string; description: string }>; required?: string[] };
    assertEquals(s.type, "object");
    for (const r of s.required ?? []) assert(r in s.properties, `${t.name}: wajib ${r} tidak ada di properti`);
    for (const [k, p] of Object.entries(s.properties)) {
      assert(["string", "number", "boolean", "array"].includes(p.type), `${t.name}.${k}`);
      assert(p.description, `${t.name}.${k} tanpa deskripsi`);
    }
  }
  assertEquals(AGENT_READ_TOOLS.length, 14);
  assertEquals(AGENT_WRITE_TOOLS.length, 18);
  for (const t of AGENT_WRITE_TOOLS) assert(t.name.startsWith("usulkan_"), t.name);
});

Deno.test("alat baca memanggil RPC ai_* dengan parameter bernama & nilai bawaan", async () => {
  const { db, calls } = fakeDb(() => ({ data: { jumlah: 0, bahan: [] } }));
  const r = await runAgentTool(db, newCtx(), "cari_bahan", { kata: "lidocaine" });
  assertEquals(r?.isError, false);
  assertEquals(calls[0], { fn: "ai_cari_bahan", params: { p_kata: "lidocaine", p_aktif: true, p_limit: 30 } });
  await runAgentTool(db, newCtx(), "saran_pemesanan", {});
  assertEquals(calls[1], { fn: "ai_saran_pemesanan", params: { p_hari_riwayat: 30, p_hari_cakupan: 14 } });
  await runAgentTool(db, newCtx(), "cari_pengeluaran", { kata: "listrik", dari: "2026-10-01" });
  assertEquals(calls[2].params, { p_dari: "2026-10-01", p_sampai: null, p_kata: "listrik", p_kategori: "", p_limit: 25 });
});

Deno.test("alat usulan memanggil ai_agent_propose dan mengumpulkan usulan ke konteks", async () => {
  const { db, calls } = fakeDb((fn) => fn === "ai_agent_propose"
    ? { data: { ok: true, action_id: "11111111-1111-4111-8111-111111111111", jenis: "stok_masuk", pratinjau: { judul: "Stok masuk: Lidocaine" } } }
    : {});
  const ctx = newCtx();
  const r = await runAgentTool(db, ctx, "usulkan_stok_masuk", { bahan: "lidocaine", jumlah_beli: 2, harga_satuan_beli: 60000 });
  assertEquals(r?.isError, false);
  assertEquals(calls[0].fn, "ai_agent_propose");
  assertEquals(calls[0].params.p_kind, "stok_masuk");
  assertEquals(calls[0].params.p_group, "g-1");
  assertEquals(ctx.actions.length, 1);
  assertEquals(ctx.actions[0].jenis, "stok_masuk");
  const parsed = JSON.parse(r!.content);
  assertEquals(parsed.status, "menunggu_persetujuan_admin");
  assertStringIncludes(parsed.catatan, "BELUM berubah");
});

Deno.test("setiap alat usulan memetakan ke jenis yang dikenal database", async () => {
  const dbKinds = ["bahan_tambah", "bahan_ubah", "stok_masuk", "stok_opname", "pengeluaran_catat", "pengeluaran_ubah", "pengeluaran_hapus",
    "overhead_atur", "overhead_target", "tindakan_harga", "tindakan_harga_massal", "tindakan_tambah", "tindakan_ubah", "resep_atur", "resep_hapus",
    "bahan_tambah_banyak", "stok_masuk_banyak", "batch_buang"];
  const seen: string[] = [];
  const { db } = fakeDb((fn, p) => { if (fn === "ai_agent_propose") seen.push(p.p_kind); return { data: { ok: true, action_id: "a", jenis: p.p_kind, pratinjau: {} } }; });
  for (const t of AGENT_WRITE_TOOLS) await runAgentTool(db, newCtx(), t.name, {});
  assertEquals([...seen].sort(), [...dbKinds].sort());
});

Deno.test("usulan ditolak validasi → galat ke model dengan kandidat, usulan tidak dicatat", async () => {
  const { db } = fakeDb(() => ({ data: { ok: false, error: "Nama bahan \"masker\" ambigu", kandidat: [{ id: "x", nama: "Masker A" }, { id: "y", nama: "Masker B" }] } }));
  const ctx = newCtx();
  const r = await runAgentTool(db, ctx, "usulkan_stok_masuk", { bahan: "masker", jumlah_beli: 1, harga_satuan_beli: 1 });
  assertEquals(r?.isError, true);
  assertEquals(ctx.actions.length, 0);
  assertStringIncludes(r!.content, "ambigu");
  assertStringIncludes(r!.content, "Masker B");
});

Deno.test("galat database: AG001 diteruskan, selain itu disamarkan (tidak membocorkan detail)", async () => {
  const a = await runAgentTool(fakeDb(() => ({ error: { code: "AG001", message: "Bahan tidak ditemukan" } })).db, newCtx(), "kartu_stok", { bahan: "x" });
  assertEquals(a, { content: "Bahan tidak ditemukan", isError: true });
  const b = await runAgentTool(fakeDb(() => ({ error: { code: "42501", message: "Asisten AI hanya untuk admin klinik" } })).db, newCtx(), "cari_bahan", {});
  assertStringIncludes(b!.content, "hanya untuk admin");
  const c = await runAgentTool(fakeDb(() => ({ error: { code: "XX000", message: "relation \"secret\" does not exist" } })).db, newCtx(), "cari_bahan", {});
  assert(!c!.content.includes("secret"));
});

Deno.test("alat yang bukan alat agen → null; argumen bukan objek ditolak", async () => {
  const { db, calls } = fakeDb(() => ({}));
  assertEquals(await runAgentTool(db, newCtx(), "ringkasan_pendapatan", {}), null);
  const r = await runAgentTool(db, newCtx(), "usulkan_bahan_tambah", "hapus semua");
  assertEquals(r?.isError, true);
  assertEquals(calls.length, 0);
});

Deno.test("niat agen: perintah bertindak terdeteksi, pertanyaan analisis/panduan tidak", () => {
  const act = [
    "tolong catat pengeluaran listrik 1,2 juta", "tambahkan bahan baru sarung tangan nitril", "naikkan harga scaling 10 persen",
    "stok masuk lidocaine 2 box harga 60000", "ubah stok minimum masker jadi 50", "hapus pengeluaran parkir kemarin",
    "opname stok kapas", "atur overhead sewa 8 juta", "masukkan resep bahan untuk tambal komposit", "restock anestesi",
  ];
  for (const q of act) assert(isAgentIntent(normalizeQuestion(q)), q);
  const ask = [
    "berapa pendapatan bulan ini", "bagaimana cara mencatat pengeluaran", "apa itu hpp", "stok apa yang menipis",
    "kalau harga scaling naik 10 persen bagaimana", "kenapa pengeluaran naik", "siapa dokter paling produktif",
  ];
  for (const q of ask) {
    const hit = isAgentIntent(normalizeQuestion(q));
    // pertanyaan analisis boleh tetap lewat model (tidak ada tindakan), tapi tak boleh menghalangi jawaban cepat tanpa kata kerja aksi
    if (q.startsWith("bagaimana cara") || q.startsWith("kalau")) continue;
    assert(!hit, q);
  }
});

Deno.test("pendingText & prompt agen", () => {
  assertEquals(pendingText([]), "");
  const t = pendingText([{ kind: "stok_masuk", preview: { judul: "Stok masuk: Lidocaine" } }, { kind: "x" }]);
  assertStringIncludes(t, "(2)");
  assertStringIncludes(t, "Stok masuk: Lidocaine");
  for (const w of ["USULAN", "Setujui", "cari_bahan", "Jangan pernah berkata", "TIDAK bisa bertindak"]) assertStringIncludes(AGENT_PROMPT, w);
});

const REORDER = [
  { nama: "Anestesi Lidocaine", satuan: "ampul", saran_beli: 30, perkiraan_biaya: 150000, pemasok: "CV Medika Jaya" },
  { nama: "Sarung Tangan M", satuan: "pcs", saran_beli: 200, perkiraan_biaya: 400000, pemasok: "CV Medika Jaya" },
  { nama: "Kapas", satuan: "roll", saran_beli: 5, perkiraan_biaya: 40000, pemasok: null },
  { nama: "Bur Intan", satuan: "pcs", saran_beli: 0, perkiraan_biaya: 0, pemasok: "Toko Bur" },
];

Deno.test("susunPesanPemasok: kelompokkan per pemasok, lewati yang tidak perlu dipesan, jumlah dari data", () => {
  const out = susunPesanPemasok(REORDER, "Klinik Senyum");
  assertEquals(out.map((o) => o.pemasok).sort(), ["CV Medika Jaya", "Tanpa pemasok tercatat"]);
  const medika = out.find((o) => o.pemasok === "CV Medika Jaya")!;
  assertEquals(medika.jumlah_item, 2);
  assertEquals(medika.perkiraan_biaya, 550000);
  assertStringIncludes(medika.teks, "1. Anestesi Lidocaine — 30 ampul");
  assertStringIncludes(medika.teks, "2. Sarung Tangan M — 200 pcs");
  assertStringIncludes(medika.teks, "Klinik Senyum");
  assert(!medika.teks.includes("Bur Intan"));
  assertEquals(susunPesanPemasok(REORDER, "K", "medika").length, 1);
  assertEquals(susunPesanPemasok(REORDER, "K", "tidak ada").length, 0);
});

Deno.test("draf_pesan_pemasok: memakai saran_pemesanan + nama klinik, tidak membuat usulan", async () => {
  const { db, calls } = fakeDb(() => ({ data: { bahan: REORDER } }));
  const ctx = newCtx();
  const r = await runAgentTool(db, ctx, "draf_pesan_pemasok", { hari_cakupan: 21 });
  assertEquals(r?.isError, false);
  assertEquals(calls[0], { fn: "ai_saran_pemesanan", params: { p_hari_riwayat: 30, p_hari_cakupan: 21 } });
  const parsed = JSON.parse(r!.content);
  assertEquals(parsed.pesan.length, 2);
  assertStringIncludes(parsed.pesan[0].teks, "Klinik Senyum");
  assertStringIncludes(parsed.catatan, "belum dikirim");
  assertEquals(ctx.actions.length, 0);
  const none = await runAgentTool(fakeDb(() => ({ data: { bahan: [] } })).db, newCtx(), "draf_pesan_pemasok", {});
  assertStringIncludes(JSON.parse(none!.content).catatan, "Tidak ada bahan");
});

Deno.test("alat analitik baru memanggil RPC yang benar", async () => {
  const { db, calls } = fakeDb(() => ({ data: {} }));
  for (const [tool, input] of [["ringkasan_gudang", {}], ["bahan_kadaluarsa", { hari: 30 }], ["riwayat_harga_bahan", { bahan: "gutta" }], ["analisis_margin", {}], ["anomali_pengeluaran", {}]] as const) {
    assertEquals((await runAgentTool(db, newCtx(), tool, input))?.isError, false, tool);
  }
  assertEquals(calls.map((c) => c.fn), ["ai_ringkasan_gudang", "ai_bahan_kadaluarsa", "ai_riwayat_harga_bahan", "ai_analisis_margin", "ai_anomali_pengeluaran"]);
  assertEquals(calls[1].params, { p_hari: 30 });
  assertEquals(calls[2].params, { p_bahan: "gutta", p_bulan: 12 });
});

Deno.test("alat usulan banyak meneruskan daftar items apa adanya ke database", async () => {
  const { db, calls } = fakeDb((fn, p) => ({ data: { ok: true, action_id: "x", jenis: p.p_kind, pratinjau: { judul: "t" } } }));
  const items = [{ bahan: "kapas", jumlah_beli: 2, harga_satuan_beli: 1000 }];
  await runAgentTool(db, newCtx(), "usulkan_stok_masuk_banyak", { supplier: "CV A", items });
  assertEquals(calls[0].params.p_kind, "stok_masuk_banyak");
  assertEquals(calls[0].params.p_args.items, items);
  assertEquals(calls[0].params.p_args.supplier, "CV A");
});

Deno.test("niat agen: perintah buang/musnahkan stok terdeteksi", () => {
  for (const q of ["buang stok kapas yang kadaluarsa", "musnahkan bahan expired", "bersihkan stok lidocaine kadaluarsa"]) assert(isAgentIntent(normalizeQuestion(q)), q);
});

Deno.test("prompt agen memuat protokol situasi & contoh nada, tanpa karakter terlarang", () => {
  for (const w of ["PROTOKOL SITUASI UMUM", "GAYA JAWABAN", "CONTOH NADA", "Briefing", "draf_pesan_pemasok", "analisis_margin", "stok_masuk_banyak", "REKAN KERJA"]) assertStringIncludes(AGENT_PROMPT, w);
  assert(AGENT_PROMPT.length > 3000 && AGENT_PROMPT.length < 12000, String(AGENT_PROMPT.length));
});
