import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  buildOdontogramObservations, buildOhisObservations, DENTAL_CODE_FACTS, odontogramFindings, ohisTotals, parseOhis, toothBodySite,
} from "./dentalObservation.ts";

const ctx = {
  patientSId: "P001", encounterId: "E001", practitionerSId: "N001", isoTimestamp: "2026-10-25T09:00:00+07:00",
  identifierSystem: "http://sys-ids.kemkes.go.id/observation/ORG1", visitId: "v-1",
};
const comp = (o: any, code: string) => o.component.find((c: any) => c.code.coding[0].code === code)?.valueCodeableConcept.coding[0];

Deno.test("bodySite: FDI → SNOMED Lampiran 1 (tetap & sulung); nomor tak dikenal → null", () => {
  assertEquals(toothBodySite(11)?.coding[0], { system: "http://snomed.info/sct", code: "422653006" });
  assertEquals(toothBodySite(36)?.coding[0].code, "866006002");
  assertEquals(toothBodySite(85)?.coding[0].code, "61868007");
  assertEquals(toothBodySite(19), null);
});

Deno.test("odontogram: karies permukaan MO dipecah menjadi Mesial & Oklusal, kode SATUSEHAT benar", () => {
  const { observations } = buildOdontogramObservations([
    { tooth_number: 36, condition_type: "surface", condition_code: "car", surface: "MO" },
  ], ctx);
  assertEquals(observations.map((o) => o.key), ["odo-36-M", "odo-36-O"]);
  const p: any = observations[0].payload;
  assertEquals(p.resourceType, "Observation");
  assertEquals(p.status, "final");
  assertEquals(p.category[0].coding[0].code, "exam");
  assertEquals(p.code.coding[0], { system: "http://terminology.kemkes.go.id/CodeSystem/clinical-term", code: "OC000061", display: "Pemeriksaan Odontogram" });
  assertEquals(p.valueBoolean, true);
  assertEquals(p.bodySite.coding[0].code, "866006002");
  assertEquals(comp(p, "32889-8").code, "710099007"); // Mesial
  assertEquals(comp(observations[1].payload, "32889-8").code, "257885003"); // Oklusal
  assertEquals(comp(p, "278544002").code, "80967001"); // Dental caries
  assertEquals(p.subject.reference, "Patient/P001");
  assertEquals(p.encounter.reference, "Encounter/E001");
  assertEquals(p.performer[0].reference, "Practitioner/N001");
  assertEquals(p.identifier[0], { system: ctx.identifierSystem, value: "v-1-odo-36-M" });
});

Deno.test("odontogram: tambalan amalgam + RCT → bahan & restorasi di permukaan, bahan saluran akar di gigi", () => {
  const { observations } = buildOdontogramObservations([
    { tooth_number: 46, condition_type: "surface", condition_code: "amf-rct", surface: "O" },
  ], ctx);
  const surf: any = observations.find((o) => o.key === "odo-46-O")!.payload;
  assertEquals(comp(surf, "432680005").code, "256447001");
  assertEquals(comp(surf, "251335007").code, "278550007");
  const whole: any = observations.find((o) => o.key === "odo-46")!.payload;
  assertEquals(comp(whole, "432680005").code, "256532008");
  assertEquals(whole.component.some((c: any) => c.code.coding[0].code === "32889-8"), false);
});

Deno.test("odontogram: status seluruh gigi, has_rct, LAYER_ONLY, dan implan+mahkota dipecah per jenis komponen", () => {
  const { observations, unmapped } = buildOdontogramObservations([
    { tooth_number: 18, condition_type: "whole", condition_code: "mis" },
    { tooth_number: 11, condition_type: "whole", condition_code: "LAYER_ONLY" },
    { tooth_number: 21, condition_type: "whole", condition_code: "fmc", has_rct: true },
    { tooth_number: 26, condition_type: "whole", condition_code: "ipx-poc" },
    { tooth_number: 12, condition_type: "whole", condition_code: "arrow" },
    { tooth_number: 99, condition_type: "whole", condition_code: "sou" },
  ], ctx);
  const keys = observations.map((o) => o.key);
  assertEquals(keys.includes("odo-11"), false);
  assertEquals(comp(observations.find((o) => o.key === "odo-18")!.payload, "278544002").code, "234948008");
  const g21: any = observations.find((o) => o.key === "odo-21")!.payload;
  assertEquals(comp(g21, "251335007").code, "468240009");
  assertEquals(comp(g21, "432680005").code, "256532008");
  assertEquals(comp(observations.find((o) => o.key === "odo-26")!.payload, "251335007").code, "468993001");
  assertEquals(comp(observations.find((o) => o.key === "odo-26-2")!.payload, "251335007").code, "468254001");
  assertEquals(unmapped.sort(), ["arrow", "gigi 99"]);
});

Deno.test("odontogram: semua kode Dentiva kecuali 'arrow' punya padanan; tidak ada fakta ganda", () => {
  const dentiva = ["amf", "cof", "fis", "car", "nvt", "rct", "amf-rct", "cof-rct", "sou", "non", "une", "pre", "mis", "rrx",
    "ano", "cfr", "fmc", "fmc-rct", "poc", "ipx-poc", "meb", "poc-bridge", "frm", "acr", "PON"];
  for (const c of dentiva) assertEquals(DENTAL_CODE_FACTS[c]?.length > 0, true, c);
  const { findings } = odontogramFindings([
    { tooth_number: 16, condition_type: "surface", condition_code: "car", surface: "M" },
    { tooth_number: 16, condition_type: "surface", condition_code: "car", surface: "M" },
  ]);
  assertEquals(findings.length, 1);
  assertEquals(findings[0].facts.length, 1);
});

Deno.test("OHIS: JSON formulir → skor; kosong/nol/bukan JSON → null; nilai di luar 0–3 dijepit", () => {
  assertEquals(parseOhis(""), null);
  assertEquals(parseOhis("tipis"), null);
  assertEquals(parseOhis(JSON.stringify({ debris: { "16": 0 }, calculus: { "16": 0 } })), null);
  const s = parseOhis(JSON.stringify({ debris: { "16": 2, "11": 1, "26": 7 }, calculus: { "36": "1" } }))!;
  assertEquals(s.debris, { "16": 2, "11": 1, "26": 3, "36": 0, "31": 0, "46": 0 });
  assertEquals(s.calculus["36"], 1);
});

Deno.test("OHIS: rumus & interpretasi sama dengan formulir (≤1,2 baik; ≤3,0 cukup; >3 buruk)", () => {
  const z = { "16": 0, "11": 0, "26": 0, "36": 0, "31": 0, "46": 0 };
  assertEquals(ohisTotals({ debris: { ...z, "16": 3, "11": 3 }, calculus: z }).interpretation.code, "OI000029"); // 1,0
  assertEquals(ohisTotals({ debris: { ...z, "16": 3, "11": 3, "26": 3 }, calculus: { ...z, "36": 1 } }).interpretation.code, "OI000030"); // 1,67
  const buruk = ohisTotals({ debris: { "16": 3, "11": 3, "26": 3, "36": 3, "31": 3, "46": 3 }, calculus: { ...z, "16": 2 } });
  assertEquals([buruk.di, buruk.ci, buruk.ohis, buruk.interpretation.code], [3, 0.33, 3.33, "OI000031"]);
});

Deno.test("OHIS: Observation per gigi indeks (skor 1–3) + total DI/CI/OHIS dengan valueQuantity {score}", () => {
  const z = { "16": 0, "11": 0, "26": 0, "36": 0, "31": 0, "46": 0 };
  const obs = buildOhisObservations({ debris: { ...z, "16": 2 }, calculus: { ...z, "46": 3 } }, ctx);
  assertEquals(obs.map((o) => o.key), ["di-16", "ci-46", "di-total", "ci-total", "ohis-total"]);
  const di: any = obs[0].payload;
  assertEquals(di.code.coding[0].code, "OC000062");
  assertEquals(di.valueCodeableConcept.coding[0].code, "OV000098");
  assertEquals(di.bodySite.coding[0].code, "865995000");
  assertEquals((obs[1].payload as any).valueCodeableConcept.coding[0].code, "OV000102");
  const total: any = obs[4].payload;
  assertEquals(total.code.coding[0].code, "OC000058");
  assertEquals(total.valueQuantity, { value: 0.83, unit: "score", system: "http://unitsofmeasure.org", code: "{score}" });
  assertEquals(total.interpretation[0].coding[0].code, "OI000029");
});
