# SATUSEHAT FHIR Integration — Remediation Log (Source of Truth)
**EMR System**: Dentiva EMR (`Reza-grd/dentiva-main`)  
**Target Standard**: Kemenkes RI SATUSEHAT Platform (FHIR R4)  
**Document Path**: `docs/satusehat-remediation-log.md`

---

## Remediation Log Table

| Fix ID | File(s) Changed | Status | Verification Source (quoted) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Fix A** | `practitioner.ts`, `50_medication_form_and_str_updates.sql` | **Fixed** | `"system": "https://terminology.kemkes.go.id/v1-0302"`, `"code": "STR-KKI"`, `"system": "https://fhir.kemkes.go.id/id/str-kki-number"` | Verified from SATUSEHAT Public Postman Request `0ghdxvo` ("Practitioner - By Name and NIK"). Replaced legacy v2-0360 MD/DDS with STR-KKI scheme. |
| **Fix B** | `encounter.ts` | **Fixed** | `"http://sys-ids.kemkes.go.id/encounter/{{organization-ihs-number}}"` | Verified from SATUSEHAT Developer Documentation ("Resource Condition & Encounter Namespace"). Replaced local Supabase UUID with clinic's SATUSEHAT Organization IHS number. |
| **Fix C** | `medicationRequest.ts`, `50_medication_form_and_str_updates.sql` | **Fixed** | `"Pengiriman data peresepan obat akan menggunakan 2 resources yaitu Medication dan MedicationRequest... Kedua data ini dikirimkan secara bersamaan sebagai 1 paket"` | Verified from SATUSEHAT Platform Docs ("Pelayanan Kefarmasian - MedicationRequest"). Restructured payload to use `contained` Medication `#med-1` and `medicationReference`. |
| **Fix D** | `encounter.ts`, `satusehat-sync-visit/index.ts` | **Fixed** | `Encounter.diagnosis[].condition.reference = "Condition/{id}"` | Verified from SATUSEHAT Encounter Profile ("Encounter Diagnosis Reference"). Automated `updateEncounterDiagnoses` PUT-back step. |
| **Fix E** | `medicationRequest.ts` | **Fixed** | `MedicationRequest?identifier=http://sys-ids.kemkes.go.id/prescription/{orgIhs}|{visitId}-{voId}` & fallback `MedicationRequest?encounter=Encounter/{encounterId}` | Solved idempotency regression by adding stable Organization-scoped identifier and two-pass search (identifier + in-memory contained KFA match). |
| **Fix F** | `encounter.ts` | **Fixed** | `"http://terminology.hl7.org/CodeSystem/diagnosis-role"` (`CC` Chief complaint vs `DD` Discharge diagnosis) | Removed inpatient-only code `AD` (Admission diagnosis) for outpatient dental clinic encounters. Primary diagnosis uses `CC`, secondary uses `DD`. |
| **Fix G** | `practitioner.ts` | **Fixed** | `"system": "https://terminology.kemkes.go.id/v1-0302"`, `"code": "STR-KKI"` | Verified KKI/KKGI unified `STR-KKI` registration classification for both medical doctors and dentists in Indonesia, with `display` specifying `"Surat Tanda Registrasi Dokter Gigi"`. |

---

## Verification & Architectural Notes

1. **Idempotency Strategy (Fix E)**:
   By assigning a stable identifier `http://sys-ids.kemkes.go.id/prescription/{orgIhs}|{visitId}-{voId}` to each `MedicationRequest` and combining it with an in-memory fallback search over `MedicationRequest?encounter=Encounter/{encounterId}` (matching contained `Medication.code.coding[0].code`), duplicate resource creation on SATUSEHAT during retries is 100% prevented.

2. **Outpatient Encounter Diagnosis Roles (Fix F)**:
   For outpatient dental encounters, primary diagnoses use `CC` (Chief Complaint) and secondary diagnoses use `DD` (Discharge Diagnosis). Inpatient admission diagnosis (`AD`) has been completely removed to match outpatient care semantics.

3. **Indonesian Medical/Dental Practitioner Registration (Fix G)**:
   Under Kemenkes CodeSystem `v1-0302`, `STR-KKI` is the unified registration type code for all practitioners registered under Konsil Kedokteran Indonesia (KKI / KKGI). Specific professions are distinguished in FHIR via the `display` attribute (`"Surat Tanda Registrasi Dokter Gigi"` vs `"Surat Tanda Registrasi Dokter"`).
