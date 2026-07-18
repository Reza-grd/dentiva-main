import { z } from 'zod';
import { sanitizeInput } from './sanitize';

// Helper to create a sanitized string schema
const zSanitizedString = () => z.string().transform(val => sanitizeInput(val));

export const patientRegistrationSchema = z.object({
  nama_lengkap: zSanitizedString().pipe(z.string().min(3, "Nama lengkap minimal 3 karakter")),
  no_wa: zSanitizedString().pipe(z.string().regex(/^[0-9]{9,15}$/, "Nomor WA tidak valid (9-15 angka)")),
  jenis_kelamin: zSanitizedString().pipe(z.string().min(1, "Pilih jenis kelamin")),
  tanggal_lahir: zSanitizedString().pipe(z.string().min(1, "Pilih tanggal lahir")),
  umur: zSanitizedString().optional(),
  agama: zSanitizedString().optional(),
  pekerjaan: zSanitizedString().optional(),
  pendidikan_terakhir: zSanitizedString().optional(),
  status_pernikahan: zSanitizedString().optional(),
  golongan_darah: zSanitizedString().optional(),
  berat_badan: zSanitizedString().optional(),
  tinggi_badan: zSanitizedString().optional(),
  provinsi: zSanitizedString().optional(),
  kabupaten: zSanitizedString().optional(),
  kecamatan: zSanitizedString().optional(),
  desa: zSanitizedString().optional(),
  alamat_detail: zSanitizedString().optional(),
  keluhan_awal: zSanitizedString().optional(),
  wa_consent: z.boolean().optional(),
  isDaftarDanJadwalkan: z.boolean().optional(),
});

export const scheduleVisitSchema = z.object({
  dokter_id: zSanitizedString().pipe(z.string().min(1, "Pilih dokter")),
  tanggal_kunjungan: zSanitizedString().pipe(z.string().min(1, "Pilih tanggal kunjungan")),
  jam_kunjungan: zSanitizedString().pipe(z.string().min(1, "Pilih jam kunjungan")),
  keluhan: zSanitizedString().optional(),
  catatan: zSanitizedString().optional(),
});
