/**
 * Edge Function: satusehat-sandbox-verify
 * Uji ujung-ke-ujung SATUSEHAT di SANDBOX untuk satu kunjungan nyata di database,
 * memakai PEMBUAT PAYLOAD YANG SAMA dengan produksi (satusehat-sync-visit):
 *
 *   Encounter → Condition → (Encounter.diagnosis) → Procedure → MedicationRequest → Composition
 *
 * Tambahan: menguji varian Encounter.diagnosis.use (tanpa `use`, DD, CC, AD) karena
 * dokumentasi SATUSEHAT belum konsisten; hasilnya menentukan nilai secret
 * SATUSEHAT_DIAGNOSIS_USE.
 *
 * Hasil disimpan di public.satusehat_verification_runs. Menolak berjalan bila
 * SATUSEHAT_ENVIRONMENT=production. Hanya bisa dipanggil dengan service role
 * (mis. dari SQL Editor via pg_net / Vault — lihat docs/satusehat-sandbox-runbook.md).
 *
 *   POST { visitId }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { buildAndSyncEncounter, updateEncounterDiagnoses } from "../_shared/resources/encounter.ts";
import { buildAndSyncConditions } from "../_shared/resources/condition.ts";
import { buildAndSyncProcedures } from "../_shared/resources/procedure.ts";
import { buildAndSyncMedicationRequests } from "../_shared/resources/medicationRequest.ts";
import { buildAndSyncComposition } from "../_shared/resources/composition.ts";
import { buildAndSyncDentalObservations } from "../_shared/resources/dentalObservation.ts";
import { fhirRequest } from "../_shared/fhirClient.ts";
import { getSatuSehatEnv, DIAGNOSIS_USE_CANDIDATES, diagnosisUseCodingFor } from "../_shared/satusehatConfig.ts";

type Step = { step: string; ok: boolean; ids?: string[]; error?: string; detail?: unknown };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json" } });

/** Ringkas OperationOutcome agar laporan mudah dibaca & dicocokkan dengan Postman. */
function outcome(data: any) {
  const issues = data?.issue ?? data?.data?.issue;
  if (Array.isArray(issues)) {
    return issues.map((i: any) => `${i.severity}/${i.code}: ${i.details?.text ?? i.diagnostics ?? ""}`.slice(0, 300));
  }
  return data ? JSON.stringify(data).slice(0, 300) : null;
}

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return json(401, { error: "Hanya service role" });
  }
  if (getSatuSehatEnv() !== "sandbox") {
    return json(409, { error: "Uji ini hanya untuk SATUSEHAT_ENVIRONMENT=sandbox" });
  }
  if (!Deno.env.get("SATUSEHAT_CLIENT_ID") || !Deno.env.get("SATUSEHAT_CLIENT_SECRET")) {
    return json(412, { error: "Secret SATUSEHAT_CLIENT_ID / SATUSEHAT_CLIENT_SECRET (sandbox) belum diisi" });
  }

  const { visitId } = await req.json().catch(() => ({}));
  if (!visitId) return json(400, { error: "visitId wajib diisi" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const steps: Step[] = [];
  const run = async <T>(step: string, fn: () => Promise<T>, ids?: (r: T) => string[]) => {
    try {
      const r = await fn();
      steps.push({ step, ok: true, ids: ids ? ids(r) : undefined });
      return r;
    } catch (e) {
      steps.push({ step, ok: false, error: (e as Error).message?.slice(0, 1000) });
      return undefined;
    }
  };

  const encounterId = await run("Encounter", () => buildAndSyncEncounter(admin, visitId, undefined, null), (id) => [id as string]);

  const { data: visit } = await admin
    .from("visits")
    .select("tanggal_kunjungan, jam_kunjungan, patient:patients(satusehat_patient_id), doctor:users!visits_dokter_id_fkey(satusehat_practitioner_id)")
    .eq("id", visitId)
    .maybeSingle();
  const patientSId = (visit as any)?.patient?.satusehat_patient_id;
  const practitionerSId = (visit as any)?.doctor?.satusehat_practitioner_id;
  const datePart = (visit as any)?.tanggal_kunjungan || new Date().toISOString().split("T")[0];
  const timePart = ((visit as any)?.jam_kunjungan || "08:00").substring(0, 5);
  const iso = `${datePart}T${timePart}:00+07:00`;

  let conditionIds: string[] = [];
  let procedureIds: string[] = [];
  let medicationRequestIds: string[] = [];
  let observationIds: string[] = [];
  const diagnosisUseProbe: Array<{ variant: string; httpStatus: number; ok: boolean; outcome: unknown }> = [];

  if (encounterId) {
    conditionIds = (await run("Condition", () => buildAndSyncConditions(admin, visitId, patientSId, encounterId, iso, undefined, null), (r) => r)) ?? [];

    // Probe Encounter.diagnosis.use: kirim varian satu per satu, catat respons server.
    if (conditionIds.length > 0) {
      for (const variant of ["tanpa-use", ...DIAGNOSIS_USE_CANDIDATES]) {
        const current = await fhirRequest(admin, "GET", `Encounter/${encounterId}`);
        if (!current.ok) {
          diagnosisUseProbe.push({ variant, httpStatus: current.status, ok: false, outcome: outcome(current.data) });
          continue;
        }
        const coding = variant === "tanpa-use" ? null : diagnosisUseCodingFor(variant);
        const payload = {
          ...current.data,
          diagnosis: conditionIds.map((id, i) => ({
            condition: { reference: `Condition/${id}` },
            ...(coding ? { use: { coding: [coding] } } : {}),
            rank: i + 1,
          })),
        };
        const put = await fhirRequest(admin, "PUT", `Encounter/${encounterId}`, payload);
        diagnosisUseProbe.push({ variant, httpStatus: put.status, ok: put.ok, outcome: put.ok ? null : outcome(put.data) });
      }
      // Kembalikan ke perilaku produksi saat ini (sesuai secret SATUSEHAT_DIAGNOSIS_USE).
      await run("Encounter.diagnosis (konfigurasi aktif)", () => updateEncounterDiagnoses(admin, encounterId, conditionIds));
    }

    procedureIds = (await run("Procedure", () => buildAndSyncProcedures(admin, visitId, patientSId, encounterId, iso, undefined, null), (r) => r)) ?? [];
    medicationRequestIds =
      (await run("MedicationRequest", () => buildAndSyncMedicationRequests(admin, visitId, patientSId, encounterId, iso, undefined, null), (r) => r)) ?? [];
    observationIds =
      (await run("Observation (Modul Gigi: OHIS & odontogram)", () => buildAndSyncDentalObservations(admin, visitId, patientSId, practitionerSId, encounterId, iso, undefined, null), (r) => r)) ?? [];
    if (conditionIds.length > 0) {
      await run(
        "Composition",
        () => buildAndSyncComposition(admin, visitId, patientSId, practitionerSId, encounterId, iso, conditionIds, procedureIds, medicationRequestIds, undefined, null),
        (id) => (id ? [id as string] : []),
      );
    }
  }

  // Kegagalan per item (Condition/Procedure/MedicationRequest dilewati diam-diam oleh builder)
  // tercatat di outbox; sertakan agar laporan lengkap.
  const { data: outbox } = await admin
    .from("satusehat_outbox")
    .select("resource_type, status, attempt_count, satusehat_resource_id, last_error, payload, updated_at")
    .eq("related_visit_id", visitId)
    .order("updated_at", { ascending: false })
    .limit(50);

  const expected = {
    conditions: conditionIds.length > 0, procedures: procedureIds.length > 0, medicationRequests: medicationRequestIds.length > 0,
    observations: observationIds.length > 0,
  };
  const passed =
    steps.every((s) => s.ok) &&
    expected.conditions && expected.procedures && expected.medicationRequests && expected.observations &&
    !(outbox ?? []).some((o: any) => String(o.status).startsWith("failed"));

  const report = {
    environment: "sandbox",
    visitId,
    passed,
    steps,
    diagnosisUseProbe,
    resources: { encounterId, conditionIds, procedureIds, medicationRequestIds, observationIds },
    outbox,
    note: passed
      ? "Cocokkan payload di satusehat_outbox dengan koleksi Postman resmi, pilih SATUSEHAT_DIAGNOSIS_USE dari varian yang lulus, lalu set SATUSEHAT_PRODUCTION_APPROVED=true."
      : "Belum lulus — perbaiki langkah yang gagal lalu jalankan ulang. Kunjungan uji harus punya ≥1 diagnosis ICD-10, ≥1 tindakan ICD-9-CM, ≥1 obat berkode KFA terverifikasi, serta odontogram dan/atau skor OHIS pasien terisi.",
  };

  const { error: saveErr } = await admin.from("satusehat_verification_runs").insert({
    visit_id: visitId,
    environment: "sandbox",
    passed,
    report,
  });
  if (saveErr) console.error("Gagal menyimpan laporan uji sandbox:", saveErr.message);

  return json(200, report);
});
