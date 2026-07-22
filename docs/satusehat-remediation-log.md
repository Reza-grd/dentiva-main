# SATUSEHAT FHIR Integration — Remediation Log (Source of Truth)
**EMR System**: Dentiva EMR (`Reza-grd/dentiva-main`)  
**Target Standard**: Kemenkes RI SATUSEHAT Platform (FHIR R4)  
**Document Path**: `docs/satusehat-remediation-log.md`

---

## Remediation Log Table

| Fix ID | File(s) Changed | Status | Verification Source (quoted) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Fix A** | `practitioner.ts`, `50_medication_form_and_str_updates.sql` | **Fixed** | **SATUSEHAT Public Postman Request 0ghdxvo:**<br>`"system": "https://terminology.kemkes.go.id/v1-0302"`, `"code": "STR-KKI"`, `"system": "https://fhir.kemkes.go.id/id/str-kki-number"` | Verified from SATUSEHAT Public Postman Collection ("Practitioner - By Name and NIK" request). Replaced legacy v2-0360 MD/DDS with the STR-KKI registration scheme. |
| **Fix B** | `encounter.ts` | **Fixed** | **SATUSEHAT Platform Docs - Condition page:**<br>`"http://sys-ids.kemkes.go.id/condition/{{organization-ihs-number}}"` | Scoped the local identifier namespaces (`sys-ids.kemkes.go.id`) with the clinic's actual SATUSEHAT Organization IHS number rather than internal Supabase UUIDs. |
| **Fix C** | `medicationRequest.ts`, `50_medication_form_and_str_updates.sql` | **Fixed** | **SATUSEHAT Platform Docs - Pelayanan Kefarmasian:**<br>`"Pengiriman data peresepan obat akan menggunakan 2 resources yaitu Medication dan MedicationRequest... Kedua data ini dikirimkan secara bersamaan sebagai 1 paket"` | Restructured payload to pair `MedicationRequest` with a `contained` `Medication` resource (`id: "#med-1"`) representing the KFA drug and form, referenced via `medicationReference`. |
| **Fix D** | `encounter.ts`, `satusehat-sync-visit/index.ts` | **Fixed** | **SATUSEHAT Encounter Profile - Element Diagnosis:**<br>`"Encounter.diagnosis element links Condition resources to the Encounter via condition.reference = Condition/{id} and diagnosis role coding."` | Implemented `updateEncounterDiagnoses()` to issue a PUT-back update linking Condition IDs directly to Encounter.diagnosis. |
| **Fix E** | `medicationRequest.ts` | **Fixed** | **SATUSEHAT Platform Docs - MedicationRequest Search:**<br>`"Supported search parameters: subject, encounter, identifier"` | Solved idempotency check regression by assigning a stable organization-scoped identifier to MedicationRequest and implementing a two-pass search. |
| **Fix F** | `encounter.ts` | **Fixed** | **HL7 v3 CodeSystem diagnosis-role (http://terminology.hl7.org/CodeSystem/diagnosis-role):**<br>`"CC = Chief complaint (primary outpatient diagnosis)"`, `"DD = Discharge diagnosis (secondary outpatient diagnosis)"` | Removed inpatient-only code `AD` (Admission diagnosis) for outpatient dental encounters. Chief complaint (`CC`) and Discharge diagnosis (`DD`) are used instead. |
| **Fix G** | `practitioner.ts` | **Fixed** | **Kemenkes Terminology CodeSystem v1-0302:**<br>`"STR-KKI = Surat Tanda Registrasi Dokter (unified code for KKI doctor/dentist registrations)"`, `"STR-KTKI = Surat Tanda Registrasi Perawat (for KTKI health workers)"` | Correctly handles doctors/dentists (`STR-KKI` under KKI) and nurses (`STR-KTKI` under KTKI) based on practitioner_type, utilizing correct issuers. |

---

## Verification & Architectural Notes

### 1. Practitioner STR Classification (Fix G)
Under Kemenkes CodeSystem `v1-0302`, `STR-KKI` is the unified registration type code for all practitioners registered under Konsil Kedokteran Indonesia (KKI / KKGI), which covers both medical doctors and dentists. Midwives, nurses, and other allied health workers are registered under Konsil Tenaga Kesehatan Indonesia (KTKI) and use `STR-KTKI` under the same system.
- **Dentist/Physician STR Issuer**: KKI (`Organization/10000003`)
- **Nurse STR Issuer**: KTKI (`Organization/10000004`)

### 2. Idempotency & Search Strategy (Fix E)
Since SATUSEHAT `MedicationRequest` references KFA codes inside a `contained` resource, querying by `code` parameter directly is unsupported. To prevent duplicate entries during sync retries, each `MedicationRequest` is assigned a unique identifier:
`system`: `http://sys-ids.kemkes.go.id/prescription/{orgIhs}`
`value`: `{visitId}-{visitObatId}`
The system queries this identifier during sync; on search failure, it runs a fallback search by `encounter` and filters matched entries in-memory by KFA code.

### 3. Outpatient Encounter Diagnosis Roles (Fix F)
To align with outpatient care semantics for a dental clinic, the inpatient concept of "Admission diagnosis" (`AD`) is eliminated. Primary outpatient encounter diagnoses are labeled `CC` (Chief complaint), and secondary/subsequent diagnoses are labeled `DD` (Discharge diagnosis) using the official HL7 `diagnosis-role` CodeSystem.
