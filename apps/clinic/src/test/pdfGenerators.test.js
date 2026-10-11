/** Pembuatan PDF tetap berfungsi setelah jsPDF 4 / jspdf-autotable 5 (pembaruan keamanan). */
import { describe, it, expect, vi, afterEach } from 'vitest';
const captured = vi.hoisted(() => []);
vi.mock('jspdf', async (orig) => {
  const mod = await orig();
  // jsPDF 4 memasang save() per instance → ganti dengan penangkap byte (tanpa mengunduh berkas)
  class Capture extends mod.jsPDF {
    constructor(...a) {
      super(...a);
      this.save = (name) => { captured.push({ name, bytes: new Uint8Array(this.output('arraybuffer')) }); return this; };
    }
  }
  return { ...mod, default: Capture, jsPDF: Capture };
});
import { generateConsentPdf } from '../utils/consentPdfGenerator';
import { generatePDPAccessPDF } from '../utils/pdpExportPdfGenerator';
import { generatePrescriptionPdf } from '../utils/prescriptionPdfGenerator';

afterEach(() => { captured.length = 0; });
const isPdf = (b) => String.fromCharCode(...b.slice(0, 5)) === '%PDF-' && b.length > 800;

const clinic = { name: 'Klinik Uji', address: 'Jl. Uji 1', phone: '0800' };
const patient = { nama_lengkap: 'Pasien Uji', no_rm: 'RM-000001', umur_tahun: 30, alamat: 'Jl. Contoh' };

describe('PDF', () => {
  it('resep dokter (tabel obat)', () => {
    const visit = { tanggal_kunjungan: '2026-10-10', prescriptions: [{ nama_obat: 'Obat Uji', dosis: '500 mg', qty: 10, frekuensi: '3x1' }] };
    generatePrescriptionPdf(visit, patient, { full_name: 'drg. Uji', noStr: '123', noSip: '456' }, clinic);
    expect(isPdf(captured[0].bytes)).toBe(true);
  });

  it('ekspor akses data pribadi (dua tabel + lastAutoTable)', () => {
    generatePDPAccessPDF(patient, [{ tanggal_kunjungan: '2026-10-10', keluhan: 'x', diagnosa: 'y', terapi: 'z' }], clinic);
    expect(isPdf(captured[0].bytes)).toBe(true);
  });

  it('persetujuan tindakan', () => {
    generateConsentPdf({ title: 'Persetujuan Tindakan', patient_name: 'Pasien Uji', treatment_type: 'Tambal', doctor_name: 'drg. Uji', created_at: '2026-10-10', signed_at: '2026-10-10' }, clinic);
    expect(isPdf(captured[0].bytes)).toBe(true);
  });
});
