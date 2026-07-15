import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const generateConsentPdf = (consent, clinic) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(clinic?.name || 'Klinik Gigi', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(clinic?.address || '', 105, 26, { align: 'center' });
  doc.text(clinic?.city || '', 105, 31, { align: 'center' });
  
  doc.line(20, 35, 190, 35);
  
  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(consent.title.toUpperCase(), 105, 45, { align: 'center' });
  
  // Content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const textY = 60;
  doc.text(`Yang bertanda tangan di bawah ini, menyatakan persetujuan terhadap tindakan medis:`, 20, textY);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Nama Pasien`, 20, textY + 10);
  doc.text(`: ${consent.patient_name}`, 60, textY + 10);
  
  doc.text(`Jenis Tindakan`, 20, textY + 17);
  doc.text(`: ${consent.treatment_type}`, 60, textY + 17);
  
  doc.text(`Dokter Penanggung Jawab`, 20, textY + 24);
  doc.text(`: ${consent.doctor_name}`, 60, textY + 24);
  
  doc.setFont('helvetica', 'normal');
  const statement = `Dengan ini saya menyatakan bahwa saya telah menerima penjelasan lengkap mengenai tindakan medis tersebut di atas, termasuk risiko, komplikasi yang mungkin terjadi, serta alternatif tindakan lainnya. Saya menyetujui dilakukannya tindakan medis tersebut secara sadar dan tanpa paksaan dari pihak mana pun.`;
  
  const splitText = doc.splitTextToSize(statement, 170);
  doc.text(splitText, 20, textY + 38);
  
  // Date and Signatures
  const dateStr = format(new Date(consent.created_at), 'dd MMMM yyyy', { locale: id });
  const signY = textY + 70;
  
  doc.text(`${clinic?.city || 'Jakarta'}, ${dateStr}`, 130, signY);
  
  doc.text(`Dokter Pemeriksa,`, 30, signY + 10);
  doc.text(`Pasien,`, 140, signY + 10);
  
  // Add patient signature image
  if (consent.signature_data) {
    try {
      doc.addImage(consent.signature_data, 'PNG', 130, signY + 15, 40, 20);
    } catch (e) {
      console.error('Failed to add signature image', e);
    }
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text(`(${consent.doctor_name})`, 30, signY + 45);
  doc.text(`(${consent.patient_name})`, 140, signY + 45);

  // Output
  doc.save(`Informed_Consent_${consent.patient_name}_${format(new Date(consent.created_at), 'yyyyMMdd')}.pdf`);
};
