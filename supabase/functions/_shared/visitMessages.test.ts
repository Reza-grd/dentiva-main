import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { buildEducation, buildReceipt, doctorDisplayName, matchEducation, rupiah } from "./visitMessages.ts";

Deno.test("rupiah & nama dokter bergelar", () => {
  assertEquals(rupiah(1250000), "Rp 1.250.000");
  assertEquals(rupiah(null), "Rp 0");
  assertEquals(doctorDisplayName({ full_name: "Ani", gelar_depan: "drg.", gelar_belakang: "Sp.Ort" }), "drg. Ani, Sp.Ort");
  assertEquals(doctorDisplayName(null), "Dokter Gigi");
});

Deno.test("invoice dari data tercatat: tindakan, obat, biaya, diskon, total, kembalian", () => {
  const msg = buildReceipt({
    clinicName: "Klinik Uji", clinicPhone: "021-1", invoiceNumber: "INV-1", patientName: "Budi", noRm: "RM-9",
    doctorName: "drg. Ani", paidAt: "2026-10-11T03:00:00Z",
    treatments: [{ name: "Scaling", qty: 1, subtotal: 300000 }, { name: "Tambal", qty: 2, subtotal: 500000, tooth: 36 }],
    medicines: [{ name: "Amoxicillin", qty: 10, subtotal: 50000 }],
    extraFee: 20000, extraFeeNote: "Biaya admin", discount: 70000, total: 800000, amountPaid: 1000000, method: "cash",
  });
  assertStringIncludes(msg, "No. Invoice : INV-1");
  assertStringIncludes(msg, "• Tambal (gigi 36) ×2 — Rp 500.000");
  assertStringIncludes(msg, "• Amoxicillin ×10 — Rp 50.000");
  assertStringIncludes(msg, "• Biaya admin — Rp 20.000");
  assertStringIncludes(msg, "• Diskon — -Rp 70.000");
  assertStringIncludes(msg, "*Total       : Rp 800.000*");
  assertStringIncludes(msg, "Pembayaran  : Tunai");
  assertStringIncludes(msg, "Kembalian   : Rp 200.000");
  assertStringIncludes(msg, "11 Oktober 2026");
  assertStringIncludes(msg, "LUNAS");
});

Deno.test("invoice non-tunai: tanpa baris kembalian", () => {
  const msg = buildReceipt({ clinicName: "K", patientName: "B", doctorName: "D", treatments: [], medicines: [], total: 100, amountPaid: 100, method: "qris" });
  assertStringIncludes(msg, "Pembayaran  : QRIS");
  assert(!msg.includes("Kembalian"));
});

const templates = [
  { treatment_type: "Scaling", keywords: ["scaling", "karang gigi"], education_text: "Kustom klinik: hindari kopi 1 jam.", medication_instructions: "[Diisi oleh dokter sesuai resep]" },
  { treatment_type: "Pencabutan", keywords: ["cabut", "ekstraksi"], education_text: "Gigit kasa 30 menit.", medication_instructions: "Minum analgesik bila nyeri." },
];
const linked = [
  { treatment_id: "t-scal", judul: "Pasca Scaling", isi_edukasi: "Teks bawaan scaling.", is_active: true },
  { treatment_id: "t-poles", judul: "Pasca Polishing", isi_edukasi: "Hindari makanan berwarna 2 jam.", is_active: true },
  { treatment_id: "t-mati", judul: "Nonaktif", isi_edukasi: "Tidak boleh dipakai.", is_active: false },
];

Deno.test("prioritas: template klinik persis > edukasi terhubung treatment_id > kata kunci", () => {
  assertEquals(matchEducation({ treatmentId: "t-scal", name: "Scaling" }, templates, linked).source, "template_exact");
  const poles = matchEducation({ treatmentId: "t-poles", name: "Polishing Gigi" }, templates, linked);
  assertEquals(poles.source, "linked");
  assertEquals(poles.text, "Hindari makanan berwarna 2 jam.");
  const cabut = matchEducation({ treatmentId: "t-x", name: "Cabut Gigi Molar" }, templates, linked);
  assertEquals(cabut.source, "template_keyword");
  assertEquals(cabut.medication, "Minum analgesik bila nyeri.");
  assertEquals(matchEducation({ treatmentId: "t-mati", name: "Lainnya" }, templates, linked).source, "none");
});

Deno.test("placeholder instruksi obat tidak ikut terkirim; kata kunci berimbuhan & minimal 4 huruf", () => {
  assertEquals(matchEducation({ treatmentId: null, name: "Scaling" }, templates, linked).medication, "");
  // imbuhan bahasa Indonesia: "Pencabutan" tetap cocok dengan kata kunci "cabut"
  assertEquals(matchEducation({ treatmentId: null, name: "Pencabutan sisa akar" }, templates, []).source, "template_keyword");
  // kata kunci terlalu pendek (< 4 huruf) diabaikan agar tidak asal cocok
  const pendek = [{ treatment_type: "X", keywords: ["gi"], education_text: "salah" }];
  assertEquals(matchEducation({ treatmentId: null, name: "Konsultasi gigi" }, pendek, []).source, "none");
});

Deno.test("edukasi: satu bagian per tindakan unik + obat yang diresepkan", () => {
  const { message, matches } = buildEducation({
    clinicName: "Klinik Uji", clinicPhone: "021-1", patientName: "Budi",
    treatments: [{ treatmentId: "t-poles", name: "Polishing Gigi" }, { treatmentId: "t-poles", name: "Polishing Gigi" }, { treatmentId: "t-x", name: "Konsultasi" }],
    medicines: [{ name: "Ibuprofen 400mg", dosis: "1 tablet", frekuensi: "3x sehari" }],
    templates, linked,
  });
  assertEquals(matches.length, 2);
  assert(message);
  assertEquals(message!.split("*Polishing Gigi*").length - 1, 1);
  assertStringIncludes(message!, "Hindari makanan berwarna 2 jam.");
  assertStringIncludes(message!, "• Ibuprofen 400mg — 1 tablet, 3x sehari");
  assert(!message!.includes("Konsultasi"));
});

Deno.test("edukasi: tidak ada yang cocok & tanpa obat → tidak dikirim", () => {
  const { message } = buildEducation({ clinicName: "K", patientName: "B", treatments: [{ treatmentId: "z", name: "Konsultasi" }], medicines: [], templates, linked });
  assertEquals(message, null);
});
