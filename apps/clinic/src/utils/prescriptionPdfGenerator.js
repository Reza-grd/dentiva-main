import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { parseDateLocal } from './dateUtils';

/**
 * Generate a PDF prescription (Resep Dokter)
 *
 * @param {Object} visit - Visit object (must include prescriptions array and tanggal_kunjungan)
 * @param {Object} patient - Patient object (nama_lengkap, umur_tahun/bulan, alamat)
 * @param {Object} doctor - Doctor object (full_name, noStr, noSip)
 * @param {Object} clinic - Clinic settings object (name, address, phone)
 */
export const generatePrescriptionPdf = (visit, patient, doctor, clinic) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header: Clinic Info ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(clinic?.name || 'Klinik Gigi NeuroDent', pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(clinic?.address || 'Jl. Raya Kesehatan No. 123, Kota', pageWidth / 2, 26, { align: 'center' });
  doc.text(`Telp/WA: ${clinic?.phone || '0812-3456-7890'}`, pageWidth / 2, 31, { align: 'center' });

  // Draw separator line
  doc.setLineWidth(0.5);
  doc.line(20, 35, pageWidth - 20, 35);

  // --- Doctor Info ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(doctor?.full_name || 'Dokter', 20, 45);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (doctor?.noStr) {
    doc.text(`No. STR: ${doctor.noStr}`, 20, 50);
  }
  if (doctor?.noSip) {
    doc.text(`No. SIP: ${doctor.noSip}`, 20, 55);
  }

  // --- Location & Date (Right aligned) ---
  const today = visit?.tanggal_kunjungan ? parseDateLocal(visit.tanggal_kunjungan) : new Date();
  const dateStr = today.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`${clinic?.city || 'Kota'}, ${dateStr}`, pageWidth - 20, 45, { align: 'right' });

  // --- Rx Symbol ---
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(28);
  doc.text('R/', 20, 70);

  // --- Prescription Table ---
  const prescriptions = visit?.prescriptions || [];
  
  if (prescriptions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('Tidak ada obat yang diresepkan.', 35, 70);
  } else {
    const tableData = prescriptions.map((p, idx) => [
      idx + 1,
      p.nama_obat,
      p.dosis || '-',
      p.qty.toString(),
      p.frekuensi || '-'
    ]);

    doc.autoTable({
      startY: 75,
      margin: { left: 20, right: 20 },
      head: [['No', 'Nama Obat', 'Dosis', 'Jumlah', 'Aturan Pakai']],
      body: tableData,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' }, // No
        1: { cellWidth: 'auto' }, // Nama Obat
        2: { cellWidth: 30 }, // Dosis
        3: { cellWidth: 20, halign: 'center' }, // Jumlah
        4: { cellWidth: 40 }  // Aturan Pakai
      }
    });
  }

  // --- Footer: Patient Info & Signature ---
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 100;

  // Draw separator before patient info
  doc.setLineWidth(0.2);
  doc.line(20, finalY, pageWidth - 20, finalY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Patient Info Block
  doc.text('Pro', 20, finalY + 10);
  doc.text(':', 35, finalY + 10);
  doc.text(patient?.nama_lengkap || '-', 40, finalY + 10);

  doc.text('Umur', 20, finalY + 15);
  doc.text(':', 35, finalY + 15);
  const ageStr = patient?.umur_tahun != null ? `${patient.umur_tahun} th` : '-';
  doc.text(ageStr, 40, finalY + 15);

  doc.text('Alamat', 20, finalY + 20);
  doc.text(':', 35, finalY + 20);
  // Simple word wrap for address
  const splitAddress = doc.splitTextToSize(patient?.alamat || '-', pageWidth / 2);
  doc.text(splitAddress, 40, finalY + 20);

  // Signature Block
  const sigY = finalY + 10;
  doc.text('Dokter Pemeriksa,', pageWidth - 20, sigY, { align: 'right' });
  
  // Empty space for signature
  
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${doctor?.full_name || '_______________________'} )`, pageWidth - 20, sigY + 25, { align: 'right' });

  // Output
  const patientNameSafe = (patient?.nama_lengkap || 'Pasien').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`Resep_${patientNameSafe}_${dateStr.replace(/ /g, '')}.pdf`);
};
