/**
 * SATUSEHAT Modul Gigi — Pemeriksaan Odontogram (langkah 5) & OHIS (langkah 4, Pemeriksaan Fisik).
 * Sumber: satusehat.kemkes.go.id/platform/docs/id/interoperability/rawat-jalan-gigi/ (Tabel 4, Tabel 5)
 * dan lampiran terminologi rawat-jalan-gigi (Lampiran 1–9). Semuanya resource Observation, kategori "exam".
 *
 * Odontogram Dentiva (tooth_conditions, per pasien) dikirim sebagai potret saat kunjungan: satu Observation
 * "Pemeriksaan Odontogram" (OC000061) per gigi untuk status seluruh gigi, dan per permukaan untuk temuan permukaan.
 * Tiap Observation memuat komponen keadaan gigi / bahan restorasi / restorasi / bahan protesa / protesa.
 * OHIS (periodontal_data.calculus = JSON skor debris & kalkulus per gigi indeks) dikirim sebagai Debris/Kalkulus
 * Indeks per gigi (skor 1–3), skor total DI/CI, dan skor total OHIS beserta interpretasinya.
 *
 * Idempoten: tiap Observation diberi identifier `http://sys-ids.kemkes.go.id/observation/{orgIhs}` =
 * `{visitId}-{kunci}`; sebelum POST, Observation kunjungan dicari dan identifier yang sama dilewati.
 */
import { fhirRequest } from '../fhirClient.ts';
import { decryptBatch } from '../decryptionHelper.ts';
import { recordOutboxStart, recordOutboxSuccess, recordOutboxFailure } from '../outboxHelper.ts';

const SCT = 'http://snomed.info/sct';
const LOINC = 'http://loinc.org';
const KEMKES = 'http://terminology.kemkes.go.id/CodeSystem/clinical-term';
const CATEGORY_EXAM = [{
  coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'exam', display: 'Exam' }],
}];

type Coding = { system: string; code: string; display: string };
const sct = (code: string, display: string): Coding => ({ system: SCT, code, display });
const kemkes = (code: string, display: string): Coding => ({ system: KEMKES, code, display });

// Lampiran 1 — nomenklatur gigi FDI → SNOMED CT (bodySite)
const TOOTH_SCT: Record<number, string> = {
  11: '422653006', 12: '424877001', 13: '860767006', 14: '57826002', 15: '36492000', 16: '865995000', 17: '863902006', 18: '68085002',
  21: '424399000', 22: '423185002', 23: '860780009', 24: '61897005', 25: '23226009', 26: '865988009', 27: '863901004', 28: '87704003',
  31: '425106001', 32: '423331005', 33: '860782001', 34: '2400006', 35: '24573005', 36: '866006002', 37: '863898000', 38: '74344005',
  41: '424575004', 42: '423937004', 43: '860785004', 44: '80140008', 45: '8873007', 46: '866005003', 47: '863899008', 48: '38994002',
  51: '88824007', 52: '65624003', 53: '30618001', 54: '17505006', 55: '27855007',
  61: '51678005', 62: '43622005', 63: '73937000', 64: '45234009', 65: '51943008',
  71: '89552004', 72: '14770005', 73: '43281008', 74: '38896004', 75: '49330006',
  81: '67834006', 82: '22445006', 83: '6062009', 84: '58646007', 85: '61868007',
};

export function toothBodySite(tooth: number) {
  const code = TOOTH_SCT[tooth]
  // display sengaja dikosongkan (opsional di FHIR): nama resmi SNOMED per gigi tidak disalin agar tidak keliru
  return code ? { coding: [{ system: SCT, code }], text: `Gigi ${tooth}` } : null
}

// Lampiran 4 — permukaan. Dentiva: M, D, B (bukal/labial), L (lingual/palatal), O, MO, DO.
const SURFACE: Record<string, Coding> = {
  M: sct('710099007', 'Mesial'),
  O: sct('257885003', 'Occlusion-action'),
  D: sct('46053002', 'Distal'),
  B: sct('302990001', 'Buccalis'),
  L: sct('255579002', 'Palatal-lingual'),
};
const splitSurface = (s: string): string[] => (SURFACE[s] ? [s] : s.split('').filter((c) => SURFACE[c]));

// Komponen Tabel 5
type Kind = 'finding' | 'fillingMaterial' | 'restoration' | 'prosthesisMaterial' | 'prosthesis';
const COMPONENT_CODE: Record<Kind, Coding> = {
  finding: sct('278544002', 'Tooth finding'),
  fillingMaterial: sct('432680005', 'Dental filling material'),
  restoration: sct('251335007', 'Dental restoration or prosthesis shade'),
  prosthesisMaterial: sct('256509009', 'Maxillofacial prosthesis and appliance material'),
  prosthesis: { system: LOINC, code: '34026-5', display: 'Dental prosthesis' },
};
const SURFACE_COMPONENT: Coding = { system: LOINC, code: '32889-8', display: 'Surface [Identifier] Tooth' };

type Fact = { kind: Kind; value: Coding };
const F = (kind: Kind, value: Coding): Fact => ({ kind, value });

const RCT = F('fillingMaterial', sct('256532008', 'Root canal filling material'));
const FILLED = F('restoration', sct('278550007', 'Dental filling present'));

/** Kode odontogram Dentiva (OdontogramData.js) → fakta SATUSEHAT (Lampiran 5–9). Kode tak dikenal → []. */
export const DENTAL_CODE_FACTS: Record<string, Fact[]> = {
  // permukaan
  amf: [F('fillingMaterial', sct('256447001', 'Amalgam (silver) dental filling material')), FILLED],
  cof: [F('fillingMaterial', sct('256452006', 'Composite dental filling material')), FILLED],
  fis: [F('fillingMaterial', sct('256455008', 'Fissure sealant material'))],
  car: [F('finding', sct('80967001', 'Dental caries'))],
  nvt: [F('finding', kemkes('OV000092', 'Gigi Non-Vital'))],
  rct: [RCT],
  'amf-rct': [F('fillingMaterial', sct('256447001', 'Amalgam (silver) dental filling material')), FILLED, RCT],
  'cof-rct': [F('fillingMaterial', sct('256452006', 'Composite dental filling material')), FILLED, RCT],
  ano: [F('finding', kemkes('OV000091', 'Anomali'))],
  cfr: [F('finding', sct('278590005', 'Fractured dental crown'))],
  // seluruh gigi
  sou: [F('finding', sct('162005007', 'No tooth problem'))],
  non: [F('finding', kemkes('OV000090', 'Gigi tidak ada/ tidak diketahui'))],
  une: [F('finding', sct('278658009', 'Tooth Unerupted'))],
  pre: [F('finding', sct('278660006', 'Tooth partially erupted'))],
  mis: [F('finding', sct('234948008', 'Tooth absent'))],
  rrx: [F('finding', kemkes('OV000093', 'Sisa Akar'))],
  fmc: [F('restoration', sct('468240009', 'Dental crown, metal'))],
  'fmc-rct': [F('restoration', sct('468240009', 'Dental crown, metal')), RCT],
  poc: [F('restoration', sct('468254001', 'Dental crown, ceramic'))],
  'ipx-poc': [F('restoration', sct('468993001', 'Dental implant system')), F('restoration', sct('468254001', 'Dental crown, ceramic'))],
  meb: [F('restoration', kemkes('OV000094', 'Metal Bridge'))],
  'poc-bridge': [F('restoration', kemkes('OV000095', 'Porcelain Bridge'))],
  PON: [F('restoration', sct('260930001', 'Pontic'))],
  frm: [F('prosthesis', sct('272256008', 'Partial denture')),
    F('prosthesisMaterial', sct('256525004', 'Maxillofacial prosthesis or appliance material - metal'))],
  acr: [F('prosthesisMaterial', sct('256511000', 'Acrylic dental material'))],
  // 'arrow' (migrasi/rotasi) tidak punya padanan keadaan gigi di Lampiran 5 → tidak dikirim.
};

/** Baris tooth_conditions (whole/surface, has_rct) → daftar {kunci, gigi, permukaan?, fakta}. */
export interface ToothRow { tooth_number: number; condition_type: string; condition_code: string; surface?: string | null; has_rct?: boolean | null }
export interface DentalFinding { key: string; tooth: number; surface?: string; facts: Fact[] }

export function odontogramFindings(rows: ToothRow[]): { findings: DentalFinding[]; unmapped: string[] } {
  const unmapped = new Set<string>();
  const groups = new Map<string, DentalFinding>();
  const add = (tooth: number, surface: string | undefined, facts: Fact[]) => {
    const base = `odo-${tooth}${surface ? `-${surface}` : ''}`;
    const g = groups.get(base) ?? { key: base, tooth, surface, facts: [] };
    for (const f of facts) {
      if (!g.facts.some((x) => x.kind === f.kind && x.value.code === f.value.code)) g.facts.push(f);
    }
    groups.set(base, g);
  };
  for (const r of rows) {
    const tooth = Number(r.tooth_number);
    if (!TOOTH_SCT[tooth]) { unmapped.add(`gigi ${r.tooth_number}`); continue; }
    const code = String(r.condition_code ?? '');
    const facts = DENTAL_CODE_FACTS[code];
    if (r.condition_type === 'surface' && r.surface) {
      if (!facts) { unmapped.add(code); continue; }
      // Bahan saluran akar milik gigi, bukan permukaan
      const surfaceFacts = facts.filter((f) => f !== RCT);
      for (const s of splitSurface(r.surface)) if (surfaceFacts.length) add(tooth, s, surfaceFacts);
      if (facts.includes(RCT)) add(tooth, undefined, [RCT]);
    } else if (r.condition_type === 'whole') {
      if (code && code !== 'LAYER_ONLY') {
        if (facts) add(tooth, undefined, facts); else unmapped.add(code);
      }
    }
    if (r.has_rct) add(tooth, undefined, [RCT]);
  }
  return { findings: [...groups.values()].filter((g) => g.facts.length), unmapped: [...unmapped] };
}

/** Satu jenis komponen hanya sekali per Observation — fakta ganda (mis. implan + mahkota) dipecah ke Observation berikutnya. */
function splitByKind(facts: Fact[]): Fact[][] {
  const out: Fact[][] = [];
  for (const f of facts) {
    const slot = out.find((group) => !group.some((x) => x.kind === f.kind));
    if (slot) slot.push(f); else out.push([f]);
  }
  return out;
}

export interface ObsContext { patientSId: string; encounterId: string; practitionerSId?: string | null; isoTimestamp: string; identifierSystem: string; visitId: string }
export interface BuiltObservation { key: string; payload: Record<string, unknown> }

function baseObservation(ctx: ObsContext, key: string, code: Coding) {
  return {
    resourceType: 'Observation',
    identifier: [{ system: ctx.identifierSystem, value: `${ctx.visitId}-${key}` }],
    status: 'final',
    category: CATEGORY_EXAM,
    code: { coding: [code] },
    subject: { reference: `Patient/${ctx.patientSId}` },
    encounter: { reference: `Encounter/${ctx.encounterId}` },
    ...(ctx.practitionerSId ? { performer: [{ reference: `Practitioner/${ctx.practitionerSId}` }] } : {}),
    effectiveDateTime: ctx.isoTimestamp,
    issued: ctx.isoTimestamp,
  };
}

export function buildOdontogramObservations(rows: ToothRow[], ctx: ObsContext): { observations: BuiltObservation[]; unmapped: string[] } {
  const { findings, unmapped } = odontogramFindings(rows);
  const observations: BuiltObservation[] = [];
  for (const f of findings) {
    splitByKind(f.facts).forEach((facts, i) => {
      const key = i === 0 ? f.key : `${f.key}-${i + 1}`;
      observations.push({
        key,
        payload: {
          ...baseObservation(ctx, key, kemkes('OC000061', 'Pemeriksaan Odontogram')),
          bodySite: toothBodySite(f.tooth),
          valueBoolean: true,
          component: [
            ...(f.surface ? [{ code: { coding: [SURFACE_COMPONENT] }, valueCodeableConcept: { coding: [SURFACE[f.surface]] } }] : []),
            ...facts.map((x) => ({ code: { coding: [COMPONENT_CODE[x.kind]] }, valueCodeableConcept: { coding: [x.value] } })),
          ],
        },
      });
    });
  }
  return { observations, unmapped };
}

// ── OHIS (Tabel 4; Lampiran 2 & 3) ──
const OHIS_TEETH = ['16', '11', '26', '36', '31', '46'];
const DEBRIS: Record<number, Coding> = {
  1: kemkes('OV000097', 'Terdapat debris pada 1/3 permukaan servikal gigi atau dijumpai stain ekstrinsik'),
  2: kemkes('OV000098', 'Terdapat debris pada 1/3 – 2/3 permukaan gigi'),
  3: kemkes('OV000099', 'Terdapat debris pada > 2/3 permukaan gigi'),
};
const CALCULUS: Record<number, Coding> = {
  1: kemkes('OV000100', 'Terdapat kalkulus supragingiva pada 1/3 permukaan servikal gigi tanpa kalkulus subgingiva'),
  2: kemkes('OV000101', 'Terdapat kalkulus supragingiva pada 1/3 – 2/3 permukaan gigi dan/atau terdapat kalkulus subgingiva berupa titik-titik yang tidak melingkari leher gigi'),
  3: kemkes('OV000102', 'Terdapat kalkulus supragingiva pada > 2/3 permukaan gigi dan/atau terdapat kalkulus subgingiva yang melingkari leher gigi'),
};
const score = (v: number) => ({ value: v, unit: 'score', system: 'http://unitsofmeasure.org', code: '{score}' });

export interface OhisScores { debris: Record<string, number>; calculus: Record<string, number> }

/** periodontal_data.calculus (JSON dari formulir rekam medis) → skor OHIS; null bila bukan data OHIS atau belum diisi. */
export function parseOhis(raw: unknown): OhisScores | null {
  let v: any = raw;
  if (typeof raw === 'string') { try { v = JSON.parse(raw); } catch { return null; } }
  if (!v || typeof v.debris !== 'object' || typeof v.calculus !== 'object') return null;
  const clean = (o: Record<string, unknown>) =>
    Object.fromEntries(OHIS_TEETH.map((t) => [t, Math.min(3, Math.max(0, Math.round(Number(o?.[t]) || 0)))]));
  const s = { debris: clean(v.debris), calculus: clean(v.calculus) };
  const filled = [...Object.values(s.debris), ...Object.values(s.calculus)].some((x) => x > 0);
  return filled ? s : null;
}

/** Rumus Greene & Vermillion (sama dengan formulir rekam medis): DI/CI = jumlah skor / 6; OHIS = DI + CI. */
export function ohisTotals(s: OhisScores) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const di = r2(OHIS_TEETH.reduce((a, t) => a + s.debris[t], 0) / 6);
  const ci = r2(OHIS_TEETH.reduce((a, t) => a + s.calculus[t], 0) / 6);
  const ohis = r2(di + ci);
  const interpretation = ohis <= 1.2 ? kemkes('OI000029', 'Kondisi Gigi Baik')
    : ohis <= 3.0 ? kemkes('OI000030', 'Kondisi Gigi Cukup Baik')
    : kemkes('OI000031', 'Kondisi Gigi Buruk');
  return { di, ci, ohis, interpretation };
}

export function buildOhisObservations(s: OhisScores, ctx: ObsContext): BuiltObservation[] {
  const out: BuiltObservation[] = [];
  for (const t of OHIS_TEETH) {
    const d = s.debris[t], c = s.calculus[t];
    if (DEBRIS[d]) out.push({ key: `di-${t}`, payload: { ...baseObservation(ctx, `di-${t}`, kemkes('OC000062', 'Debris Indeks')), bodySite: toothBodySite(Number(t)), valueCodeableConcept: { coding: [DEBRIS[d]] } } });
    if (CALCULUS[c]) out.push({ key: `ci-${t}`, payload: { ...baseObservation(ctx, `ci-${t}`, kemkes('OC000063', 'Kalkulus Indeks')), bodySite: toothBodySite(Number(t)), valueCodeableConcept: { coding: [CALCULUS[c]] } } });
  }
  const { di, ci, ohis, interpretation } = ohisTotals(s);
  out.push({ key: 'di-total', payload: { ...baseObservation(ctx, 'di-total', kemkes('OC000056', 'Skor Total Debris Indeks')), valueQuantity: score(di) } });
  out.push({ key: 'ci-total', payload: { ...baseObservation(ctx, 'ci-total', kemkes('OC000057', 'Skor Total Kalkulus Indeks')), valueQuantity: score(ci) } });
  out.push({ key: 'ohis-total', payload: {
    ...baseObservation(ctx, 'ohis-total', kemkes('OC000058', 'Skor Total Oral Hygiene Index Simplified (OHIS)')),
    valueQuantity: score(ohis),
    interpretation: [{ coding: [interpretation] }],
  } });
  return out;
}

/**
 * Kirim Observation odontogram & OHIS untuk satu kunjungan. Mengembalikan ID Observation SATUSEHAT
 * (yang baru dibuat maupun yang sudah ada). existingOutboxIds: identifier.value → outbox id (percobaan ulang).
 */
export async function buildAndSyncDentalObservations(
  supabaseAdmin: any,
  visitId: string,
  patientSId: string,
  practitionerSId: string | null | undefined,
  encounterId: string,
  isoTimestamp: string,
  existingOutboxIds?: Record<string, string>,
  triggeredBy?: string | null,
): Promise<string[]> {
  const { data: visit } = await supabaseAdmin.from('visits').select('clinic_id, patient_id').eq('id', visitId).single();
  if (!visit?.patient_id) return [];

  const [{ data: org }, { data: teeth, error: tErr }, { data: perio }] = await Promise.all([
    supabaseAdmin.from('satusehat_organizations').select('satusehat_organization_id').eq('clinic_id', visit.clinic_id).maybeSingle(),
    supabaseAdmin.from('tooth_conditions').select('tooth_number, condition_type, condition_code, surface, has_rct')
      .eq('patient_id', visit.patient_id).eq('clinic_id', visit.clinic_id),
    supabaseAdmin.from('periodontal_data').select('calculus').eq('patient_id', visit.patient_id).eq('clinic_id', visit.clinic_id)
      .order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (tErr) throw new Error('Failed to query tooth_conditions: ' + tErr.message);
  if (!org?.satusehat_organization_id) {
    throw new Error('Cannot build Observation identifier: clinic has no synced SATUSEHAT Organization ID yet.');
  }

  const ctx: ObsContext = {
    patientSId, encounterId, practitionerSId, isoTimestamp, visitId,
    identifierSystem: `http://sys-ids.kemkes.go.id/observation/${org.satusehat_organization_id}`,
  };

  const { observations: odo, unmapped } = buildOdontogramObservations(teeth ?? [], ctx);
  if (unmapped.length) console.warn(`[odontogram] kode tanpa padanan SATUSEHAT dilewati: ${unmapped.join(', ')}`);

  let calculusRaw = perio?.calculus ?? null;
  if (typeof calculusRaw === 'string' && calculusRaw.startsWith('PGP')) [calculusRaw] = await decryptBatch(supabaseAdmin, [calculusRaw]);
  const ohisScores = parseOhis(calculusRaw);
  const all = [...(ohisScores ? buildOhisObservations(ohisScores, ctx) : []), ...odo];
  if (!all.length) return [];

  // Baris antrean Observation kunjungan ini dipakai ulang (identifier → outbox id) agar percobaan ulang tidak menggandakan antrean.
  const { data: queued } = await supabaseAdmin.from('satusehat_outbox').select('id, payload')
    .eq('related_visit_id', visitId).eq('resource_type', 'Observation');
  const outboxByIdentifier: Record<string, string> = {};
  for (const q of queued ?? []) {
    const v = q.payload?.identifier?.[0]?.value;
    if (v) outboxByIdentifier[v] = q.id;
  }
  Object.assign(outboxByIdentifier, existingOutboxIds ?? {});

  // Observation yang sudah ada di SATUSEHAT untuk kunjungan ini (identifier → id)
  const existing = new Map<string, string>();
  const searchRes = await fhirRequest(supabaseAdmin, 'GET', `Observation?encounter=Encounter/${encounterId}`);
  for (const e of (searchRes.ok ? searchRes.data?.entry ?? [] : [])) {
    for (const idf of e.resource?.identifier ?? []) {
      if (idf.system === ctx.identifierSystem) existing.set(idf.value, e.resource.id);
    }
  }

  const ids: string[] = [];
  for (const o of all) {
    const idValue = `${visitId}-${o.key}`;
    const outboxId = await recordOutboxStart(supabaseAdmin, {
      clinicId: visit.clinic_id,
      resourceType: 'Observation',
      relatedVisitId: visitId,
      relatedPatientId: visit.patient_id,
      payload: o.payload,
      outboxId: outboxByIdentifier[idValue],
      triggeredBy,
    });
    const found = existing.get(idValue);
    if (found) {
      await recordOutboxSuccess(supabaseAdmin, outboxId, found);
      ids.push(found);
      continue;
    }
    const res = await fhirRequest(supabaseAdmin, 'POST', 'Observation', o.payload);
    if (res.ok) {
      await recordOutboxSuccess(supabaseAdmin, outboxId, res.data.id);
      ids.push(res.data.id);
    } else {
      const errText = JSON.stringify(res.data);
      console.error(`Failed to create Observation ${o.key}: HTTP ${res.status} - ${errText}`);
      await recordOutboxFailure(supabaseAdmin, outboxId, res.status, errText);
    }
  }
  return ids;
}
