import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../common/ToastNotification';
import { useAuth } from '../../contexts/AuthContext';
import { patientService } from '../../services/patientService';
import { visitService } from '../../services/visitService';
import { Plus, Trash2, Save, Mic, MicOff, Info, ArrowLeft, Shield, User, Calendar, Phone, Printer, FileText, AlertCircle, Stethoscope } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { formatDoctorName } from '../../utils/dateUtils';
import PatientAvatar from '../common/PatientAvatar';

// Import komponen Odontogram v5.0 dan datanya
import Odontogram from './odontogram/Odontogram';
import { CODE_CATEGORIES } from './odontogram/OdontogramData';
import PatientMediaUpload from './PatientMediaUpload';
import DiagnosisTreatment from './DiagnosisTreatment';
import ReferralLetterModal from './ReferralLetterModal';

const MedicalRecordForm = () => {
  const { patientId } = useParams();
  const { userProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, data: null });
  const [showReferralModal, setShowReferralModal] = useState(false);

  const canAccess = userProfile && ['dokter', 'admin'].includes(userProfile.role);

  const [patientData, setPatientData] = useState({});
  const [clinicalData, setClinicalData] = useState({
    oklusi: '', torus_palatinus: '', torus_mandibularis: '',
    palatum: '', supernumery_teeth: '', diastema: '',
    gigi_anomali: '', lain_lain: '',
    chief_complaint: '', additional_complaint: '', other_notes: '',
    treatment_history_status: 'belum_dirawat', treatment_history_details: '',
    bad_habits: [], social_history: [], extra_oral_facial: '', remarks: '',
    tanggal_pencatatan: new Date().toISOString().split('T')[0]
  });
  const [medicalHistory, setMedicalHistory] = useState({
    hipertensi: false, jantung: false, asma: false, diabetes: false, alergi: false, 
    stroke: false, ginjal: false, hepatitis: false, tuberkulosis: false, 
    hiv: false, thalassemia: false, hemofilia: false, osteoporosis: false, tiroid: false,
    epilepsi: false,
    alergi_detail: '', konsumsi_obat: '', riwayat_lain: ''
  });
  const [periodontalData, setPeriodontalData] = useState({
    ohiS: '', calculus: '', plakIndeks: '', bop: '', mobility: '',
    furkasi: '', pocketDepth: '', resesiGingiva: '', kondisiGingiva: '', kondisiMukosa: ''
  });
  const [ekstraOralData, setEkstraOralData] = useState({
    wajah: '', bibir: '', bibir_keterangan: '', pipi: '',
    kgb_kanan: 'tidak_teraba', kgb_kanan_sakit: '',
    kgb_kiri: 'tidak_teraba', kgb_kiri_sakit: '',
    kelenjar_lainnya: '', temporomandibular: '', ototpengunyahan: '', keterangan: '',
    riwayat_perawatan: 'belum_dirawat', riwayat_perawatan_keterangan: '',
    kebiasaan_buruk: '', riwayat_sosial: ''
  });
  const [intraOralData, setIntraOralData] = useState({
    debri: 'tidak_ada', debri_regio: '', plak: 'tidak_ada', plak_regio: '',
    kalkulus: 'tidak_ada', kalkulus_regio: '', perdarahan_papila: 'tidak_ada', perdarahan_papila_regio: '',
    risiko_karies: 'tidak_ada', ph_plak: '', ph_plak_tinggi: false, ph_saliva: '', ph_saliva_tinggi: false,
    gingiva: 'sehat', gingiva_keterangan: '', mukosa: 'sehat', mukosa_keterangan: '',
    palatum: 'sehat', palatum_keterangan: '', lidah: 'sehat', lidah_keterangan: '',
    dasar_mulut: 'sehat', dasar_mulut_keterangan: '', hubungan_rahang: 'ortognati',
    kelainan_gigi_geligi: 'tidak_ada', kelainan_gigi_geligi_keterangan: '', lain_lain: ''
  });
  const [visits, setVisits] = useState([]);

  // Odontogram States
  const [toothConditions, setToothConditions] = useState({});
  const [odontogramMeta, setOdontogramMeta] = useState({ relasi_molar_kanan: '', relasi_molar_kiri: '', catatan_odontogram: '' });
  const [isTreatmentLocked, setIsTreatmentLocked] = useState(false);

  // Local state for OHIS subscores
  const [ohisSubscores, setOhisSubscores] = useState({
    debris: { '16': 0, '11': 0, '26': 0, '46': 0, '31': 0, '36': 0 },
    calculus: { '16': 0, '11': 0, '26': 0, '46': 0, '31': 0, '36': 0 }
  });

  useEffect(() => {
    if (periodontalData && periodontalData.calculus) {
      try {
        const parsed = JSON.parse(periodontalData.calculus);
        if (parsed.debris && parsed.calculus) {
          setOhisSubscores(parsed);
        }
      } catch (e) {
        // legacy non-JSON calculus data
      }
    }
  }, [periodontalData.calculus]);

  const getOhisCalculation = (subscores) => {
    const debrisKeys = Object.keys(subscores.debris);
    const calculusKeys = Object.keys(subscores.calculus);

    const debrisSum = debrisKeys.reduce((sum, key) => sum + (parseFloat(subscores.debris[key]) || 0), 0);
    const calculusSum = calculusKeys.reduce((sum, key) => sum + (parseFloat(subscores.calculus[key]) || 0), 0);

    const di = parseFloat((debrisSum / 6).toFixed(2));
    const ci = parseFloat((calculusSum / 6).toFixed(2));
    const ohis = parseFloat((di + ci).toFixed(2));

    let category = 'Baik';
    if (ohis > 1.2 && ohis <= 3.0) category = 'Sedang';
    else if (ohis > 3.0) category = 'Buruk';

    return { di, ci, ohis, category };
  };

  const handleOhisChange = (type, tooth, value) => {
    const val = parseInt(value) || 0;
    const updated = {
      ...ohisSubscores,
      [type]: {
        ...ohisSubscores[type],
        [tooth]: val
      }
    };
    setOhisSubscores(updated);

    const { di, ci, ohis, category } = getOhisCalculation(updated);
    
    setPeriodontalData(prev => ({
      ...prev,
      calculus: JSON.stringify(updated),
      ohiS: `${ohis} (${category})`
    }));
  };

  // Voice Recognition States
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('Tekan mikrofon untuk mulai');
  const recognitionRef = useRef(null);
  const [showLegend, setShowLegend] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Active Tab state for Right Panel hybrid workflow
  
  // Autosave Draft States
  const [isDraftChecked, setIsDraftChecked] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState(null);

  const initRef = useRef(null);

  useEffect(() => {
    if (!canAccess) {
      toast.error('Anda tidak memiliki akses ke halaman ini.');
      setTimeout(() => navigate('/'), 2000);
      return;
    }
    if (initRef.current === patientId) return;
    initRef.current = patientId;

    loadPatientData();
    initializeVoiceRecognition();
  }, [patientId, canAccess]);

  const loadPatientData = async () => {
    setLoading(true);
    setIsDraftChecked(false);
    const { success, data, error } = await patientService.getPatientWithDetails(patientId);
    if (success) {
      setPatient(data.patient); 
      setPatientData(data.patient);
      setMedicalHistory(data.medicalHistory || {});
      setClinicalData(data.clinicalData || {});
      setPeriodontalData(data.periodontalData || {});
      setEkstraOralData(data.ekstraOralData || {
        wajah: '', bibir: '', bibir_keterangan: '', pipi: '',
        kgb_kanan: 'tidak_teraba', kgb_kanan_sakit: '',
        kgb_kiri: 'tidak_teraba', kgb_kiri_sakit: '',
        kelenjar_lainnya: '', temporomandibular: '', ototpengunyahan: '', keterangan: '',
        riwayat_perawatan: 'belum_dirawat', riwayat_perawatan_keterangan: '',
        kebiasaan_buruk: '', riwayat_sosial: ''
      });
      setIntraOralData(data.intraOralData || {
        debri: 'tidak_ada', debri_regio: '', plak: 'tidak_ada', plak_regio: '',
        kalkulus: 'tidak_ada', kalkulus_regio: '', perdarahan_papila: 'tidak_ada', perdarahan_papila_regio: '',
        risiko_karies: 'tidak_ada', ph_plak: '', ph_plak_tinggi: false, ph_saliva: '', ph_saliva_tinggi: false,
        gingiva: 'sehat', gingiva_keterangan: '', mukosa: 'sehat', mukosa_keterangan: '',
        palatum: 'sehat', palatum_keterangan: '', lidah: 'sehat', lidah_keterangan: '',
        dasar_mulut: 'sehat', dasar_mulut_keterangan: '', hubungan_rahang: 'ortognati',
        kelainan_gigi_geligi: 'tidak_ada', kelainan_gigi_geligi_keterangan: '', lain_lain: ''
      });
      setOdontogramMeta(data.odontogramMeta || { relasi_molar_kanan: '', relasi_molar_kiri: '', catatan_odontogram: '' });
      setToothConditions(data.toothConditions || {});
      setVisits(data.visits || []);

      // Check payment status to lock treatment list
      const latestVisit = data.visits && data.visits.length > 0 ? data.visits[0] : null;
      let paymentLocked = false;
      if (latestVisit) {
        const { data: paymentInfo, error: payError } = await supabase
          .from('payments')
          .select('status_pembayaran')
          .eq('visit_id', latestVisit.id)
          .maybeSingle();
        if (!payError && paymentInfo && (paymentInfo.status_pembayaran === 'pending' || paymentInfo.status_pembayaran === 'paid')) {
          paymentLocked = true;
        }
      }
      setIsTreatmentLocked(paymentLocked);

      // Check if localStorage has draft
      const draftKey = `Dentiva_draft_rm_${patientId}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setDraftToRestore(parsed);
          setShowDraftPrompt(true);
        } catch (e) {
          console.error('Failed to parse draft:', e);
          setIsDraftChecked(true);
        }
      } else {
        setIsDraftChecked(true);
      }
    } else {
      console.error('Supabase Error in UI:', error);
      toast.error('Gagal memuat data pasien');
    }
    setLoading(false);
  };

  // Debounced Autosave Effect
  useEffect(() => {
    if (loading || saving || !patient || !isDraftChecked) return;

    const timer = setTimeout(() => {
      const draft = {
        medicalHistory,
        clinicalData,
        toothConditions,
        periodontalData,
        ekstraOralData,
        intraOralData,
        odontogramMeta,
        visits,
        timestamp: Date.now()
      };
      localStorage.setItem(`Dentiva_draft_rm_${patientId}`, JSON.stringify(draft));
      console.log('Draft autosaved to localStorage for patient:', patientId);
    }, 2000);

    return () => clearTimeout(timer);
  }, [medicalHistory, clinicalData, toothConditions, periodontalData, ekstraOralData, intraOralData, odontogramMeta, visits, loading, saving, patient, patientId, isDraftChecked]);

  const handleRestoreDraft = () => {
    if (draftToRestore) {
      if (draftToRestore.medicalHistory) setMedicalHistory(draftToRestore.medicalHistory);
      if (draftToRestore.clinicalData) setClinicalData(draftToRestore.clinicalData);
      if (draftToRestore.toothConditions) setToothConditions(draftToRestore.toothConditions);
      if (draftToRestore.periodontalData) setPeriodontalData(draftToRestore.periodontalData);
      if (draftToRestore.ekstraOralData) setEkstraOralData(draftToRestore.ekstraOralData);
      if (draftToRestore.intraOralData) setIntraOralData(draftToRestore.intraOralData);
      if (draftToRestore.odontogramMeta) setOdontogramMeta(draftToRestore.odontogramMeta);
      if (draftToRestore.visits) setVisits(draftToRestore.visits);
      toast.success('Draf rekam medis berhasil dipulihkan!');
    }
    setShowDraftPrompt(false);
    setIsDraftChecked(true);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(`Dentiva_draft_rm_${patientId}`);
    setShowDraftPrompt(false);
    setIsDraftChecked(true);
    toast.info('Draf diabaikan');
  };

  const initializeVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'id-ID';
      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) setTranscript(prev => prev + text + ' ');
          else interim = text;
        }
        if (interim) setVoiceStatus('Mendengarkan: ' + interim);
      };
      recognition.onerror = (event) => { setVoiceStatus('Error: ' + event.error); setIsListening(false); };
      recognitionRef.current = recognition;
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true); setTranscript(''); setVoiceStatus('Mendengarkan...'); recognitionRef.current.start();
    }
  };
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false); recognitionRef.current.stop(); setVoiceStatus('Tekan mikrofon untuk mulai');
    }
  };

  const clearTooth = (toothNumber) => setConfirmDialog({ isOpen: true, action: 'clearTooth', data: toothNumber });
  
  const handleConfirmClearTooth = () => {
    setToothConditions(prev => { const updated = { ...prev }; delete updated[confirmDialog.data]; return updated; });
    toast.success('Kondisi gigi dihapus');
  };

  const addVisit = () => {
    setVisits([...visits, { id: Date.now(), _isNew: true, tanggal_kunjungan: new Date().toISOString().split('T')[0], keluhan: '', pemeriksaan_fisik: '', diagnosa: '', terapi: '' }]);
    toast.info('Kunjungan ditambahkan');
  };
  const updateVisit = (id, field, value) => setVisits(visits.map(v => v.id === id ? { ...v, [field]: value } : v));
  const deleteVisit = (id) => setConfirmDialog({ isOpen: true, action: 'deleteVisit', data: id });
  
  const handleConfirmDeleteVisit = async () => {
    const v = visits.find(x => x.id === confirmDialog.data);
    if (v && !v._isNew && typeof confirmDialog.data === 'string') {
      const { success, error } = await visitService.deleteVisit(confirmDialog.data);
      if (!success) return toast.error('Gagal hapus kunjungan: ' + error);
    }
    setVisits(visits.filter(x => x.id !== confirmDialog.data));
    toast.success('Kunjungan dihapus');
  };

  const handleSaveAll = async () => {
    setValidationErrors({});
    const errors = {};
    if (!clinicalData.chief_complaint?.trim()) {
      errors.chief_complaint = 'Keluhan Utama wajib diisi';
    }
    const visitErrors = {};
    visits.forEach(v => {
      const vErrors = {};
      if (!v.keluhan?.trim()) vErrors.keluhan = 'Keluhan (S) wajib diisi';
      if (!v.diagnosa?.trim()) vErrors.diagnosa = 'Diagnosa (A) wajib diisi';
      if (!v.terapi?.trim()) vErrors.terapi = 'Terapi/Tindakan (P) wajib diisi';
      if (Object.keys(vErrors).length > 0) {
        visitErrors[v.id] = vErrors;
      }
    });

    if (Object.keys(errors).length > 0 || Object.keys(visitErrors).length > 0) {
      setValidationErrors({ ...errors, visits: visitErrors });
      toast.error('Harap lengkapi semua bidang wajib yang ditandai merah.');
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.all([
        patientService.saveMedicalHistory(patientId, medicalHistory),
        patientService.saveClinicalData(patientId, clinicalData),
        patientService.saveToothConditions(patientId, toothConditions),
        patientService.savePeriodontalData(patientId, periodontalData),
        patientService.saveExtraOralData(patientId, ekstraOralData),
        patientService.saveIntraOralData(patientId, intraOralData),
        patientService.saveOdontogramMeta(patientId, odontogramMeta),
      ]);

      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        toast.error('Sebagian data medis gagal disimpan: ' + failed[0].error);
        setSaving(false);
        return;
      }

      let latestVisitId = null;
      for (const v of visits.filter(v => v._isNew)) {
        const res = await visitService.createVisit({ 
          patient_id: patientId, 
          tanggal_kunjungan: v.tanggal_kunjungan, 
          keluhan: v.keluhan || '', 
          pemeriksaan_fisik: v.pemeriksaan_fisik || '', 
          diagnosa: v.diagnosa || '', 
          terapi: v.terapi || '', 
          status: 'completed' 
        });
        if (!res.success) {
          toast.error('Gagal membuat kunjungan baru: ' + res.error);
          setSaving(false);
          return;
        }
        if (res.data) {
          latestVisitId = res.data.id;
        }
      }
      for (const v of visits.filter(v => !v._isNew && typeof v.id === 'string')) {
        const res = await visitService.updateVisit(v.id, { 
          keluhan: v.keluhan || '', 
          diagnosa: v.diagnosa || '', 
          terapi: v.terapi || '', 
          pemeriksaan_fisik: v.pemeriksaan_fisik || '',
          status: 'completed'
        });
        if (!res.success) {
          toast.error('Gagal memperbarui kunjungan: ' + res.error);
          setSaving(false);
          return;
        }
        if (!latestVisitId) latestVisitId = v.id;
      }

      // Auto-sync treatments to the latest visit
      if (latestVisitId && clinicalData.treatment_list && clinicalData.treatment_list.length > 0) {
        // Check if payment already exists and is paid (lunas)
        const { data: paymentInfo, error: payError } = await supabase
          .from('payments')
          .select('status_pembayaran')
          .eq('visit_id', latestVisitId)
          .maybeSingle();

        if (payError) {
          console.error('Error checking payment:', payError);
        }

        if (paymentInfo && paymentInfo.status_pembayaran === 'paid') {
          toast.warning('Perawatan tidak dapat diubah karena pembayaran sudah selesai');
        } else {
          const mappedVisitTreatments = clinicalData.treatment_list.map(t => ({
            treatment_id: t.id,
            quantity: 1,
            harga_satuan: t.cost,
            subtotal: t.cost,
            tooth_number: null,
            notes: ''
          }));

          // Fetch existing treatments to merge
          const { data: existingVT, error: vtErr } = await supabase
            .from('visit_treatments')
            .select('*')
            .eq('visit_id', latestVisitId);

          if (vtErr) {
            console.error('Error fetching existing treatments:', vtErr);
          }

          const soapTreatmentIds = new Set(clinicalData.treatment_list.map(t => t.id));
          const receptionistEntries = (existingVT || [])
            .filter(evt => !soapTreatmentIds.has(evt.treatment_id))
            .map(evt => ({
              treatment_id: evt.treatment_id,
              quantity: evt.quantity,
              harga_satuan: evt.harga_satuan,
              subtotal: evt.subtotal,
              tooth_number: evt.tooth_number,
              notes: evt.notes
            }));

          const merged = [...receptionistEntries, ...mappedVisitTreatments];
          const replaceRes = await visitService.replaceVisitTreatments(latestVisitId, merged);
          if (!replaceRes.success) {
            toast.error('Gagal mensinkronisasikan tindakan ke kunjungan: ' + replaceRes.error);
            setSaving(false);
            return;
          }
        }
      }

      toast.success('Berhasil disimpan!');
      localStorage.removeItem(`Dentiva_draft_rm_${patientId}`); // Clear draft on successful database save
      await loadPatientData(); // Reload pristine data and clear _isNew flags to prevent duplicates
    } catch (error) { 
      toast.error('Gagal: ' + error.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleReset = async () => {
    toast.info('Mengembalikan data ke kondisi semula...');
    await loadPatientData();
  };

  if (!canAccess) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="glass-panel text-center p-8 max-w-md animate-scale-in">
        <Shield className="w-16 h-16 text-rose-500 mx-auto mb-4 opacity-80" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Akses Ditolak</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white font-bold rounded-xl transition-all shadow-sm">Kembali</button>
      </div>
    </div>
  );

  if (loading) return <div className="py-20 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 glass-panel p-4 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/pasien')} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rekam Medis Pasien</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola data medis dan odontogram</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"><Printer size={18} /><span className="hidden sm:inline">Cetak</span></button>
          <button onClick={() => setShowLegend(true)} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"><Info size={18} /><span className="hidden sm:inline">Legenda</span></button>
        </div>
      </div>

      {/* Patient Info Card (Only Visible on Mobile screen and Printed paper) */}
      {patient && (
        <div className="glass-panel relative overflow-hidden p-6 mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)]/5 rounded-bl-full -z-10"></div>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <PatientAvatar src={patient.foto_profile} name={patient.nama_lengkap} gender={patient.jenis_kelamin} size="lg"/>
            <div className="flex-1 text-center md:text-left w-full">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{patient.nama_lengkap}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">No. RM: <span className="font-bold text-[var(--color-accent)] px-2 py-0.5 bg-[var(--color-accent)]/10 rounded ml-1">{patient.no_rm}</span></p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-left">
                <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-[var(--color-accent)]"/><div><p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Umur</p><p className="font-semibold text-gray-900 dark:text-white text-sm">{patient.umur} thn</p></div></div>
                <div className="flex items-center gap-3"><User className="w-5 h-5 text-[var(--color-accent)]"/><div><p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Gender</p><p className="font-semibold text-gray-900 dark:text-white text-sm capitalize">{patient.jenis_kelamin}</p></div></div>
                <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-[var(--color-accent)]"/><div><p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">WhatsApp</p><p className="font-semibold text-gray-900 dark:text-white text-sm">{patient.no_wa || '-'}</p></div></div>
                <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-[var(--color-accent)]"/><div><p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Gol. Darah</p><p className="font-semibold text-gray-900 dark:text-white text-sm">{patient.golongan_darah || '-'}</p></div></div>
                <div className="flex items-center gap-3"><Stethoscope className="w-5 h-5 text-[var(--color-accent)]"/><div><p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Dokter Pemeriksa</p><p className="font-semibold text-gray-900 dark:text-white text-sm truncate" title={formatDoctorName(userProfile)}>{formatDoctorName(userProfile) || '-'}</p></div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draft Restore Prompt Banner */}
      {showDraftPrompt && draftToRestore && (
        <div className="glass-panel p-4 mb-6 border-l-4 border-amber-500 bg-amber-50/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-scale-in no-print">
          <div className="flex gap-3">
            <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                Draf rekam medis yang belum disimpan ditemukan!
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Tersimpan secara lokal pada {new Date(draftToRestore.timestamp).toLocaleString('id-ID')}. Apakah Anda ingin memulihkannya?
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={handleRestoreDraft}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors active:scale-95 shadow-sm"
            >
              Pulihkan Draf
            </button>
            <button 
              onClick={handleDiscardDraft}
              className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:scale-95"
            >
              Abaikan
            </button>
          </div>
        </div>
      )}

      {/* Validated Hybrid Layout Grid */}
      {/* Linear Workflow Layout */}
        
        {/* Left Column: Pinned Patient Metadata & Alerts (Desktop Only, hidden on Mobile) */}
        

        {/* Right Column: Workspaces (Interactive tab views) */}
        <div className="space-y-6 w-full">
            {/* Riwayat Penyakit Medis */}
            <div className="glass-panel overflow-hidden mb-6 break-inside-avoid">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Riwayat Penyakit Medis</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
                  {[
                    {key:'hipertensi',label:'Hipertensi'},{key:'jantung',label:'Jantung'},{key:'asma',label:'Asma'},{key:'diabetes',label:'Diabetes'},{key:'alergi',label:'Alergi'},
                    {key:'stroke',label:'Stroke'},{key:'ginjal',label:'Ginjal'},{key:'hepatitis',label:'Hepatitis'},{key:'tuberkulosis',label:'Tuberkulosis (TB)'},
                    {key:'hiv',label:'HIV/AIDS'},{key:'thalassemia',label:'Thalassemia'},{key:'hemofilia',label:'Hemofilia'},{key:'osteoporosis',label:'Osteoporosis'},{key:'tiroid',label:'Gangguan Tiroid'},
                    {key:'epilepsi',label:'Epilepsi'}
                  ].map(({key,label}) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer bg-gray-50/80 dark:bg-gray-800/50 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
                      <input type="checkbox" checked={medicalHistory[key]} onChange={e => setMedicalHistory({...medicalHistory, [key]: e.target.checked})} className="w-4 h-4 text-[var(--color-accent)] rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-[var(--color-accent)]"/>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
                {medicalHistory.alergi && (
                  <div className="mb-5">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Detail Alergi</label>
                    <input type="text" value={medicalHistory.alergi_detail} onChange={e => setMedicalHistory({...medicalHistory, alergi_detail: e.target.value})} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Sebutkan jenis obat/makanan pemicu alergi..."/>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Konsumsi Obat Saat Ini</label>
                    <textarea value={medicalHistory.konsumsi_obat} onChange={e => setMedicalHistory({...medicalHistory, konsumsi_obat: e.target.value})} className="glass-input w-full px-4 py-2.5 rounded-xl resize-none h-24" placeholder="Misal: Amlodipine, Metformin, Warfarin, dll."/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Riwayat Penyakit Lainnya</label>
                    <textarea value={medicalHistory.riwayat_lain} onChange={e => setMedicalHistory({...medicalHistory, riwayat_lain: e.target.value})} className="glass-input w-full px-4 py-2.5 rounded-xl resize-none h-24" placeholder="Tuliskan riwayat penyakit sistemik lainnya..."/>
                  </div>
                </div>
              </div>
            </div>

            {/* Keluhan Utama (Chief Complaint) */}
            <div className="glass-panel overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Keluhan Utama (Chief Complaint)</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                      Keluhan Utama <span className="text-rose-500">*</span>
                    </label>
                    <textarea 
                      value={clinicalData.chief_complaint || ''} 
                      onChange={e => setClinicalData({...clinicalData, chief_complaint: e.target.value})} 
                      className={`glass-input w-full px-4 py-2.5 rounded-xl resize-none h-24 ${validationErrors.chief_complaint ? 'border-rose-500 ring-rose-500 focus:border-rose-500 focus:ring-rose-500 border-2' : ''}`} 
                      placeholder="Keluhan utama pasien saat ini..." 
                    />
                    {validationErrors.chief_complaint && (
                      <p className="text-rose-500 text-xs mt-1 font-medium">{validationErrors.chief_complaint}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Keluhan Tambahan</label>
                    <textarea 
                      value={clinicalData.additional_complaint || ''} 
                      onChange={e => setClinicalData({...clinicalData, additional_complaint: e.target.value})} 
                      className="glass-input w-full px-4 py-2.5 rounded-xl resize-none h-24" 
                      placeholder="Keluhan tambahan jika ada..." 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Pemeriksaan Ekstra Oral (Wajah)</label>
                    <div className="flex gap-6 mt-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400 italic">Lihat bagian Pemeriksaan Extra Oral di bawah</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Riwayat Perawatan Gigi</label>
                    <div className="flex gap-6 mt-2 mb-3">
                      {['belum_dirawat', 'pernah_dirawat'].map(v => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="rwyt_prwtn" value={v} checked={clinicalData.treatment_history_status === v} onChange={e => setClinicalData({...clinicalData, treatment_history_status: e.target.value, treatment_history_details: v === 'belum_dirawat' ? '' : clinicalData.treatment_history_details})} className="w-4 h-4 text-[var(--color-accent)] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-[var(--color-accent)]" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{v === 'belum_dirawat' ? 'Belum Pernah' : 'Pernah Dirawat'}</span>
                        </label>
                      ))}
                    </div>
                    {clinicalData.treatment_history_status === 'pernah_dirawat' && (
                      <input 
                        type="text" 
                        value={clinicalData.treatment_history_details || ''} 
                        onChange={e => setClinicalData({...clinicalData, treatment_history_details: e.target.value})} 
                        className="glass-input w-full px-4 py-2.5 rounded-xl bg-blue-50/30 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800" 
                        placeholder="Misal: Tumpatan amalgam pada gigi 16..." 
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Kebiasaan Buruk</label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {['Bruxism', 'Mengisap Jari', 'Bernapas Mulut', 'Gigit Bibir/Kuku'].map(h => (
                        <label key={h} className="flex items-center gap-2 cursor-pointer bg-gray-50/50 dark:bg-gray-800/30 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <input type="checkbox" checked={(clinicalData.bad_habits || []).includes(h)} onChange={e => {
                            const newHabits = e.target.checked ? [...(clinicalData.bad_habits || []), h] : (clinicalData.bad_habits || []).filter(x => x !== h);
                            setClinicalData({...clinicalData, bad_habits: newHabits});
                          }} className="w-4 h-4 text-[var(--color-accent)] rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-[var(--color-accent)]" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{h}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Riwayat Sosial</label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {['Merokok', 'Alkohol', 'Kopi/Teh Berlebih', 'Pola Makan Manis'].map(s => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer bg-gray-50/50 dark:bg-gray-800/30 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <input type="checkbox" checked={(clinicalData.social_history || []).includes(s)} onChange={e => {
                            const newSocial = e.target.checked ? [...(clinicalData.social_history || []), s] : (clinicalData.social_history || []).filter(x => x !== s);
                            setClinicalData({...clinicalData, social_history: newSocial});
                          }} className="w-4 h-4 text-[var(--color-accent)] rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-[var(--color-accent)]" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Lain-lain</label>
                    <textarea 
                      value={clinicalData.other_notes || ''} 
                      onChange={e => setClinicalData({...clinicalData, other_notes: e.target.value})} 
                      className="glass-input w-full px-4 py-2.5 rounded-xl resize-none h-20" 
                      placeholder="Catatan klinis lainnya..." 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Keterangan</label>
                    <textarea 
                      value={clinicalData.remarks || ''} 
                      onChange={e => setClinicalData({...clinicalData, remarks: e.target.value})} 
                      className="glass-input w-full px-4 py-2.5 rounded-xl resize-none h-20" 
                      placeholder="Keterangan tambahan..." 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pemeriksaan Extra Oral */}
            <div className="glass-panel overflow-hidden mb-6 break-inside-avoid">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Pemeriksaan Extra Oral</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Wajah</label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {['simetri', 'asimetri', 'ada_kelainan'].map(v => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="eo_wajah" checked={clinicalData.extra_oral?.wajah === v} onChange={e => setClinicalData({...clinicalData, extra_oral: {...clinicalData.extra_oral, wajah: v}})} className="w-4 h-4 text-[var(--color-accent)] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-[var(--color-accent)]" />
                          <span className="text-sm capitalize font-medium text-gray-700 dark:text-gray-300">{v.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                    {clinicalData.extra_oral?.wajah === 'ada_kelainan' && (
                      <input type="text" value={clinicalData.extra_oral.wajah_kelainan || ''} onChange={e => setClinicalData({...clinicalData, extra_oral: {...clinicalData.extra_oral, wajah_kelainan: e.target.value}})} className="glass-input w-full px-4 py-2.5 rounded-xl mt-3" placeholder="Sebutkan kelainan..." />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Bibir</label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {['sehat', 'ada_kelainan'].map(v => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="eo_bibir" checked={clinicalData.extra_oral?.bibir === v} onChange={e => setClinicalData({...clinicalData, extra_oral: {...clinicalData.extra_oral, bibir: v}})} className="w-4 h-4 text-[var(--color-accent)] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-[var(--color-accent)]" />
                          <span className="text-sm capitalize font-medium text-gray-700 dark:text-gray-300">{v.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                    {clinicalData.extra_oral?.bibir === 'ada_kelainan' && (
                      <input type="text" value={clinicalData.extra_oral.bibir_kelainan || ''} onChange={e => setClinicalData({...clinicalData, extra_oral: {...clinicalData.extra_oral, bibir_kelainan: e.target.value}})} className="glass-input w-full px-4 py-2.5 rounded-xl mt-3" placeholder="Sebutkan kelainan..." />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">KGB Submandibula Kanan</label>
                    <div className="flex gap-4 mt-2 mb-3">
                      {['tidak_teraba', 'teraba'].map(v => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="kgb_kanan" checked={clinicalData.extra_oral?.kgb_kanan === v} onChange={e => setClinicalData({...clinicalData, extra_oral: {...clinicalData.extra_oral, kgb_kanan: v}})} className="w-4 h-4 text-[var(--color-accent)] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-[var(--color-accent)]" />
                          <span className="text-sm capitalize font-medium text-gray-700 dark:text-gray-300">{v.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                    {clinicalData.extra_oral?.kgb_kanan === 'teraba' && (
                      <div className="flex gap-4 bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                        <select value={clinicalData.extra_oral.kgb_kanan_konsistensi || ''} onChange={e => setClinicalData({...clinicalData, extra_oral: {...clinicalData.extra_oral, kgb_kanan_konsistensi: e.target.value}})} className="glass-input w-full px-3 py-2 rounded-lg text-sm appearance-none flex-1">
                          <option value="">Konsistensi...</option>
                          <option value="lunak">Lunak</option>
                          <option value="kenyal">Kenyal</option>
                          <option value="keras">Keras</option>
                        </select>
                        <select value={clinicalData.extra_oral.kgb_kanan_sakit || ''} onChange={e => setClinicalData({...clinicalData, extra_oral: {...clinicalData.extra_oral, kgb_kanan_sakit: e.target.value}})} className="glass-input w-full px-3 py-2 rounded-lg text-sm appearance-none flex-1">
                          <option value="">Rasa Sakit...</option>
                          <option value="sakit">Sakit</option>
                          <option value="tidak_sakit">Tidak Sakit</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">KGB Submandibula Kiri</label>
                    <div className="flex gap-4 mt-2 mb-3">
                      {['tidak_teraba', 'teraba'].map(v => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="kgb_kiri" checked={clinicalData.extra_oral?.kgb_kiri === v} onChange={e => setClinicalData({...clinicalData, extra_oral: {...clinicalData.extra_oral, kgb_kiri: v}})} className="w-4 h-4 text-[var(--color-accent)] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-[var(--color-accent)]" />
                          <span className="text-sm capitalize font-medium text-gray-700 dark:text-gray-300">{v.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                    {clinicalData.extra_oral?.kgb_kiri === 'teraba' && (
                      <div className="flex gap-4 bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                        <select value={clinicalData.extra_oral.kgb_kiri_konsistensi || ''} onChange={e => setClinicalData({...clinicalData, extra_oral: {...clinicalData.extra_oral, kgb_kiri_konsistensi: e.target.value}})} className="glass-input w-full px-3 py-2 rounded-lg text-sm appearance-none flex-1">
                          <option value="">Konsistensi...</option>
                          <option value="lunak">Lunak</option>
                          <option value="kenyal">Kenyal</option>
                          <option value="keras">Keras</option>
                        </select>
                        <select value={clinicalData.extra_oral.kgb_kiri_sakit || ''} onChange={e => setClinicalData({...clinicalData, extra_oral: {...clinicalData.extra_oral, kgb_kiri_sakit: e.target.value}})} className="glass-input w-full px-3 py-2 rounded-lg text-sm appearance-none flex-1">
                          <option value="">Rasa Sakit...</option>
                          <option value="sakit">Sakit</option>
                          <option value="tidak_sakit">Tidak Sakit</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Kelenjar Lainnya</label>
                  <input type="text" value={clinicalData.extra_oral?.kelenjar_lainnya || ''} onChange={e => setClinicalData({...clinicalData, extra_oral: {...clinicalData.extra_oral, kelenjar_lainnya: e.target.value}})} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Kelenjar lainnya..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Kelainan Lainnya</label>
                  <textarea value={clinicalData.extra_oral?.kelainan_lainnya || ''} onChange={e => setClinicalData({...clinicalData, extra_oral: {...clinicalData.extra_oral, kelainan_lainnya: e.target.value}})} className="glass-input w-full px-4 py-2.5 rounded-xl resize-none h-24" placeholder="Kelainan ekstra oral lainnya..." />
                </div>
              </div>
            </div>

            {/* Keadaan Umum (Vital Signs Inputs) */}
            <div className="glass-panel overflow-hidden mb-6 break-inside-avoid">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Keadaan Umum (Tanda Vital)</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Tekanan Darah</label>
                    <input type="text" value={clinicalData.general_condition?.tekanan_darah || ''} onChange={e => setClinicalData({...clinicalData, general_condition: {...clinicalData.general_condition, tekanan_darah: e.target.value}})} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="mmHg" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Nadi</label>
                    <input type="text" value={clinicalData.general_condition?.nadi || ''} onChange={e => setClinicalData({...clinicalData, general_condition: {...clinicalData.general_condition, nadi: e.target.value}})} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="x/menit" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Pernapasan</label>
                    <input type="text" value={clinicalData.general_condition?.pernapasan || ''} onChange={e => setClinicalData({...clinicalData, general_condition: {...clinicalData.general_condition, pernapasan: e.target.value}})} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="x/menit" />
                  </div>
                </div>
              </div>
            </div>

            {/* Keadaan Umum Intra Oral */}
            <div className="glass-panel overflow-hidden mb-6 break-inside-avoid">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Keadaan Umum Intra Oral</h3>
              </div>
              <div className="p-6 space-y-5">
                
                {['debri', 'plak', 'kalkulus', 'perdarahan_papila', 'risiko_karies', 'kelainan_gigi', 'lain_lain'].map(f => (
                  <div key={f} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 md:col-span-3 capitalize">{f.replace(/_/g, ' ')}</label>
                    <div className="md:col-span-4 flex gap-6">
                      {['tidak_ada', 'ada'].map(v => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={`io_${f}`} checked={clinicalData.intra_oral?.[f] === v} onChange={e => setClinicalData({...clinicalData, intra_oral: {...clinicalData.intra_oral, [f]: v}})} className="w-4 h-4 text-[var(--color-accent)] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-[var(--color-accent)]" />
                          <span className="text-sm capitalize font-medium text-gray-700 dark:text-gray-300">{v.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                    {clinicalData.intra_oral?.[f] === 'ada' && (
                      <div className="md:col-span-5 flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Regio:</span>
                        <input type="text" value={clinicalData.intra_oral[`${f}_regio`] || ''} onChange={e => setClinicalData({...clinicalData, intra_oral: {...clinicalData.intra_oral, [`${f}_regio`]: e.target.value}})} className="glass-input w-full px-3 py-1.5 rounded-lg text-sm flex-1" />
                      </div>
                    )}
                  </div>
                ))}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 mt-2 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">pH Plak</label>
                    <input type="text" value={clinicalData.intra_oral?.ph_plak || ''} onChange={e => setClinicalData({...clinicalData, intra_oral: {...clinicalData.intra_oral, ph_plak: e.target.value}})} className="glass-input w-full px-4 py-2.5 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">pH Saliva</label>
                    <input type="text" value={clinicalData.intra_oral?.ph_saliva || ''} onChange={e => setClinicalData({...clinicalData, intra_oral: {...clinicalData.intra_oral, ph_saliva: e.target.value}})} className="glass-input w-full px-4 py-2.5 rounded-xl" />
                  </div>
                </div>

                <div className="pt-5 mt-2 border-t border-gray-100 dark:border-gray-800 space-y-5">
                  {['gingiva', 'mukosa', 'palatum', 'lidah', 'dasar_mulut'].map(f => (
                    <div key={f} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 md:col-span-3 capitalize">{f.replace(/_/g, ' ')}</label>
                      <div className="md:col-span-4 flex gap-6">
                        {['sehat', 'ada_kelainan'].map(v => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name={`io_${f}`} checked={clinicalData.intra_oral?.[f] === v} onChange={e => setClinicalData({...clinicalData, intra_oral: {...clinicalData.intra_oral, [f]: v}})} className="w-4 h-4 text-[var(--color-accent)] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-[var(--color-accent)]" />
                            <span className="text-sm capitalize font-medium text-gray-700 dark:text-gray-300">{v.replace(/_/g, ' ')}</span>
                          </label>
                        ))}
                      </div>
                      {clinicalData.intra_oral?.[f] === 'ada_kelainan' && (
                        <div className="md:col-span-5 flex items-center gap-3">
                           <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Keterangan:</span>
                           <input type="text" value={clinicalData.intra_oral[`${f}_regio`] || ''} onChange={e => setClinicalData({...clinicalData, intra_oral: {...clinicalData.intra_oral, [`${f}_regio`]: e.target.value}})} className="glass-input w-full px-3 py-1.5 rounded-lg text-sm flex-1" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-5 mt-2 border-t border-gray-100 dark:border-gray-800">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Hubungan Rahang</label>
                  <div className="flex flex-wrap gap-6 mt-2">
                    {['ortognati', 'retrognati', 'prognati', 'ada_kelainan_lain'].map(v => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="io_rahang" checked={clinicalData.intra_oral?.hubungan_rahang === v} onChange={e => setClinicalData({...clinicalData, intra_oral: {...clinicalData.intra_oral, hubungan_rahang: v}})} className="w-4 h-4 text-[var(--color-accent)] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-[var(--color-accent)]" />
                        <span className="text-sm capitalize font-medium text-gray-700 dark:text-gray-300">{v.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                  {clinicalData.intra_oral?.hubungan_rahang === 'ada_kelainan_lain' && (
                    <input type="text" value={clinicalData.intra_oral.hubungan_rahang_lain || ''} onChange={e => setClinicalData({...clinicalData, intra_oral: {...clinicalData.intra_oral, hubungan_rahang_lain: e.target.value}})} className="glass-input w-full px-4 py-2.5 rounded-xl mt-4" placeholder="Sebutkan..." />
                  )}
                </div>
              </div>
            </div>

            {/* Pemeriksaan Periodontal & OHIS */}
            <div className="glass-panel overflow-hidden mb-6 break-inside-avoid">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Pemeriksaan Periodontal & OHIS</h3>
              </div>
              <div className="p-6 space-y-6">
                
                {/* OHIS Grid */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide">Skor Debris & Kalkulus (Gigi Indeks: 16, 11, 26, 46, 31, 36)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Debris Section */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
                      <h5 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex justify-between items-center">
                        <span>Debris Score</span>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-mono">DI: {getOhisCalculation(ohisSubscores).di}</span>
                      </h5>
                      <div className="grid grid-cols-6 gap-2">
                        {['16', '11', '26', '46', '31', '36'].map(tooth => (
                          <div key={tooth} className="text-center">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">{tooth}</label>
                            <select
                              value={ohisSubscores.debris[tooth] || 0}
                              onChange={e => handleOhisChange('debris', tooth, e.target.value)}
                              className="glass-input w-full px-2 py-1.5 rounded-lg text-xs font-mono text-center bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-750"
                            >
                              <option value="0">0</option>
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Calculus Section */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
                      <h5 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex justify-between items-center">
                        <span>Calculus Score</span>
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-mono">CI: {getOhisCalculation(ohisSubscores).ci}</span>
                      </h5>
                      <div className="grid grid-cols-6 gap-2">
                        {['16', '11', '26', '46', '31', '36'].map(tooth => (
                          <div key={tooth} className="text-center">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">{tooth}</label>
                            <select
                              value={ohisSubscores.calculus[tooth] || 0}
                              onChange={e => handleOhisChange('calculus', tooth, e.target.value)}
                              className="glass-input w-full px-2 py-1.5 rounded-lg text-xs font-mono text-center bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-750"
                            >
                              <option value="0">0</option>
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Calculation Result */}
                  <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Hasil Penghitungan OHIS</h5>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400/80 mt-0.5">OhiS = Debris Index (DI) + Calculus Index (CI)</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-emerald-800 dark:text-emerald-300 font-mono">
                        {getOhisCalculation(ohisSubscores).ohis}
                      </span>
                      <span className={`ml-2 px-2.5 py-1 text-xs font-bold uppercase rounded-full tracking-wider ${
                        getOhisCalculation(ohisSubscores).category === 'Baik' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        getOhisCalculation(ohisSubscores).category === 'Sedang' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {getOhisCalculation(ohisSubscores).category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Periodontal Metrics Grid */}
                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide">Parameter Periodontal Lainnya</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Plak Indeks</label>
                      <input type="text" value={periodontalData.plakIndeks || ''} onChange={e => setPeriodontalData({...periodontalData, plakIndeks: e.target.value})} className="glass-input w-full px-3 py-2 rounded-xl text-sm" placeholder="%" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">BOP (Bleeding on Probing)</label>
                      <input type="text" value={periodontalData.bop || ''} onChange={e => setPeriodontalData({...periodontalData, bop: e.target.value})} className="glass-input w-full px-3 py-2 rounded-xl text-sm" placeholder="%" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Mobility (Goyang Gigi)</label>
                      <input type="text" value={periodontalData.mobility || ''} onChange={e => setPeriodontalData({...periodontalData, mobility: e.target.value})} className="glass-input w-full px-3 py-2 rounded-xl text-sm" placeholder="Regio / derajat..." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Pocket Depth</label>
                      <input type="text" value={periodontalData.pocketDepth || ''} onChange={e => setPeriodontalData({...periodontalData, pocketDepth: e.target.value})} className="glass-input w-full px-3 py-2 rounded-xl text-sm" placeholder="mm..." />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Keterlibatan Furkasi</label>
                      <input type="text" value={periodontalData.furkasi || ''} onChange={e => setPeriodontalData({...periodontalData, furkasi: e.target.value})} className="glass-input w-full px-3 py-2 rounded-xl text-sm" placeholder="Kelas..." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Resesi Gingiva</label>
                      <input type="text" value={periodontalData.resesiGingiva || ''} onChange={e => setPeriodontalData({...periodontalData, resesiGingiva: e.target.value})} className="glass-input w-full px-3 py-2 rounded-xl text-sm" placeholder="mm..." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Kondisi Gingiva</label>
                      <input type="text" value={periodontalData.kondisiGingiva || ''} onChange={e => setPeriodontalData({...periodontalData, kondisiGingiva: e.target.value})} className="glass-input w-full px-3 py-2 rounded-xl text-sm" placeholder="Warna, konsistensi..." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Kondisi Mukosa</label>
                      <input type="text" value={periodontalData.kondisiMukosa || ''} onChange={e => setPeriodontalData({...periodontalData, kondisiMukosa: e.target.value})} className="glass-input w-full px-3 py-2 rounded-xl text-sm" placeholder="Keterangan..." />
                    </div>
                  </div>
                </div>
                
              </div>
            </div>

          {/* ═════════════════════════════════════════════════════════════════
              TAB 2: ODONTOGRAM & DIAGNOSIS (Always printed in serial print outs)
              ═════════════════════════════════════════════════════════════════ */}
            {/* Odontogram Section */}
            <div className="glass-panel overflow-hidden mb-6 break-inside-avoid">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-between items-center flex-wrap gap-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Odontogram Anak & Dewasa</h3>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDialog({ isOpen: true, action: 'clearAllTooth', data: null })} className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 text-xs font-semibold rounded-lg transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-800 no-print">Reset Semua Gigi</button>
                  <button onClick={() => setShowLegend(true)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 text-xs font-semibold rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 no-print">Bantuan Simbol</button>
                </div>
              </div>
              <div className="p-4 sm:p-6 bg-white dark:bg-gray-900">
                <Odontogram 
                  conditions={toothConditions} 
                  onChange={(newData) => setToothConditions(newData)} 
                  onClear={clearTooth} 
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Relasi Molar Kanan</label>
                    <div className="flex gap-4 mt-1">
                      {['kls1','kls2','kls3'].map(v => (
                        <label key={v} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors">
                          <input type="radio" className="w-4 h-4 text-[var(--color-accent)] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-[var(--color-accent)]" name="relasi_kanan" value={v} checked={odontogramMeta.relasi_molar_kanan === v} onChange={e => setOdontogramMeta(p => ({...p, relasi_molar_kanan: e.target.value}))}/>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{v === 'kls1' ? 'Kelas I' : v === 'kls2' ? 'Kelas II' : 'Kelas III'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Relasi Molar Kiri</label>
                    <div className="flex gap-4 mt-1">
                      {['kls1','kls2','kls3'].map(v => (
                        <label key={v} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors">
                          <input type="radio" className="w-4 h-4 text-[var(--color-accent)] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-[var(--color-accent)]" name="relasi_kiri" value={v} checked={odontogramMeta.relasi_molar_kiri === v} onChange={e => setOdontogramMeta(p => ({...p, relasi_molar_kiri: e.target.value}))}/>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{v === 'kls1' ? 'Kelas I' : v === 'kls2' ? 'Kelas II' : 'Kelas III'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Catatan Tambahan Odontogram</label>
                    <textarea 
                      value={odontogramMeta.catatan_odontogram || ''} 
                      onChange={(e) => setOdontogramMeta({...odontogramMeta, catatan_odontogram: e.target.value})} 
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm h-16 resize-none" 
                      placeholder="Catatan khusus terkait odontogram..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnosis & Treatment Section */}
            <DiagnosisTreatment 
              clinicalData={clinicalData}
              setClinicalData={setClinicalData}
              isLocked={isTreatmentLocked}
            />

          {/* ═════════════════════════════════════════════════════════════════
              TAB 3: BERKAS & RUJUKAN (Always printed in serial print outs)
              ═════════════════════════════════════════════════════════════════ */}
            {/* PATIENT MEDIA UPLOAD SECTION */}
            <PatientMediaUpload 
              patientId={patientId}
              visitId={null} /* Null because media is not strictly tied to a single visit yet during drafting */
            />

            {/* Voice Input (Speech to SOAP) */}
            <div className="glass-panel overflow-hidden mb-6 break-inside-avoid">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Catatan Suara Medis (Voice Dictation)</h3>
              </div>
              <div className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
                <button onClick={isListening ? stopListening : startListening} className={`flex items-center justify-center w-40 gap-2 px-4 py-3 rounded-xl font-bold text-white transition-all shadow-md ${isListening ? 'bg-rose-500 hover:bg-rose-600 animate-pulse' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)]'}`}>
                  {isListening ? <MicOff size={20}/> : <Mic size={20}/>}
                  {isListening ? 'Stop Rekam' : 'Mulai Bicara'}
                </button>
                <div className="flex-1 glass-input rounded-xl p-4 min-h-[80px] w-full">
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isListening ? 'text-rose-500' : 'text-gray-400'}`}>{voiceStatus}</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{transcript || <span className="text-gray-400 dark:text-gray-500 italic">Teks hasil suara akan muncul di sini...</span>}</p>
                </div>
              </div>
            </div>

            {/* SOAP Histori Kunjungan */}
            <div className="glass-panel overflow-hidden mb-8 break-inside-avoid print:break-before-page">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><Calendar className="text-[var(--color-accent)]"/> Histori Kunjungan & SOAP</h3>
                <button onClick={addVisit} className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors no-print"><Plus size={16}/> Tambah Kunjungan</button>
              </div>
              <div className="p-6">
                {visits.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <Calendar className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"/>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Belum ada catatan kunjungan</p>
                  </div>
                ) : (
                  <div className="space-y-6 border-l-2 border-[var(--color-accent)]/30 pl-6 ml-2 relative">
                    {visits.map((visit, index) => (
                      <div key={visit.id} className="relative p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-[var(--color-accent)]/30 transition-colors shadow-sm">
                        <div className="absolute w-4 h-4 rounded-full bg-[var(--color-accent)] border-4 border-white dark:border-gray-900 -left-[33px] top-7 shadow-sm"></div>
                        <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
                          <span className="font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3 py-1 rounded-md text-xs uppercase tracking-wider">Kunjungan #{index + 1}</span>
                          <button onClick={() => deleteVisit(visit.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors no-print"><Trash2 size={18}/></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Tanggal</label>
                            <input type="date" value={visit.tanggal_kunjungan || ''} onChange={e => updateVisit(visit.id, 'tanggal_kunjungan', e.target.value)} className="glass-input w-full px-3 py-2 rounded-lg text-sm"/>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                              Keluhan (S) <span className="text-rose-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              value={visit.keluhan || ''} 
                              onChange={e => updateVisit(visit.id, 'keluhan', e.target.value)} 
                              className={`glass-input w-full px-3 py-2 rounded-lg text-sm ${validationErrors.visits?.[visit.id]?.keluhan ? 'border-rose-500 ring-rose-500 focus:border-rose-500 focus:ring-rose-500 border-2' : ''}`}
                            />
                            {validationErrors.visits?.[visit.id]?.keluhan && (
                              <p className="text-rose-500 text-[10px] mt-1 font-medium">{validationErrors.visits[visit.id].keluhan}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                              Diagnosa (A) <span className="text-rose-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              value={visit.diagnosa || ''} 
                              onChange={e => updateVisit(visit.id, 'diagnosa', e.target.value)} 
                              className={`glass-input w-full px-3 py-2 rounded-lg text-sm ${validationErrors.visits?.[visit.id]?.diagnosa ? 'border-rose-500 ring-rose-500 focus:border-rose-500 focus:ring-rose-500 border-2' : ''}`}
                            />
                            {validationErrors.visits?.[visit.id]?.diagnosa && (
                              <p className="text-rose-500 text-[10px] mt-1 font-medium">{validationErrors.visits[visit.id].diagnosa}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                              Terapi/Tindakan (P) <span className="text-rose-500">*</span>
                            </label>
                            <input 
                              type="text" 
                              value={visit.terapi || ''} 
                              onChange={e => updateVisit(visit.id, 'terapi', e.target.value)} 
                              className={`glass-input w-full px-3 py-2 rounded-lg text-sm ${validationErrors.visits?.[visit.id]?.terapi ? 'border-rose-500 ring-rose-500 focus:border-rose-500 focus:ring-rose-500 border-2' : ''}`}
                            />
                            {validationErrors.visits?.[visit.id]?.terapi && (
                              <p className="text-rose-500 text-[10px] mt-1 font-medium">{validationErrors.visits[visit.id].terapi}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

        </div>
      {/* Pinned action wrapper for saving / printing */}
      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-6 z-10 flex flex-col md:flex-row justify-between items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-4 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] print:hidden gap-4">
        <button onClick={() => setShowReferralModal(true)} className="w-full md:w-auto px-6 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
          <FileText size={18} /> Tambah Surat Rujukan
        </button>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <button onClick={handleReset} className="w-full md:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors">Batal (Reset)</button>
          <button onClick={() => window.print()} className="w-full md:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors">
            <Printer size={18} /> Cetak (PDF)
          </button>
          <button onClick={handleSaveAll} className="w-full md:w-auto px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors" disabled={saving}>
            {saving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>Menyimpan...</> : <><Save size={18}/> Simpan Rekam Medis</>}
          </button>
        </div>
      </div>

      {/* Global CSS for Print (Medical Record) */}
      <style>{`
        @media print {
          /* Hide non-essential UI */
          aside, nav, .sticky, button, .print\\:hidden, .no-print {
            display: none !important;
          }
          
          /* Expand main container to fill page */
          html, body, #root, .h-screen, .flex-1, main, .main-content {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            color: black !important;
          }

          /* General form styling for print */
          input, textarea, select {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            appearance: none !important;
            resize: none !important;
            padding: 0 !important;
            color: black !important;
          }

          /* Force dashed borders on specific wrappers to look like paper lines if needed */
          .input-field {
            border-bottom: 1px dashed #ccc !important;
            border-radius: 0 !important;
          }
          
          /* Odontogram SVG optimization */
          svg {
            max-width: 100% !important;
          }

          /* Prevent awkward page breaks */
          .break-inside-avoid {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Legend Modal */}
      {showLegend && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Info className="text-blue-500"/> Legenda Simbol Odontogram v4.0</h3>
              <button onClick={() => setShowLegend(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors font-bold text-gray-500">✕</button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {CODE_CATEGORIES.map(group => (
                <div key={group.key} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-3 uppercase text-xs tracking-wider flex items-center gap-2">
                    <span>{group.icon}</span> {group.label}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.codes.map(sym => (
                      <div key={sym.code} className="flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-lg shadow-sm">
                        {sym.swatch ? (
                          <div className="w-6 h-6 rounded shadow-inner flex items-center justify-center font-bold text-[10px]" style={{ backgroundColor: sym.warna, color: '#000' }}>{sym.swatch}</div>
                        ) : (
                          <div className="w-6 h-6 rounded shadow-inner flex items-center justify-center font-bold text-[10px] bg-white border" style={{ borderColor: sym.border || sym.warna, color: sym.warna }}>{sym.text}</div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{sym.code}</span>
                          <span className="text-xs text-gray-500 leading-tight">{sym.nama}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog({ isOpen: false, action: null, data: null })} onConfirm={() => { if (confirmDialog.action === 'clearTooth') handleConfirmClearTooth(); else if (confirmDialog.action === 'deleteVisit') handleConfirmDeleteVisit(); setConfirmDialog({ isOpen: false, action: null, data: null }); }} title={confirmDialog.action === 'clearTooth' ? 'Hapus Kondisi Gigi?' : 'Hapus Kunjungan?'} message={confirmDialog.action === 'clearTooth' ? `Apakah Anda yakin ingin menghapus kondisi gigi ${confirmDialog.data}?` : 'Apakah Anda yakin ingin menghapus catatan kunjungan ini?'} confirmText="Ya, Hapus" type="danger"/>

      {/* Referral Letter Modal */}
      <ReferralLetterModal 
        isOpen={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        patient={patient}
        userProfile={userProfile}
      />
    </div>
  );
};

export default MedicalRecordForm;