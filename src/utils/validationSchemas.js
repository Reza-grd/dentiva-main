import { z } from 'zod';

export const patientRegistrationSchema = z.object({
  nama_lengkap: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  no_wa: z.string().regex(/^[0-9]{9,15}$/, "Nomor WA tidak valid (9-15 angka)"),
  jenis_kelamin: z.string().min(1, "Pilih jenis kelamin"),
  tanggal_lahir: z.string().min(1, "Pilih tanggal lahir"),
  umur: z.string().optional(),
  agama: z.string().optional(),
  pekerjaan: z.string().optional(),
  pendidikan_terakhir: z.string().optional(),
  status_pernikahan: z.string().optional(),
  golongan_darah: z.string().optional(),
  berat_badan: z.string().optional(),
  tinggi_badan: z.string().optional(),
  provinsi: z.string().optional(),
  kabupaten: z.string().optional(),
  kecamatan: z.string().optional(),
  desa: z.string().optional(),
  alamat_detail: z.string().optional(),
  keluhan_awal: z.string().optional(),
  wa_consent: z.boolean().optional(),
  // For scheduling inside registration
  isDaftarDanJadwalkan: z.boolean().optional(),
});

export const scheduleVisitSchema = z.object({
  dokter_id: z.string().min(1, "Pilih dokter"),
  tanggal_kunjungan: z.string().min(1, "Pilih tanggal kunjungan"),
  jam_kunjungan: z.string().min(1, "Pilih jam kunjungan"),
  keluhan: z.string().optional(),
  catatan: z.string().optional(),
});
