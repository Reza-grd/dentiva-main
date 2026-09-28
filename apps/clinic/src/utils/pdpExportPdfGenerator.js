import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate PDF report for Data Subject Access Request (UU PDP Compliance)
 *
 * @param {object} patient - Decrypted patient data object
 * @param {array} visits - List of patient visits
 * @param {object} clinic - Clinic metadata
 */
export function generatePDPAccessPDF(patient, visits = [], clinic = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(clinic.nama_klinik || 'DENTIVA DENTAL CLINIC', pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('BERKAS EKSPOR HAK AKSES DATA PASIEN (UU PDP NO. 27 TAHUN 2022)', pageWidth / 2, 25, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(14, 28, pageWidth - 14, 28);

  // Patient Info Box
  let yPos = 35;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI SUBJEK DATA (PASIEN)', 14, yPos);

  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const infoRows = [
    ['No. Rekam Medis (RM)', patient.no_rm || '-'],
    ['Nama Lengkap', patient.nama_lengkap || '-'],
    ['NIK / Identitas', patient.nik || '-'],
    ['Jenis Kelamin', patient.jenis_kelamin || '-'],
    ['Tanggal Lahir / Umur', `${patient.tanggal_lahir || '-'} (${patient.umur || '-'} tahun)`],
    ['No. WhatsApp / HP', patient.no_wa || patient.no_telepon || '-'],
    ['Alamat Detail', patient.alamat_detail || patient.alamat || '-'],
    ['Status Persetujuan WA', patient.wa_consent ? 'Menyetujui' : 'Tidak Menyetujui'],
    ['Status SatuSehat ID', patient.satusehat_patient_id || 'Belum Terhubung'],
    ['Tanggal Ekspor PDF', new Date().toLocaleString('id-ID')]
  ];

  doc.autoTable({
    startY: yPos,
    head: [['Parameter Data', 'Detail Nilai Rekam Medis']],
    body: infoRows,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' } }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Medical Visits History
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`RIWAYAT KUNJUNGAN & REKAM MEDIS (${visits.length} Kunjungan)`, 14, yPos);

  yPos += 6;
  if (visits.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Belum ada catatan riwayat kunjungan medis.', 14, yPos);
  } else {
    const visitRows = visits.map((v) => [
      v.tanggal_kunjungan || '-',
      v.doctor?.full_name || 'Dokter Gigi',
      v.keluhan || '-',
      v.diagnosa || v.kode_icd10 || '-',
      v.terapi || '-'
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Tanggal', 'Dokter Pemeriksa', 'Anamnesa / Keluhan', 'Diagnosa (ICD-10)', 'Tindakan / Terapi']],
      body: visitRows,
      theme: 'striped',
      headStyles: { fillColor: [52, 73, 94], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 }
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Footer / Legal Notice
  if (yPos > 260) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Dokumen ini dicetak sebagai penemuan hak akses subjek data sesuai Pasal 31 UU PDP No. 27/2022 & Permenkes 24/2022.',
    14,
    yPos
  );
  doc.text('Kerahasiaan dokumen ini dilindungi oleh undang-undang rekam medis nasional.', 14, yPos + 4);

  // Save PDF
  const filename = `Data_Pasien_${patient.no_rm || 'PDP'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
