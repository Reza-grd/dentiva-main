import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { paymentService } from '../../services/paymentService';
import { visitService } from '../../services/visitService';
import { treatmentService } from '../../services/treatmentService';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Plus, Trash2, Printer, Search, Check, AlertCircle, ChevronLeft, MessageSquare } from 'lucide-react';
import { useToast } from '../common/ToastNotification';
import { parseDateLocal } from '../../utils/dateUtils';
import { supabase } from '../../services/supabase';
import { useClinicSettings } from '../../contexts/ClinicSettingsContext';

const PaymentForm = () => {
  const { visitId } = useParams();
  const { userProfile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingWA, setSendingWA] = useState(false);
  const [visit, setVisit] = useState(null);
  const [existingPayment, setExistingPayment] = useState(null);
  const [allTreatments, setAllTreatments] = useState([]);
  const [selectedTreatments, setSelectedTreatments] = useState([]);
  const [searchTreatment, setSearchTreatment] = useState('');
  const [showTreatmentSearch, setShowTreatmentSearch] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const navigate = useNavigate();

  const [paymentData, setPaymentData] = useState({
    biaya_tambahan: 0,
    keterangan_tambahan: '',
    diskon: 0,
    metode_pembayaran: 'cash',
    status_pembayaran: 'paid',
    jumlah_bayar: 0,
  });

  const { settings } = useClinicSettings();
  const [allObat, setAllObat] = useState([]);
  const [selectedObat, setSelectedObat] = useState([]);
  const [searchObat, setSearchObat] = useState('');
  const [showObatSearch, setShowObatSearch] = useState(false);

  useEffect(() => {
    loadData();
  }, [visitId]);

  const loadData = async () => {
    setLoading(true);

    const visitResult = await visitService.getVisitById(visitId);
    if (visitResult.success) {
      setVisit(visitResult.data);
      if (visitResult.data.treatments && visitResult.data.treatments.length > 0) {
        setSelectedTreatments(visitResult.data.treatments.map(vt => ({
          treatment_id: vt.treatment.id,
          nama_treatment: vt.treatment.nama_treatment,
          tooth_number: vt.tooth_number,
          quantity: vt.quantity,
          harga_satuan: vt.harga_satuan,
          subtotal: vt.subtotal
        })));
      }
    }

    const treatmentsResult = await treatmentService.getAllTreatments();
    if (treatmentsResult.success) {
      setAllTreatments(treatmentsResult.data || []);
    }

    // Load master obat dari master_bahan
    const { data: obatData, error: obatErr } = await supabase
      .from('master_bahan')
      .select('*')
      .eq('is_active', true)
      .eq('kategori', 'Obat')
      .order('nama_bahan', { ascending: true });
    
    if (!obatErr) {
      const mappedData = obatData.map(item => ({
        ...item,
        id: item.id,
        nama_obat: item.nama_bahan,
        satuan: item.satuan_dasar,
        harga_satuan: item.harga_rata2 || 0
      }));
      setAllObat(mappedData || []);
    }

    // Load existing visit obat
    const { data: existingObatData, error: existingObatErr } = await supabase
      .from('visit_obat')
      .select('*')
      .eq('visit_id', visitId);

    if (!existingObatErr && existingObatData && existingObatData.length > 0) {
      setSelectedObat(existingObatData.map(vo => ({
        obat_id: vo.obat_id,
        nama_obat: vo.nama_obat,
        qty: vo.qty,
        harga_satuan: vo.harga_satuan,
        subtotal: vo.subtotal,
        dosis: vo.dosis || '',
        frekuensi: vo.frekuensi || ''
      })));
    } else {
      setSelectedObat([]);
    }

    const paymentResult = await paymentService.getPaymentByVisitId(visitId);
    if (paymentResult.success && paymentResult.data) {
      setExistingPayment(paymentResult.data);
      setPaymentData({
        biaya_tambahan: paymentResult.data.biaya_tambahan || 0,
        keterangan_tambahan: paymentResult.data.keterangan_tambahan || '',
        diskon: paymentResult.data.diskon || 0,
        metode_pembayaran: paymentResult.data.metode_pembayaran || 'cash',
        status_pembayaran: paymentResult.data.status_pembayaran || 'paid',
        jumlah_bayar: paymentResult.data.jumlah_bayar || 0,
      });
    }

    setLoading(false);
  };

  const addTreatment = (treatment) => {
    const exists = selectedTreatments.find(t => t.treatment_id === treatment.id);
    if (!exists) {
      setSelectedTreatments([...selectedTreatments, {
        treatment_id: treatment.id,
        nama_treatment: treatment.nama_treatment,
        tooth_number: null,
        quantity: 1,
        harga_satuan: treatment.harga_dasar,
        subtotal: treatment.harga_dasar
      }]);
      if (formErrors.treatments) {
        setFormErrors(prev => ({ ...prev, treatments: null }));
      }
    } else {
      toast.warning('Treatment ini sudah ditambahkan');
    }
    setShowTreatmentSearch(false);
    setSearchTreatment('');
  };

  const updateTreatment = (index, field, value) => {
    const updated = [...selectedTreatments];
    updated[index][field] = value;
    if (field === 'quantity' || field === 'harga_satuan') {
      const qty = parseFloat(field === 'quantity' ? value : updated[index].quantity) || 0;
      const harga = parseFloat(field === 'harga_satuan' ? value : updated[index].harga_satuan) || 0;
      updated[index].subtotal = qty * harga;
    }
    setSelectedTreatments(updated);
  };

  const removeTreatment = (index) => {
    setSelectedTreatments(selectedTreatments.filter((_, i) => i !== index));
  };

  const addObat = (obat) => {
    const exists = selectedObat.find(o => o.obat_id === obat.id);
    if (!exists) {
      setSelectedObat([...selectedObat, {
        obat_id: obat.id,
        nama_obat: obat.nama_obat,
        qty: 1,
        harga_satuan: obat.harga_satuan,
        subtotal: obat.harga_satuan,
        dosis: obat.dosis_default || '',
        frekuensi: obat.frekuensi_default || ''
      }]);
    } else {
      toast.warning('Obat ini sudah ditambahkan');
    }
    setShowObatSearch(false);
    setSearchObat('');
  };

  const updateObat = (index, field, value) => {
    const updated = [...selectedObat];
    updated[index][field] = value;
    if (field === 'qty' || field === 'harga_satuan') {
      const qty = parseInt(field === 'qty' ? value : updated[index].qty) || 0;
      const harga = parseFloat(field === 'harga_satuan' ? value : updated[index].harga_satuan) || 0;
      updated[index].subtotal = qty * harga;
    }
    setSelectedObat(updated);
  };

  const removeObat = (index) => {
    setSelectedObat(selectedObat.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const totalTreatment = selectedTreatments.reduce((sum, t) => sum + (parseFloat(t.subtotal) || 0), 0);
    const totalObat = selectedObat.reduce((sum, o) => sum + (parseFloat(o.subtotal) || 0), 0);
    const biayaTambahan = parseFloat(paymentData.biaya_tambahan) || 0;
    const diskon = parseFloat(paymentData.diskon) || 0;
    const totalBayar = totalTreatment + totalObat + biayaTambahan - diskon;
    return { totalTreatment, totalObat, biayaTambahan, diskon, totalBayar };
  };

  const validateForm = () => {
    const errors = {};
    const totals = calculateTotals();

    if (selectedTreatments.length === 0) {
      errors.treatments = 'Minimal 1 treatment harus dipilih';
    }
    if (!paymentData.metode_pembayaran) {
      errors.metode_pembayaran = 'Metode pembayaran wajib dipilih';
    }
    if (!paymentData.status_pembayaran) {
      errors.status_pembayaran = 'Status pembayaran wajib dipilih';
    }
    if (parseFloat(paymentData.diskon) < 0) {
      errors.diskon = 'Diskon tidak boleh negatif';
    }
    if (parseFloat(paymentData.biaya_tambahan) < 0) {
      errors.biaya_tambahan = 'Biaya tambahan tidak boleh negatif';
    }
    if (totals.totalBayar < 0) {
      errors.total = 'Total bayar tidak boleh negatif. Periksa diskon.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePayment = async () => {
    if (!validateForm()) {
      toast.error('Mohon perbaiki error pada form sebelum menyimpan');
      return;
    }

    setSaving(true);
    try {
      const totals = calculateTotals();

      // 1. Save treatments
      const replaceResult = await visitService.replaceVisitTreatments(visitId, selectedTreatments);
      if (!replaceResult.success) throw new Error(replaceResult.error);

      // 2. Save visit obat (delete existing and insert new)
      const { error: delObatError } = await supabase
        .from('visit_obat')
        .delete()
        .eq('visit_id', visitId);

      if (delObatError) throw delObatError;

      if (selectedObat.length > 0) {
        const obatRows = selectedObat.map(o => ({
          visit_id: visitId,
          obat_id: o.obat_id,
          nama_obat: o.nama_obat,
          qty: o.qty,
          harga_satuan: o.harga_satuan,
          dosis: o.dosis,
          frekuensi: o.frekuensi
        }));

        const { error: insObatError } = await supabase
          .from('visit_obat')
          .insert(obatRows);

        if (insObatError) throw insObatError;
      }

      // 3. Prepare payment info
      const today = new Date().toISOString().split('T')[0];
      const jumlahBayar = parseFloat(paymentData.jumlah_bayar) || totals.totalBayar;
      const kembalian = paymentData.metode_pembayaran === 'cash'
        ? Math.max(0, jumlahBayar - totals.totalBayar)
        : 0;
        
      const paymentPayload = {
        visit_id: visitId,
        patient_id: visit.patient_id,
        total_treatment: totals.totalTreatment,
        biaya_tambahan: totals.biayaTambahan,
        keterangan_tambahan: paymentData.keterangan_tambahan,
        diskon: totals.diskon,
        total_bayar: totals.totalBayar,
        jumlah_bayar: jumlahBayar,
        kembalian: kembalian,
        metode_pembayaran: paymentData.metode_pembayaran,
        status_pembayaran: paymentData.status_pembayaran,
        tanggal_pembayaran: today,
      };

      let result;
      if (existingPayment) {
        result = await paymentService.updatePayment(existingPayment.id, paymentPayload);
      } else {
        result = await paymentService.createPayment(paymentPayload);
      }

      if (result.success) {
        if (paymentData.status_pembayaran === 'paid') {
          await visitService.updateVisit(visitId, { status: 'completed' });
        }
        
        // 4. Trigger WhatsApp Edge Function securely
        if (paymentData.status_pembayaran === 'paid') {
          try {
            let sentReceipt = false;
            
            const hasConsent = visit.patient?.wa_consent === true;
            const isConfirmationEnabled = settings?.wa_payment_confirmation_enabled !== 'false' && settings?.wa_payment_confirmation_enabled !== false;
            const isEducationEnabled = settings?.wa_post_treatment_education_enabled === 'true' || settings?.wa_post_treatment_education_enabled === true;

            if (!hasConsent) {
               toast.info('WA tidak terkirim: Pasien menolak/tidak memberikan izin notifikasi WA.');
               
               // Log skipped directly
               await supabase.from('notification_logs').insert([
                  { visit_id: visitId, patient_id: visit.patient_id, message_type: 'receipt', status: 'skipped_no_consent', gateway_response: 'Patient wa_consent is false' },
                  { visit_id: visitId, patient_id: visit.patient_id, message_type: 'education', status: 'skipped_no_consent', gateway_response: 'Patient wa_consent is false' }
               ]);
            } else {
               // Patient has consent
               if (!isConfirmationEnabled) {
                  await supabase.from('notification_logs').insert([{ visit_id: visitId, patient_id: visit.patient_id, message_type: 'receipt', status: 'skipped_disabled', gateway_response: 'wa_payment_confirmation_enabled is false' }]);
               } else {
                 await sendWhatsAppInvoice(result.data);
                 sentReceipt = true;
                 
                 const { error: updateErr } = await supabase
                   .from('payments')
                   .update({ wa_sent: true })
                   .eq('id', result.data.id);
                 if (updateErr) console.error('Failed to update wa_sent status:', updateErr);
                   
                 toast.success('Struk pembayaran telah dikirim ke WhatsApp pasien!');
               }

               if (!isEducationEnabled) {
                  await supabase.from('notification_logs').insert([{ visit_id: visitId, patient_id: visit.patient_id, message_type: 'education', status: 'skipped_disabled', gateway_response: 'wa_post_treatment_education_enabled is false' }]);
               } else {
                 if (sentReceipt) {
                   await new Promise(resolve => setTimeout(resolve, 2000));
                 }
                 await sendWhatsAppEducation(result.data);
                 toast.success('Edukasi perawatan pasca tindakan telah dikirim ke WhatsApp pasien!');
               }
            }
          } catch (waTriggerError) {
            console.error('WhatsApp trigger failed:', waTriggerError);
            toast.warning('Pembayaran tersimpan, namun gagal kirim WA: ' + waTriggerError.message);
          }
        } else {
          toast.success('Pembayaran berhasil disimpan!');
        }

        await loadData();
        setSaving(false);
        return; 
      } else {
        toast.error('Gagal menyimpan pembayaran: ' + result.error);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const sendWhatsAppInvoice = async (paymentObj) => {
    const activePayment = paymentObj || existingPayment;
    const rawPhone = visit.patient?.no_wa?.replace(/[^0-9]/g, '') || '';
    if (!rawPhone) {
      throw new Error('Pasien tidak memiliki nomor WhatsApp');
    }
    const targetPhone = rawPhone.startsWith('0')
      ? '62' + rawPhone.slice(1)
      : rawPhone;

    const clinicName = settings.clinic_name || 'Dentiva Dental Clinic';
    const doctorName = visit.dokter?.full_name || 'Dokter Jaga';
    const formatRp = (num) => 'Rp ' + (num || 0).toLocaleString('id-ID');

    let waMessage = `*🦷 ${clinicName.toUpperCase()}*\n`;
    waMessage += `==============================\n`;
    waMessage += `No. Invoice  : ${activePayment?.invoice_number || '-'}\n`;
    waMessage += `Pasien       : ${visit.patient?.nama_lengkap || '-'}\n`;
    waMessage += `No. RM       : ${visit.patient?.no_rm || '-'}\n`;
    waMessage += `Dokter       : ${doctorName}\n`;
    waMessage += `------------------------------\n`;
    waMessage += `*RINCIAN PERAWATAN:*\n`;

    selectedTreatments.forEach((vt) => {
      waMessage += `• ${vt.nama_treatment || 'Treatment'} — ${formatRp(vt.subtotal)}\n`;
    });

    if (selectedObat.length > 0) {
      waMessage += `\n*OBAT/RESEP:*\n`;
      selectedObat.forEach((vo) => {
        waMessage += `• ${vo.nama_obat || 'Obat'} x${vo.qty} — ${formatRp(vo.subtotal)}\n`;
      });
    }

    waMessage += `------------------------------\n`;
    waMessage += `Total        : ${formatRp(totals.totalBayar)}\n`;
    waMessage += `Metode Bayar : ${paymentData.metode_pembayaran?.toUpperCase() || 'CASH'}\n`;
    waMessage += `Status       : *LUNAS*\n`;
    waMessage += `==============================`;

    const { data: waData, error: waErr } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        visitId,
        patientId: visit.patient_id,
        target: targetPhone,
        message: waMessage,
        messageType: 'receipt'
      }
    });

    if (waErr) throw waErr;
    if (waData && waData.success === false) {
      throw new Error(waData.message || 'WhatsApp sending failed');
    }
    return waData;
  };

  const sendWhatsAppEducation = async (paymentObj) => {
    const rawPhone = visit.patient?.no_wa?.replace(/[^0-9]/g, '') || '';
    if (!rawPhone) {
      throw new Error('Pasien tidak memiliki nomor WhatsApp');
    }
    const targetPhone = rawPhone.startsWith('0')
      ? '62' + rawPhone.slice(1)
      : rawPhone;

    const treatmentNames = selectedTreatments.map(t => t.nama_treatment).filter(Boolean);
    if (treatmentNames.length === 0) return;

    // Helper to normalize strings
    const normalizeString = (str) => {
      if (!str) return '';
      return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    };

    // Fetch ALL templates for client-side matching
    const { data: eduData, error: eduError } = await supabase
      .from('treatment_education_templates')
      .select('*');

    if (eduError) throw eduError;

    const clinicName = settings.clinic_name || 'Dentiva Dental Clinic';
    const clinicPhone = settings.clinic_phone || '-';

    let educationMessage = `📋 *INFORMASI PERAWATAN*\n${clinicName}\n━━━━━━━━━━━━━━━━━━\n`;
    let hasAddedEducation = false;

    selectedTreatments.forEach((vt) => {
      const treatmentName = vt.nama_treatment || '';
      const normalizedTreatment = normalizeString(treatmentName);
      
      let matchedTemplate = null;
      let matchType = 'none';
      let matchScore = 0;
      let matchedKeyword = '';

      // Priority 1: Case-insensitive exact match
      const exactMatch = eduData.find(t => t.treatment_type.toLowerCase() === treatmentName.toLowerCase());
      
      if (exactMatch) {
        matchedTemplate = exactMatch;
        matchType = 'exact_case_insensitive';
      } else {
        // Priority 2: Normalized exact match
        const normMatch = eduData.find(t => normalizeString(t.treatment_type) === normalizedTreatment);
        if (normMatch) {
          matchedTemplate = normMatch;
          matchType = 'exact_normalized';
        } else {
          // Priority 3: Keyword scoring
          let bestScore = 0;
          let bestTemplate = null;
          let bestKeyword = '';

          eduData.forEach(t => {
            if (t.keywords && Array.isArray(t.keywords)) {
              let currentScore = 0;
              let currentBestKw = '';
              t.keywords.forEach(kw => {
                const normKw = normalizeString(kw);
                if (normKw && normalizedTreatment.includes(normKw)) {
                  currentScore += 1;
                  if (normKw.length > currentBestKw.length) {
                    currentBestKw = normKw;
                  }
                }
              });

              if (currentScore > 0) {
                if (currentScore > bestScore) {
                  bestScore = currentScore;
                  bestTemplate = t;
                  bestKeyword = currentBestKw;
                } else if (currentScore === bestScore) {
                  if (currentBestKw.length > bestKeyword.length) {
                    bestTemplate = t;
                    bestKeyword = currentBestKw;
                  }
                }
              }
            }
          });

          if (bestTemplate) {
            matchedTemplate = bestTemplate;
            matchType = 'keyword';
            matchScore = bestScore;
            matchedKeyword = bestKeyword;
          }
        }
      }

      if (matchedTemplate && (matchedTemplate.education_text || matchedTemplate.medication_instructions)) {
         hasAddedEducation = true;
         educationMessage += `*${treatmentName}:*\n`;
         if (matchedTemplate.education_text) {
           educationMessage += `${matchedTemplate.education_text}\n\n`;
         }
         if (matchedTemplate.medication_instructions && matchedTemplate.medication_instructions !== '[Diisi oleh dokter sesuai resep]') {
           educationMessage += `💊 *Instruksi Obat:*\n${matchedTemplate.medication_instructions}\n\n`;
         }
         educationMessage += `━━━━━━━━━━━━━━━━━━\n`;
      } else {
         console.warn(`[WA Edukasi] Template tidak ditemukan untuk treatment: ${treatmentName}`);
         supabase.from('notification_logs').insert([{ 
             visit_id: visitId, 
             patient_id: visit.patient_id, 
             message_type: 'education', 
             status: 'skipped_no_template', 
             gateway_response: JSON.stringify({
                 reason: 'No template matched',
                 treatment_name: treatmentName,
                 match_type: matchType,
                 matched_keyword: matchedKeyword,
                 match_score: matchScore
             }) 
         }]).then(() => {});
      }
    });

    if (!hasAddedEducation) {
      // Nothing to send
      return;
    }

    educationMessage += `Hubungi kami jika ada pertanyaan: ${clinicPhone}`;

    const { data: waData, error: waErr } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        visitId,
        patientId: visit.patient_id,
        target: targetPhone,
        message: educationMessage,
        messageType: 'education'
      }
    });

    if (waErr) throw waErr;
    if (waData && waData.success === false) {
      throw new Error(waData.message || 'WhatsApp sending failed');
    }
    return waData;
  };

  const handleResendWhatsApp = async () => {
    setSendingWA(true);
    try {
      await sendWhatsAppInvoice(existingPayment);
      
      // Update payment record's wa_sent status
      await supabase
        .from('payments')
        .update({ wa_sent: true })
        .eq('id', existingPayment.id);
        
      toast.success('Struk pembayaran berhasil dikirim ulang ke WhatsApp pasien!');
    } catch (err) {
      console.error('WhatsApp resend failed:', err);
      toast.error('Gagal mengirim ulang WA: ' + err.message);
    } finally {
      setSendingWA(false);
    }
  };

  const handlePrintInvoice = () => {
    const klinikInfo = {
      nama: settings.clinic_name || 'Dentiva Dental Clinic',
      alamat: 'Jl. Raya Tg. Morawa No. 123, Sumatera Utara',
      phone: settings.clinic_phone || '-',
      cabang: 'PUSAT'
    };

    const now = new Date();
    const waktuCetak = now.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const formatRp = (val) => {
      const num = parseFloat(val) || 0;
      return num.toLocaleString('id-ID');
    };

    const tindakanRows = selectedTreatments.map((t, i) => `
      <tr>
        <td colspan="2">${i + 1}. ${t.nama_treatment}${t.tooth_number ? ' [No Gigi: ' + t.tooth_number + ']' : ''}</td>
      </tr>
      <tr>
        <td style="padding-left:16px;">${formatRp(t.harga_satuan)} X ${t.quantity}</td>
        <td style="text-align:right;">-0</td>
      </tr>
      <tr>
        <td></td>
        <td style="text-align:right;">${formatRp(t.subtotal)}</td>
      </tr>
    `).join('');

    const obatRows = selectedObat.map((o, i) => `
      <tr>
        <td colspan="2">${i + 1}. ${o.nama_obat}</td>
      </tr>
      <tr>
        <td style="padding-left:16px;">${formatRp(o.harga_satuan)} X ${o.qty}</td>
        <td style="text-align:right;">${formatRp(o.subtotal)}</td>
      </tr>
    `).join('');

    const { totalTreatment, totalObat, biayaTambahan, diskon, totalBayar } = calculateTotals();
    const jumlahBayarPrint = parseFloat(paymentData.jumlah_bayar) || totalBayar;
    const kembalianPrint = paymentData.metode_pembayaran === 'cash' ? Math.max(0, jumlahBayarPrint - totalBayar) : 0;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Kwitansi - ${existingPayment?.invoice_number || '-'}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 10pt;
    width: 80mm;
    margin: 0 auto;
    padding: 4mm;
    color: #000;
  }
  .klinik-nama { font-size: 13pt; font-weight: bold; text-align: center; }
  .klinik-alamat { font-size: 8pt; text-align: center; color: #333; margin-bottom: 4px; }
  .top-info { display: flex; justify-content: space-between; font-size: 8pt; margin-bottom: 6px; }
  .separator { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  .separator-solid { border: none; border-top: 2px solid #000; margin: 6px 0; }
  .judul { text-align: center; font-size: 11pt; font-weight: bold; margin: 6px 0; }
  .info-row { display: flex; justify-content: space-between; font-size: 9pt; margin: 2px 0; }
  .info-label { color: #333; }
  table.tindakan { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 4px 0; }
  table.tindakan td { padding: 1px 0; }
  table.total { width: 100%; border-collapse: collapse; font-size: 9pt; }
  table.total td { padding: 2px 0; }
  .bold { font-weight: bold; }
  .total-row td { font-weight: bold; font-size: 10pt; border-top: 1px solid #000; padding-top: 3px; }
  .footer { text-align: center; font-size: 8pt; margin-top: 10px; color: #555; }
  @media print {
    @page { margin: 0; size: 80mm auto; }
    body { width: 72mm; }
  }
</style>
</head>
<body>
  <div class="top-info">
    <span></span>
    <span>${klinikInfo.cabang}</span>
  </div>
  <div class="klinik-nama">${klinikInfo.nama}</div>
  <div class="klinik-alamat">${klinikInfo.alamat}</div>
  <div class="top-info" style="margin-top:4px;">
    <span></span>
    <span>Phone : ${klinikInfo.phone}</span>
  </div>

  <hr class="separator-solid"/>
  <div class="judul">*** KWITANSI PEMBAYARAN ***</div>
  <hr class="separator-solid"/>

  <div class="info-row">
    <span class="info-label">Tgl : ${now.toLocaleDateString('id-ID', {day:'2-digit',month:'2-digit',year:'numeric'})} - No.Kwitansi : ${existingPayment?.invoice_number || '-'}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Waktu Cetak : ${waktuCetak}</span>
    <span>Kasir : ${userProfile?.full_name || 'Admin'}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Pelanggan : ${visit?.patient?.no_rm} - ${visit?.patient?.nama_lengkap}</span>
    <span>Jenis Pelanggan : ${visit?.patient?.jaminan_kesehatan || 'NON-MEMBER'}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Dokter : ${visit?.dokter?.full_name || '-'}</span>
    <span>Kunjungan Berikutnya : 00-00-0000 00:00:00</span>
  </div>

  <hr class="separator-solid"/>
  <table class="tindakan">
    <thead>
      <tr>
        <td class="bold">Tindakan</td>
        <td class="bold" style="text-align:right;">Harga Satuan&nbsp;&nbsp;Diskon&nbsp;&nbsp;Total</td>
      </tr>
    </thead>
    <tbody>
      ${tindakanRows}
    </tbody>
  </table>

  ${selectedObat.length > 0 ? `
    <hr class="separator"/>
    <table class="tindakan">
      <thead>
        <tr>
          <td class="bold">Resep Obat</td>
          <td class="bold" style="text-align:right;">Harga Satuan&nbsp;&nbsp;Qty&nbsp;&nbsp;Total</td>
        </tr>
      </thead>
      <tbody>
        ${obatRows}
      </tbody>
    </table>
  ` : ''}

  <hr class="separator"/>

  ${biayaTambahan > 0 ? `
  <div class="info-row">
    <span class="info-label">${paymentData.keterangan_tambahan || 'Biaya Tambahan'}</span>
    <span style="text-align:right;">${formatRp(biayaTambahan)}</span>
  </div>
  <hr class="separator"/>
  ` : ''}

  <table class="total">
    <tr>
      <td class="bold">Subtotal :</td>
      <td style="text-align:right;" class="bold">${formatRp(totalTreatment + totalObat + biayaTambahan)}</td>
    </tr>
    <tr>
      <td>Administrasi :</td>
      <td style="text-align:right;">0</td>
    </tr>
    <tr class="total-row">
      <td>Total Akhir :</td>
      <td style="text-align:right;">${formatRp(totalBayar)}</td>
    </tr>
    <tr>
      <td>Pembayaran > ${paymentData.metode_pembayaran === 'cash' ? 'tunai' : paymentData.metode_pembayaran}</td>
      <td style="text-align:right;">${formatRp(jumlahBayarPrint)}</td>
    </tr>
    <tr>
      <td class="bold">Kembalian :</td>
      <td style="text-align:right;" class="bold">${formatRp(kembalianPrint)}</td>
    </tr>
  </table>

  <hr class="separator-solid"/>
  <div style="font-size:9pt; margin: 4px 0;">Catatan Pemeriksaan :</div>
  <hr class="separator-solid"/>

  <div class="footer">Terima kasih atas kunjungan Anda</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=400,height=700');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const totals = calculateTotals();
  const filteredTreatments = allTreatments.filter(t =>
    t.nama_treatment?.toLowerCase().includes(searchTreatment.toLowerCase()) ||
    t.kode_treatment?.toLowerCase().includes(searchTreatment.toLowerCase())
  );

  const FieldError = ({ name }) =>
    formErrors[name] ? (
      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
        <AlertCircle size={12} /> {formErrors[name]}
      </p>
    ) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center p-8">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Kunjungan Tidak Ditemukan</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Data kunjungan tidak dapat dimuat.</p>
          <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-semibold transition-colors">Kembali</button>
        </div>
      </div>
    );
  }

  const isAdmin = userProfile?.role === 'admin';

  if (isAdmin) {
    const { totalTreatment, totalObat, biayaTambahan, diskon, totalBayar } = calculateTotals();
    const jumlahBayarPrint = parseFloat(paymentData.jumlah_bayar) || totalBayar;
    const kembalianPrint = paymentData.metode_pembayaran === 'cash' ? Math.max(0, jumlahBayarPrint - totalBayar) : 0;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Detail Transaksi</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mode Baca-Saja (Admin)</p>
            </div>
          </div>
          <button 
            onClick={handlePrintInvoice} 
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-secondary)] rounded-xl font-semibold transition-colors shadow-lg shadow-[var(--color-accent)]/20"
          >
            <Printer size={18} /> Cetak Kwitansi
          </button>
        </div>

        {/* Thermal Invoice Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl relative overflow-hidden bg-white dark:bg-[#141822]">
          {/* Aesthetic receipt top jagged border simulation */}
          <div className="absolute top-0 inset-x-0 h-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,var(--color-accent)_8px,var(--color-accent)_16px)] opacity-20" />
          
          <div className="text-center pb-6 border-b border-dashed border-gray-200 dark:border-gray-800 mt-2">
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-wide">Dentiva CLINIC</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">Cabang PUSAT</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">Invoice: {existingPayment?.invoice_number || 'BELUM DIBAYAR'}</p>
            <div className="mt-3 inline-block">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                paymentData.status_pembayaran === 'paid' 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}>
                {paymentData.status_pembayaran === 'paid' ? 'LUNAS' : paymentData.status_pembayaran === 'partial' ? 'SEBAGIAN' : 'PENDING'}
              </span>
            </div>
          </div>

          {/* Receipt Info Section */}
          <div className="py-6 border-b border-dashed border-gray-200 dark:border-gray-800 font-mono text-xs space-y-2 text-gray-600 dark:text-gray-300">
            <div className="flex justify-between">
              <span>No. RM:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{visit?.patient?.no_rm}</span>
            </div>
            <div className="flex justify-between">
              <span>Nama Pasien:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{visit?.patient?.nama_lengkap}</span>
            </div>
            <div className="flex justify-between">
              <span>Dokter Gigi:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{visit?.dokter?.full_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Tgl Kunjungan:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {visit?.tanggal_kunjungan
                  ? parseDateLocal(visit.tanggal_kunjungan).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Metode Pembayaran:</span>
              <span className="font-semibold uppercase text-gray-900 dark:text-white">{paymentData.metode_pembayaran || '-'}</span>
            </div>
          </div>

          {/* Items Section */}
          <div className="py-6 border-b border-dashed border-gray-200 dark:border-gray-800">
            <h4 className="text-xs font-mono font-bold text-gray-400 mb-3 uppercase tracking-wider">Tindakan / Perawatan</h4>
            <div className="space-y-4">
              {selectedTreatments.map((t, idx) => (
                <div key={idx} className="font-mono text-xs">
                  <div className="flex justify-between text-gray-900 dark:text-white font-medium">
                    <span>{idx + 1}. {t.nama_treatment}</span>
                    <span>{formatCurrency(t.subtotal)}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 pl-4 mt-0.5 font-mono">
                    {t.quantity} x {formatCurrency(t.harga_satuan)}
                    {t.tooth_number ? ` (Gigi: ${t.tooth_number})` : ''}
                  </div>
                </div>
              ))}
            </div>
            
            {selectedObat.length > 0 && (
              <>
                <h4 className="text-xs font-mono font-bold text-gray-400 mt-6 mb-3 uppercase tracking-wider">Resep Obat</h4>
                <div className="space-y-4">
                  {selectedObat.map((o, idx) => (
                    <div key={idx} className="font-mono text-xs">
                      <div className="flex justify-between text-gray-900 dark:text-white font-medium">
                        <span>{idx + 1}. {o.nama_obat}</span>
                        <span>{formatCurrency(o.subtotal)}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 pl-4 mt-0.5 font-mono">
                        {o.qty} x {formatCurrency(o.harga_satuan)} ${o.dosis ? `[${o.dosis}, ${o.frekuensi}]` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Financial Breakdown */}
          <div className="pt-6 font-mono text-xs space-y-2.5">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Total Perawatan:</span>
              <span>{formatCurrency(totalTreatment)}</span>
            </div>
            
            {totalObat > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Total Obat:</span>
                <span>{formatCurrency(totalObat)}</span>
              </div>
            )}
            
            {biayaTambahan > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>{paymentData.keterangan_tambahan || 'Biaya Tambahan'}:</span>
                <span>{formatCurrency(biayaTambahan)}</span>
              </div>
            )}

            {diskon > 0 && (
              <div className="flex justify-between text-rose-500">
                <span>Diskon / Potongan:</span>
                <span>-{formatCurrency(diskon)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-3 border-t border-gray-100 dark:border-gray-800">
              <span>TOTAL BAYAR:</span>
              <span>{formatCurrency(totalBayar)}</span>
            </div>

            <div className="flex justify-between text-gray-600 dark:text-gray-300 pt-2">
              <span>Jumlah Diterima:</span>
              <span>{formatCurrency(jumlahBayarPrint)}</span>
            </div>

            <div className="flex justify-between text-gray-900 dark:text-white font-bold">
              <span>Kembalian:</span>
              <span>{formatCurrency(kembalianPrint)}</span>
            </div>
          </div>

          {/* Aesthetic receipt bottom jagged border simulation */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,var(--color-accent)_8px,var(--color-accent)_16px)] opacity-20" />
        </div>
      </div>
    );
  }

  const isLocked = existingPayment?.status_pembayaran === 'paid';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
              <DollarSign size={24} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Form Pembayaran</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {existingPayment ? `Invoice #${existingPayment.invoice_number}` : 'Buat transaksi baru'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          {existingPayment && (
            <button onClick={handlePrintInvoice} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors shadow-sm w-full sm:w-auto">
              <Printer size={18} /> Cetak Invoice
            </button>
          )}
          {existingPayment && paymentData.status_pembayaran === 'paid' && (
            <button 
              onClick={handleResendWhatsApp} 
              disabled={sendingWA} 
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-semibold transition-colors shadow-sm w-full sm:w-auto disabled:opacity-50"
            >
              <MessageSquare size={18} /> {sendingWA ? 'Mengirim...' : 'Kirim Ulang Invoice WA'}
            </button>
          )}
        </div>
      </div>

      {isLocked && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3 no-print">
          <AlertCircle className="text-amber-600 dark:text-amber-400" size={24} />
          <div>
            <h3 className="text-amber-800 dark:text-amber-300 font-bold">Pembayaran Telah Dikunci</h3>
            <p className="text-amber-700 dark:text-amber-400 text-sm">Pembayaran ini sudah lunas. Form tidak dapat diubah lagi.</p>
          </div>
        </div>
      )}

      {/* Patient Info */}
      <div className="glass-panel p-6">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Informasi Pasien</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-1">No. RM</span>
            <p className="font-semibold text-gray-900 dark:text-white">{visit?.patient?.no_rm}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-1">Nama</span>
            <p className="font-semibold text-gray-900 dark:text-white">{visit?.patient?.nama_lengkap}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-1">Tanggal Kunjungan</span>
            <p className="font-semibold text-gray-900 dark:text-white">
              {visit?.tanggal_kunjungan
                ? parseDateLocal(visit.tanggal_kunjungan).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
                : '-'}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-1">Jaminan</span>
            <p className="font-semibold text-gray-900 dark:text-white">{visit?.patient?.jaminan_kesehatan || 'Umum'}</p>
          </div>
        </div>
      </div>

      {/* Treatment List */}
      <div className="glass-panel p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Daftar Perawatan</h3>
          {!isLocked && (
            <button
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 rounded-xl font-semibold transition-colors text-sm w-full sm:w-auto no-print"
              onClick={() => setShowTreatmentSearch(!showTreatmentSearch)}
            >
              <Plus size={16} /> Tambah Perawatan
            </button>
          )}
        </div>

        {formErrors.treatments && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 rounded-r-xl flex items-center gap-2 text-red-700 dark:text-red-400 text-sm no-print">
            <AlertCircle size={16} /> {formErrors.treatments}
          </div>
        )}

        {/* Search Dropdown */}
        {showTreatmentSearch && (
          <div className="mb-6 p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 no-print">
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Cari treatment..."
                value={searchTreatment}
                onChange={(e) => setSearchTreatment(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-2">
              {filteredTreatments.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">Tidak ada treatment ditemukan</p>
              ) : filteredTreatments.map(treatment => (
                <button
                  key={treatment.id}
                  className="w-full text-left p-3 bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl border border-gray-100 dark:border-gray-800 transition-colors shadow-sm"
                  onClick={() => addTreatment(treatment)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{treatment.nama_treatment}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{treatment.kode_treatment}</p>
                    </div>
                    <p className="font-semibold text-[var(--color-accent)] text-sm">
                      {formatCurrency(treatment.harga_dasar)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTreatments.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Belum ada perawatan dipilih</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Perawatan</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Gigi</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Harga</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Subtotal</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {selectedTreatments.map((treatment, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{treatment.nama_treatment}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        max="48"
                        value={treatment.tooth_number || ''}
                        onChange={(e) => updateTreatment(index, 'tooth_number', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="No"
                        className="glass-input w-16 px-2 py-1.5 rounded-lg text-sm text-center no-print"
                      />
                      <span className="hidden print:inline">{treatment.tooth_number || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={treatment.quantity}
                        onChange={(e) => updateTreatment(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="glass-input w-16 px-2 py-1.5 rounded-lg text-sm text-center no-print"
                      />
                      <span className="hidden print:inline">{treatment.quantity}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          value={treatment.harga_satuan}
                          onChange={(e) => updateTreatment(index, 'harga_satuan', parseFloat(e.target.value) || 0)}
                          disabled={isLocked}
                          className="glass-input w-28 px-2 py-1.5 rounded-lg text-sm text-right no-print disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="hidden print:inline">{formatCurrency(treatment.harga_satuan)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(treatment.subtotal)}
                    </td>
                    <td className="px-4 py-3 text-center no-print">
                      {!isLocked && (
                        <button
                          onClick={() => removeTreatment(index)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors inline-flex"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Obat/Prescription List */}
      <div className="glass-panel p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Resep Obat / Farmasi</h3>
          {!isLocked && (
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 rounded-xl font-semibold transition-colors text-sm w-full sm:w-auto no-print"
              onClick={() => setShowObatSearch(!showObatSearch)}
            >
              <Plus size={16} /> Tambah Obat
            </button>
          )}
        </div>

        {/* Search Obat Dropdown */}
        {showObatSearch && (
          <div className="mb-6 p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 no-print">
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Cari obat..."
                value={searchObat}
                onChange={(e) => setSearchObat(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-2">
              {allObat.filter(o => o.nama_obat?.toLowerCase().includes(searchObat.toLowerCase())).length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">Tidak ada obat ditemukan</p>
              ) : allObat.filter(o => o.nama_obat?.toLowerCase().includes(searchObat.toLowerCase())).map(obat => (
                <button
                  key={obat.id}
                  type="button"
                  className="w-full text-left p-3 bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl border border-gray-100 dark:border-gray-800 transition-colors shadow-sm"
                  onClick={() => addObat(obat)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{obat.nama_obat}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Satuan: {obat.satuan} {obat.dosis_default ? `(${obat.dosis_default})` : ''}</p>
                    </div>
                    <p className="font-semibold text-[var(--color-accent)] text-sm">
                      {formatCurrency(obat.harga_satuan)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedObat.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Belum ada obat yang diresepkan</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Nama Obat</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Dosis</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Frekuensi</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Harga</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs">Subtotal</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 uppercase text-xs no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {selectedObat.map((obat, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{obat.nama_obat}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={obat.qty}
                        disabled={isLocked}
                        onChange={(e) => updateObat(index, 'qty', parseInt(e.target.value) || 1)}
                        className="glass-input w-16 px-2 py-1.5 rounded-lg text-sm text-center no-print"
                      />
                      <span className="hidden print:inline">{obat.qty}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={obat.dosis}
                        disabled={isLocked}
                        onChange={(e) => updateObat(index, 'dosis', e.target.value)}
                        placeholder="1 tablet"
                        className="glass-input w-28 px-2 py-1.5 rounded-lg text-sm no-print"
                      />
                      <span className="hidden print:inline">{obat.dosis || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={obat.frekuensi}
                        disabled={isLocked}
                        onChange={(e) => updateObat(index, 'frekuensi', e.target.value)}
                        placeholder="3x sehari"
                        className="glass-input w-36 px-2 py-1.5 rounded-lg text-sm no-print"
                      />
                      <span className="hidden print:inline">{obat.frekuensi || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        value={obat.harga_satuan}
                        disabled={isLocked}
                        onChange={(e) => updateObat(index, 'harga_satuan', parseFloat(e.target.value) || 0)}
                        className="glass-input w-24 px-2 py-1.5 rounded-lg text-sm text-right no-print disabled:opacity-50"
                      />
                      <span className="hidden print:inline">{formatCurrency(obat.harga_satuan)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(obat.subtotal)}
                    </td>
                    <td className="px-4 py-3 text-center no-print">
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => removeObat(index)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors inline-flex"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        {/* Extra Charges */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">Biaya & Diskon</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Biaya Tambahan (Rp)</label>
              <input
                type="number"
                min="0"
                value={paymentData.biaya_tambahan}
                onChange={(e) => {
                  setPaymentData({...paymentData, biaya_tambahan: parseFloat(e.target.value) || 0});
                  if (formErrors.biaya_tambahan) setFormErrors(p => ({...p, biaya_tambahan: null}));
                }}
                disabled={isLocked}
                className={`glass-input w-full px-4 py-2.5 rounded-xl ${formErrors.biaya_tambahan ? 'border-red-500 ring-1 ring-red-500' : ''} disabled:opacity-50`}
              />
              <FieldError name="biaya_tambahan" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Keterangan Biaya Tambahan</label>
              <input
                type="text"
                value={paymentData.keterangan_tambahan}
                onChange={(e) => setPaymentData({...paymentData, keterangan_tambahan: e.target.value})}
                placeholder="Opsional"
                disabled={isLocked}
                className="glass-input w-full px-4 py-2.5 rounded-xl disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Diskon (Rp)</label>
              <input
                type="number"
                min="0"
                value={paymentData.diskon}
                onChange={(e) => {
                  setPaymentData({...paymentData, diskon: parseFloat(e.target.value) || 0});
                  if (formErrors.diskon) setFormErrors(p => ({...p, diskon: null}));
                }}
                disabled={isLocked}
                className={`glass-input w-full px-4 py-2.5 rounded-xl ${formErrors.diskon ? 'border-red-500 ring-1 ring-red-500' : ''} disabled:opacity-50`}
              />
              <FieldError name="diskon" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Uang Diterima (Rp) <span className="text-gray-400 text-xs font-normal">— untuk hitung kembalian</span></label>
              <input
                type="number"
                min="0"
                value={paymentData.jumlah_bayar || ''}
                placeholder={String(totals.totalBayar)}
                onChange={(e) => setPaymentData({...paymentData, jumlah_bayar: parseFloat(e.target.value) || 0})}
                disabled={isLocked}
                className="glass-input w-full px-4 py-2.5 rounded-xl disabled:opacity-50"
              />
              {paymentData.metode_pembayaran === 'cash' && paymentData.jumlah_bayar > 0 && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2 font-semibold bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg inline-block">
                  Kembalian: {formatCurrency(Math.max(0, paymentData.jumlah_bayar - totals.totalBayar))}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Method & Summary */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">Metode & Status Pembayaran</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Metode Pembayaran <span className="text-red-500">*</span></label>
              <select
                value={paymentData.metode_pembayaran}
                onChange={(e) => {
                  setPaymentData({...paymentData, metode_pembayaran: e.target.value});
                  if (formErrors.metode_pembayaran) setFormErrors(p => ({...p, metode_pembayaran: null}));
                }}
                disabled={isLocked}
                className={`glass-input w-full px-4 py-2.5 rounded-xl appearance-none ${formErrors.metode_pembayaran ? 'border-red-500 ring-1 ring-red-500' : ''} disabled:opacity-50`}
              >
                <option value="">-- Pilih Metode --</option>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer Bank</option>
                <option value="debit">Debit Card</option>
                <option value="credit">Credit Card</option>
                <option value="insurance">Asuransi</option>
              </select>
              <FieldError name="metode_pembayaran" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status Pembayaran <span className="text-red-500">*</span></label>
              <select
                value={paymentData.status_pembayaran}
                onChange={(e) => {
                  setPaymentData({...paymentData, status_pembayaran: e.target.value});
                  if (formErrors.status_pembayaran) setFormErrors(p => ({...p, status_pembayaran: null}));
                }}
                disabled={isLocked}
                className={`glass-input w-full px-4 py-2.5 rounded-xl appearance-none ${formErrors.status_pembayaran ? 'border-red-500 ring-1 ring-red-500' : ''} disabled:opacity-50`}
              >
                <option value="">-- Pilih Status --</option>
                <option value="paid">Lunas</option>
                <option value="partial">Bayar Sebagian</option>
                <option value="pending">Pending</option>
              </select>
              <FieldError name="status_pembayaran" />
            </div>

            {/* Total Summary */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-3 mt-8">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Perawatan:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.totalTreatment)}</span>
              </div>
              {totals.totalObat > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Resep Obat:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.totalObat)}</span>
                </div>
              )}
              {totals.biayaTambahan > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Biaya Tambahan:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.biayaTambahan)}</span>
                </div>
              )}
              {totals.diskon > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Diskon:</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">-{formatCurrency(totals.diskon)}</span>
                </div>
              )}
              <div className={`flex justify-between text-xl font-bold pt-4 mt-2 border-t border-gray-100 dark:border-gray-800 ${totals.totalBayar < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                <span>TOTAL BAYAR:</span>
                <span>{formatCurrency(totals.totalBayar)}</span>
              </div>
              {formErrors.total && <FieldError name="total" />}
            </div>

            {/* Submit Button */}
            {!isLocked && (
              <div className="pt-6">
                <button
                  onClick={handleSavePayment}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white font-bold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Menyimpan...</>
                  ) : (
                    <><Check size={20} /> Simpan Pembayaran</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
