import { assertEquals } from "jsr:@std/assert@1";
import { catatApiSatusehat, kodeGalatFhir, ringkasUrl } from "./satusehatLog.ts";

Deno.test("ringkasUrl: buang host & nilai query (NIK tidak ikut tercatat)", () => {
  const r = ringkasUrl("https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient?identifier=https://fhir.kemkes.go.id/id/nik|3201234567890001");
  assertEquals(r.endpoint, "fhir-r4/v1/Patient");
  assertEquals(r.parameter, ["identifier"]);
});

Deno.test("kodeGalatFhir: hanya kode, tanpa teks diagnostik", () => {
  assertEquals(kodeGalatFhir({ resourceType: "OperationOutcome", issue: [{ code: "invalid", details: { coding: [{ code: "R-0001" }] }, diagnostics: "Pasien Budi NIK 3201..." }] }), "invalid:R-0001");
  assertEquals(kodeGalatFhir({ resourceType: "Encounter" }), null);
});

Deno.test("catatApiSatusehat: menyisipkan baris tanpa query, dan tidak melempar bila insert gagal", async () => {
  const disisip: Record<string, unknown>[] = [];
  const admin = { from: () => ({ insert: (b: Record<string, unknown>) => { disisip.push(b); return Promise.resolve({ error: null }); } }) };
  const log = console.log; console.log = () => {};
  try {
    await catatApiSatusehat(admin, { lingkungan: "sandbox", metode: "POST", url: "https://x/fhir-r4/v1/Encounter?a=1", status: 201, durasiMs: 123.4 });
    assertEquals(disisip[0].endpoint, "fhir-r4/v1/Encounter");
    assertEquals(disisip[0].parameter, ["a"]);
    assertEquals(disisip[0].durasi_ms, 123);
    const rusak = { from: () => ({ insert: () => Promise.reject(new Error("db mati")) }) };
    const warn = console.warn; console.warn = () => {};
    try { await catatApiSatusehat(rusak, { lingkungan: "sandbox", metode: "GET", url: "https://x/y", status: 200, durasiMs: 1 }); }
    finally { console.warn = warn; }
  } finally {
    console.log = log;
  }
});
