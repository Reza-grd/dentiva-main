import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PhotoUpload from '../common/PhotoUpload';
import { useToast } from '../common/ToastNotification';
import ScheduleVisitForm from './ScheduleVisitForm';
import { patientService } from '../../services/patientService';
import { visitService } from '../../services/visitService';
import { storageService } from '../../services/storageService';
import { useAuth } from '../../contexts/AuthContext';
import {
  PROVINSI, getKabupatenByProvinsi, getKecamatanByKabupaten, getDesaByKecamatan
} from '../../utils/wilayahIndonesia';
import { UserPlus, Save, X, CheckCircle, Calendar, Clock, ChevronLeft, Search, Loader2 } from 'lucide-react';

const AGAMA_OPTIONS = ['Islam','Kristen','Katolik','Hindu','Budha','Konghucu'];
const PENDIDIKAN_OPTIONS = ['SD','SLTP','SLTA','D3','S1','Sp/S2','S3'];
const PEKERJAAN_OPTIONS = ['PNS','TNI/POLRI','Swasta','Pensiunan','Lainnya'];

const PatientRegistration = () => {
  const { userProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [registrationMode, setRegistrationMode] = useState('baru'); // 'baru' | 'lama'
  
  // Pasien Lama States
  const [searchOldTerm, setSearchOldTerm] = useState('');
  const [debouncedOldTerm, setDebouncedOldTerm] = useState('');
  const [oldSearchResults, setOldSearchResults] = useState([]);
  const [selectedOldPatient, setSelectedOldPatient] = useState(null);
  const [isSearchingOld, setIsSearchingOld] = useState(false);

  const [successModalData, setSuccessModalData] = useState(null);
  const [scheduleSuccessModalData, setScheduleSuccessModalData] = useState(null);
  const [registeredPatientData, setRegisteredPatientData] = useState(null);
  const [isDaftarDanJadwalkan, setIsDaftarDanJadwalkan] = useState(false);
  const [errorModalMsg, setErrorModalMsg] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [doctors, setDoctors] = useState([]);

  // Cascading wilayah state
  const [kabupatenList, setKabupatenList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);

  // Pekerjaan "Lainnya" free text
  const [pekerjaanLainnya, setPekerjaanLainnya] = useState('');

  const [formData, setFormData] = useState({
    nama_lengkap: '', nama_kk: '', tempat_lahir: '', tanggal_lahir: '', jenis_kelamin: '', umur: '',
    agama: '', pendidikan_terakhir: '', pekerjaan: '', status_pernikahan: '', jaminan_kesehatan: '',
    golongan_darah: '', alamat_detail: '', provinsi: '', kabupaten: '', kecamatan: '', desa: '',
    no_wa: '', no_telepon: '', dokter_keluarga: '', dokter_gigi_keluarga: '', rujukan_dari: '',
    berat_badan: '', tinggi_badan: '', keluhan_awal: '', wa_consent: false,
  });

  const [scheduleData, setScheduleData] = useState({
    tanggal_kunjungan: new Date().toISOString().split('T')[0],
    jam_kunjungan: '', // Changed to jam_kunjungan to match ScheduleVisitForm
    keluhan: '',
    catatan: '',
    dokter_id: '',
  });

  // Debounce and Search Old Patient
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOldTerm(searchOldTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchOldTerm]);

  useEffect(() => {
    const doSearch = async () => {
      if (debouncedOldTerm.trim().length < 2) {
        setOldSearchResults([]);
        return;
      }
      setIsSearchingOld(true);
      const { success, data } = await patientService.searchPatients(debouncedOldTerm);
      if (success) setOldSearchResults(data || []);
      setIsSearchingOld(false);
    };
    doSearch();
  }, [debouncedOldTerm]);

  const handleOldPatientSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOldPatient) {
      toast.error('Silakan pilih pasien terlebih dahulu');
      return;
    }
    if (!scheduleData.dokter_id || !scheduleData.tanggal_kunjungan || !scheduleData.jam_kunjungan) {
      toast.error('Harap lengkapi tanggal, jam, dan dokter');
      return;
    }

    setLoading(true);
    const result = await visitService.createVisit({
      patient_id: selectedOldPatient.id,
      dokter_id: scheduleData.dokter_id,
      tanggal_kunjungan: scheduleData.tanggal_kunjungan,
      jam_kunjungan: scheduleData.jam_kunjungan,
      keluhan: scheduleData.keluhan,
      catatan: scheduleData.catatan,
      status: 'scheduled'
    });
    setLoading(false);

    if (result.success) {
      setScheduleSuccessModalData({
        visitId: result.data.id,
        patientName: selectedOldPatient.nama_lengkap,
        date: scheduleData.tanggal_kunjungan,
        time: scheduleData.jam_kunjungan
      });
    } else {
      toast.error('Gagal menjadwalkan kunjungan: ' + result.error);
    }
  };

  useEffect(() => {
    const loadDoctors = async () => {
      const result = await visitService.getAllDoctors();
      if (result.success) setDoctors(result.data || []);
    };
    loadDoctors();
  }, []);

  useEffect(() => {
    if (formData.provinsi) {
      setKabupatenList(getKabupatenByProvinsi(formData.provinsi));
      setKecamatanList([]);
      setDesaList([]);
    } else {
      setKabupatenList([]);
    }
  }, [formData.provinsi]);

  useEffect(() => {
    if (formData.kabupaten) {
      setKecamatanList(getKecamatanByKabupaten(formData.kabupaten));
      setDesaList([]);
    } else {
      setKecamatanList([]);
    }
  }, [formData.kabupaten]);

  useEffect(() => {
    if (formData.kecamatan) {
      setDesaList(getDesaByKecamatan(formData.kecamatan));
    } else {
      setDesaList([]);
    }
  }, [formData.kecamatan]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;

    if (errors[name]) {
      setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }

    if (name === 'provinsi') {
      setFormData(prev => ({ ...prev, provinsi: finalValue, kabupaten: '', kecamatan: '', desa: '' }));
      return;
    }
    if (name === 'kabupaten') {
      setFormData(prev => ({ ...prev, kabupaten: finalValue, kecamatan: '', desa: '' }));
      return;
    }
    if (name === 'kecamatan') {
      setFormData(prev => ({ ...prev, kecamatan: finalValue, desa: '' }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));

    if (name === 'tanggal_lahir' && value) {
      const birthDate = new Date(value);
      const today = new Date();
      if (birthDate > today) {
        setErrors(prev => ({ ...prev, tanggal_lahir: 'Tanggal lahir tidak boleh di masa depan' }));
        return;
      }
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
      setFormData(prev => ({ ...prev, umur: adjustedAge.toString() }));
    }
  };

  const handleScheduleChange = (e) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    setScheduleData(prev => ({ ...prev, [name]: value }));
  };

  const buildAlamatLengkap = () => {
    const parts = [
      formData.alamat_detail,
      formData.desa ? `Desa/Kel. ${formData.desa}` : '',
      formData.kecamatan ? `Kec. ${formData.kecamatan}` : '',
      formData.kabupaten || '',
      formData.provinsi || '',
    ].filter(Boolean);
    return parts.join(', ');
  };

  const validatePatientData = () => {
    const newErrors = {};
    if (!formData.nama_lengkap.trim()) newErrors.nama_lengkap = 'Nama lengkap wajib diisi';
    if (!formData.jenis_kelamin) newErrors.jenis_kelamin = 'Jenis kelamin wajib dipilih';
    if (!formData.no_wa.trim()) newErrors.no_wa = 'Nomor WhatsApp wajib diisi';

    if (formData.no_wa) {
      const phoneRegex = /^(08|62|\+62)[0-9]{8,12}$/;
      if (!phoneRegex.test(formData.no_wa.replace(/[\s-]/g, '')))
        newErrors.no_wa = 'Format nomor WhatsApp tidak valid (contoh: 08123456789)';
    }
    if (formData.no_telepon) {
      const phoneRegex = /^(08|62|\+62|0)[0-9]{8,12}$/;
      if (!phoneRegex.test(formData.no_telepon.replace(/[\s-]/g, '')))
        newErrors.no_telepon = 'Format nomor telepon tidak valid';
    }
    if (formData.tanggal_lahir) {
      const birthDate = new Date(formData.tanggal_lahir);
      if (birthDate > new Date()) newErrors.tanggal_lahir = 'Tanggal lahir tidak boleh di masa depan';
    }
    if (formData.umur && (formData.umur < 0 || formData.umur > 150)) newErrors.umur = 'Umur tidak valid';
    if (formData.berat_badan && (formData.berat_badan < 1 || formData.berat_badan > 300)) newErrors.berat_badan = 'Berat badan tidak valid';
    if (formData.tinggi_badan && (formData.tinggi_badan < 10 || formData.tinggi_badan > 300)) newErrors.tinggi_badan = 'Tinggi badan tidak valid';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setCurrentStep(1); // Redirect to Step 1 if validation fails
      toast.error('Mohon lengkapi data biodata wajib dengan benar.');
      return false;
    }
    return true;
  };

  const validateScheduleData = () => {
    const newErrors = {};
    if (!scheduleData.tanggal_kunjungan) newErrors.tanggal_kunjungan = 'Tanggal kunjungan wajib diisi';
    if (!scheduleData.jam_kunjungan) newErrors.jam_kunjungan = 'Waktu kunjungan wajib diisi';
    if (!scheduleData.dokter_id) newErrors.dokter_id = 'Dokter wajib dipilih';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Mohon lengkapi jadwal kunjungan dengan benar');
      return false;
    }
    return true;
  };

  const handleStepClick = (step) => {
    if (registeredPatientData) {
      // If patient is already registered, they can only be on step 3 (Penjadwalan)
      if (step === 3) setCurrentStep(3);
      return;
    }

    if (step < currentStep) {
      setCurrentStep(step);
    } else if (step > currentStep) {
      if (step === 2 && !validatePatientData()) return;
      if (step === 3 && !validatePatientData()) return;
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (validatePatientData()) {
        setCurrentStep(2);
      }
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Step 2 Submission (Register Patient)
  const handleRegisterPatient = async (wantsToSchedule) => {
    if (!validatePatientData()) return;
    setLoading(true);
    setIsDaftarDanJadwalkan(wantsToSchedule);

    try {
      const pekerjaanFinal = formData.pekerjaan === 'Lainnya' ? (pekerjaanLainnya.trim() || 'Lainnya') : formData.pekerjaan;
      const alamatLengkap = buildAlamatLengkap() || formData.alamat_detail;
      const { ...restForm } = formData;

      const dataToSend = {
        ...restForm,
        pekerjaan: pekerjaanFinal,
        alamat: alamatLengkap,
        umur: restForm.umur !== '' && restForm.umur !== null && restForm.umur !== undefined ? parseInt(restForm.umur, 10) || null : null,
        berat_badan: restForm.berat_badan !== '' && restForm.berat_badan !== null && restForm.berat_badan !== undefined ? parseFloat(restForm.berat_badan) || null : null,
        tinggi_badan: restForm.tinggi_badan !== '' && restForm.tinggi_badan !== null && restForm.tinggi_badan !== undefined ? parseFloat(restForm.tinggi_badan) || null : null,
        wa_consent: restForm.wa_consent === true,
      };

      const { success: patientSuccess, data: patientData, error: patientError } = await patientService.createPatient(dataToSend);
      if (!patientSuccess) throw new Error(patientError || 'Gagal mendaftarkan pasien');

      if (photoFile && patientData?.id) {
        try {
          await storageService.uploadPatientPhoto(patientData.id, photoFile);
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr);
        }
      }

      setRegisteredPatientData({
        id: patientData.id,
        nama_lengkap: patientData.nama_lengkap,
        no_rm: patientData.no_rm
      });

      setSuccessModalData({
        nama_lengkap: patientData.nama_lengkap,
        no_rm: patientData.no_rm
      });
    } catch (err) {
      setErrorModalMsg(err.message || 'Terjadi kesalahan saat mendaftarkan pasien.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 Submission (Save Schedule)
  const handleSaveSchedule = async () => {
    if (!validateScheduleData()) return;
    if (!registeredPatientData) {
      toast.error('Data pasien tidak ditemukan.');
      return;
    }

    setLoading(true);
    try {
      const selectedDoctor = doctors.find(d => d.id === scheduleData.dokter_id);
      const doctorName = selectedDoctor ? selectedDoctor.full_name : 'Dokter';

      const visitPayload = {
        patient_id: registeredPatientData.id,
        tanggal_kunjungan: scheduleData.tanggal_kunjungan,
        jam_kunjungan: scheduleData.jam_kunjungan || null,
        keluhan: scheduleData.keluhan || formData.keluhan_awal || 'Kunjungan pertama',
        status: 'scheduled',
        catatan_dokter: scheduleData.catatan,
        dokter_id: scheduleData.dokter_id || null,
      };

      const { success: visitSuccess, error: visitError } = await visitService.createVisit(visitPayload);
      if (!visitSuccess) throw new Error(visitError || 'Gagal membuat jadwal kunjungan');

      setScheduleSuccessModalData({
        tanggal_kunjungan: scheduleData.tanggal_kunjungan,
        waktu_kunjungan: scheduleData.jam_kunjungan,
        dokter_name: doctorName
      });
    } catch (err) {
      toast.error('Gagal membuat jadwal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRegistration = () => {
    setSuccessModalData(null);
    if (isDaftarDanJadwalkan) {
      setCurrentStep(3);
    } else {
      handleReset();
      navigate('/pasien');
    }
  };

  const handleConfirmSchedule = () => {
    setScheduleSuccessModalData(null);
    handleReset();
    navigate('/pasien');
  };

  const handleReset = () => {
    setFormData({
      nama_lengkap:'',nama_kk:'',tempat_lahir:'',tanggal_lahir:'',jenis_kelamin:'',umur:'',
      agama:'',pendidikan_terakhir:'',pekerjaan:'',status_pernikahan:'',jaminan_kesehatan:'',
      golongan_darah:'',alamat_detail:'',provinsi:'',kabupaten:'',kecamatan:'',desa:'',
      no_wa:'',no_telepon:'',dokter_keluarga:'',dokter_gigi_keluarga:'',rujukan_dari:'',
      berat_badan:'',tinggi_badan:'',keluhan_awal:'',
    });
    setPekerjaanLainnya('');
    setScheduleData({ tanggal_kunjungan: new Date().toISOString().split('T')[0], jam_kunjungan:'', keluhan:'', catatan:'', dokter_id:'' });
    setErrors({});
    setRegisteredPatientData(null);
    setIsDaftarDanJadwalkan(false);
    setCurrentStep(1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <UserPlus size={28} className="text-[var(--color-accent)]" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Pendaftaran Pasien</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Isi form di bawah untuk mendaftarkan pasien baru ke sistem</p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-xl flex gap-1 border border-gray-200/50 dark:border-gray-700/50 shadow-inner">
          <button
            onClick={() => { setRegistrationMode('baru'); handleReset(); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              registrationMode === 'baru' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Pasien Baru
          </button>
          <button
            onClick={() => { setRegistrationMode('lama'); handleReset(); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              registrationMode === 'lama' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Pasien Lama
          </button>
        </div>
      </div>

      {registrationMode === 'baru' ? (
        <>
          {/* Horizontal Stepper UI */}
          <div className="flex items-center justify-between max-w-xl mx-auto mb-8 bg-white/60 dark:bg-[#14171F]/60 p-4 rounded-2xl border border-gray-200/50 dark:border-gray-800/50">
        {[
          { step: 1, title: 'Identitas & Jaminan', subtitle: 'Biodata dasar' },
          { step: 2, title: 'Alamat Domisili', subtitle: 'Wilayah tinggal' },
          { step: 3, title: 'Klinik & Jadwal', subtitle: 'Dokter & keluhan' }
        ].map((s) => (
          <React.Fragment key={s.step}>
            {s.step > 1 && (
              <div className={`flex-1 h-[2px] mx-3 transition-colors duration-300 ${
                currentStep >= s.step ? 'bg-[var(--color-accent)]' : 'bg-gray-250 dark:bg-gray-800'
              }`} />
            )}
            <button
              type="button"
              disabled={registeredPatientData && s.step !== 3}
              onClick={() => handleStepClick(s.step)}
              className="flex items-center gap-2.5 focus:outline-none group text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                currentStep === s.step
                  ? 'bg-[var(--color-accent)] text-white ring-4 ring-[var(--color-accent)]/15 scale-105'
                  : currentStep > s.step
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-850 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
              }`}>
                {currentStep > s.step ? '✓' : s.step}
              </div>
              <div className="hidden sm:block">
                <p className={`text-xs font-bold transition-colors ${
                  currentStep === s.step ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                }`}>{s.title}</p>
                <p className="text-[10px] text-gray-450 dark:text-gray-500 font-medium leading-none mt-0.5">{s.subtitle}</p>
              </div>
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="space-y-6">

        {/* STEP 1: DATA DIRI & KONTAK */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">Data Diri Pasien</h2>

              <div className="flex justify-center mb-8">
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Foto Profil (Opsional)</label>
                  <PhotoUpload
                    patientId={null}
                    currentUrl={photoPreviewUrl}
                    name={formData.nama_lengkap}
                    gender={formData.jenis_kelamin}
                    onUploadSuccess={(file, blobUrl) => { setPhotoFile(file); setPhotoPreviewUrl(blobUrl); }}
                    onDeleteSuccess={() => { setPhotoFile(null); setPhotoPreviewUrl(null); }}
                    readOnly={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input type="text" name="nama_lengkap" value={formData.nama_lengkap}
                    onChange={handleChange} disabled={loading}
                    className={`glass-input w-full px-4 py-2.5 rounded-xl ${errors.nama_lengkap ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    placeholder="Nama lengkap sesuai KTP" />
                  {errors.nama_lengkap && <p className="text-red-500 text-xs mt-1.5">{errors.nama_lengkap}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nama Kepala Keluarga</label>
                  <input type="text" name="nama_kk" value={formData.nama_kk}
                    onChange={handleChange} disabled={loading}
                    className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Nama kepala keluarga" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Jenis Kelamin <span className="text-red-500">*</span></label>
                  <select name="jenis_kelamin" value={formData.jenis_kelamin}
                    onChange={handleChange} disabled={loading}
                    className={`glass-input w-full px-4 py-2.5 rounded-xl appearance-none ${errors.jenis_kelamin ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                    <option value="">Pilih jenis kelamin</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                  {errors.jenis_kelamin && <p className="text-red-500 text-xs mt-1.5">{errors.jenis_kelamin}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tempat Lahir</label>
                  <input type="text" name="tempat_lahir" value={formData.tempat_lahir}
                    onChange={handleChange} disabled={loading}
                    className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Kota/Kabupaten" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tanggal Lahir</label>
                  <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir}
                    onChange={handleChange} disabled={loading}
                    max={new Date().toISOString().split('T')[0]}
                    className={`glass-input w-full px-4 py-2.5 rounded-xl ${errors.tanggal_lahir ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                  {errors.tanggal_lahir && <p className="text-red-500 text-xs mt-1.5">{errors.tanggal_lahir}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Umur (tahun)</label>
                  <input type="number" name="umur" value={formData.umur}
                    onChange={handleChange} disabled={loading}
                    className={`glass-input w-full px-4 py-2.5 rounded-xl ${errors.umur ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    placeholder="Otomatis dari tanggal lahir" min="0" max="150" />
                  {errors.umur && <p className="text-red-500 text-xs mt-1.5">{errors.umur}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Agama</label>
                  <select name="agama" value={formData.agama}
                    onChange={handleChange} disabled={loading} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih agama</option>
                    {AGAMA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status Pernikahan</label>
                  <select name="status_pernikahan" value={formData.status_pernikahan}
                    onChange={handleChange} disabled={loading} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih status</option>
                    <option value="Belum Menikah">Belum Menikah</option>
                    <option value="Menikah">Menikah</option>
                    <option value="Duda/Janda">Duda/Janda</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pendidikan Terakhir</label>
                  <select name="pendidikan_terakhir" value={formData.pendidikan_terakhir}
                    onChange={handleChange} disabled={loading} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih pendidikan</option>
                    {PENDIDIKAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pekerjaan</label>
                  <select name="pekerjaan" value={formData.pekerjaan}
                    onChange={handleChange} disabled={loading} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih pekerjaan</option>
                    {PEKERJAAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {formData.pekerjaan === 'Lainnya' && (
                    <input type="text" value={pekerjaanLainnya}
                      onChange={e => setPekerjaanLainnya(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-xl mt-2" placeholder="Sebutkan pekerjaan..." disabled={loading} />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Golongan Darah</label>
                  <select name="golongan_darah" value={formData.golongan_darah}
                    onChange={handleChange} disabled={loading} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih golongan darah</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Berat Badan (kg)</label>
                  <input type="number" name="berat_badan" value={formData.berat_badan}
                    onChange={handleChange} disabled={loading}
                    className={`glass-input w-full px-4 py-2.5 rounded-xl ${errors.berat_badan ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    placeholder="kg" min="1" max="300" step="0.1" />
                  {errors.berat_badan && <p className="text-red-500 text-xs mt-1.5">{errors.berat_badan}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tinggi Badan (cm)</label>
                  <input type="number" name="tinggi_badan" value={formData.tinggi_badan}
                    onChange={handleChange} disabled={loading}
                    className={`glass-input w-full px-4 py-2.5 rounded-xl ${errors.tinggi_badan ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    placeholder="cm" min="10" max="300" step="0.1" />
                  {errors.tinggi_badan && <p className="text-red-500 text-xs mt-1.5">{errors.tinggi_badan}</p>}
                </div>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">Kontak & Jaminan Kesehatan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">No. WhatsApp <span className="text-red-500">*</span></label>
                  <input type="tel" name="no_wa" value={formData.no_wa}
                    onChange={handleChange} disabled={loading}
                    className={`glass-input w-full px-4 py-2.5 rounded-xl ${errors.no_wa ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    placeholder="08xxxxxxxxxx" />
                  {errors.no_wa && <p className="text-red-500 text-xs mt-1.5">{errors.no_wa}</p>}
                  
                  <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-800 rounded-xl">
                    <input 
                      type="checkbox" 
                      id="wa_consent" 
                      name="wa_consent"
                      checked={formData.wa_consent} 
                      onChange={handleChange}
                      className="mt-1 shrink-0 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="wa_consent" className="text-xs text-blue-800 dark:text-blue-300 cursor-pointer leading-tight">
                      Pasien setuju menerima notifikasi WhatsApp (resi pembayaran, edukasi perawatan, dan pengingat jadwal)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">No. Telepon Lain</label>
                  <input type="tel" name="no_telepon" value={formData.no_telepon}
                    onChange={handleChange} disabled={loading}
                    className={`glass-input w-full px-4 py-2.5 rounded-xl ${errors.no_telepon ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    placeholder="Nomor alternatif" />
                  {errors.no_telepon && <p className="text-red-500 text-xs mt-1.5">{errors.no_telepon}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Jaminan Kesehatan</label>
                  <select name="jaminan_kesehatan" value={formData.jaminan_kesehatan}
                    onChange={handleChange} disabled={loading} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih jaminan</option>
                    <option value="BPJS">BPJS</option>
                    <option value="Asuransi Swasta">Asuransi Swasta</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ALAMAT DOMISILI */}
        {currentStep === 2 && (
          <div className="glass-panel p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">Alamat Domisili</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Provinsi</label>
                <select name="provinsi" value={formData.provinsi}
                  onChange={handleChange} disabled={loading} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                  <option value="">Pilih provinsi</option>
                  {PROVINSI.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kabupaten / Kota</label>
                <select name="kabupaten" value={formData.kabupaten}
                  onChange={handleChange} disabled={loading || !formData.provinsi} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                  <option value="">{formData.provinsi ? 'Pilih kabupaten/kota' : 'Pilih provinsi dahulu'}</option>
                  {kabupatenList.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                {formData.provinsi && kabupatenList.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5">Ketik manual di kolom detail alamat jika tidak tersedia</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kecamatan</label>
                {kecamatanList.length > 0 ? (
                  <select name="kecamatan" value={formData.kecamatan}
                    onChange={handleChange} disabled={loading || !formData.kabupaten} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih kecamatan</option>
                    {kecamatanList.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                ) : (
                  <input type="text" name="kecamatan" value={formData.kecamatan}
                    onChange={handleChange} disabled={loading}
                    className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Ketik nama kecamatan" />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Desa / Kelurahan</label>
                {desaList.length > 0 ? (
                  <select name="desa" value={formData.desa}
                    onChange={handleChange} disabled={loading || !formData.kecamatan} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih desa/kelurahan</option>
                    {desaList.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <input type="text" name="desa" value={formData.desa}
                    onChange={handleChange} disabled={loading}
                    className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Ketik nama desa/kelurahan" />
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Alamat Detail (Jalan / RT / RW / No. Rumah)</label>
                <textarea name="alamat_detail" value={formData.alamat_detail}
                  onChange={handleChange} disabled={loading}
                  className="glass-input w-full px-4 py-2.5 rounded-xl resize-none" rows="3"
                  placeholder="Contoh: Jl. Merdeka No. 10 RT 05/RW 02" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DOKTER, RUJUKAN, KELUHAN & JADWAL */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-scale-in">
            {registeredPatientData && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl mb-2 flex items-center gap-3">
                <CheckCircle className="text-emerald-500" size={24} />
                <div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Menjadwalkan Pasien Baru:</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{registeredPatientData.nama_lengkap} ({registeredPatientData.no_rm})</p>
                </div>
              </div>
            )}

            <div className="glass-panel p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">Dokter Keluarga & Rujukan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Dokter Keluarga</label>
                  <input type="text" name="dokter_keluarga" value={formData.dokter_keluarga}
                    onChange={handleChange} disabled={loading}
                    className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Nama dokter keluarga (opsional)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Dokter Gigi Keluarga</label>
                  <input type="text" name="dokter_gigi_keluarga" value={formData.dokter_gigi_keluarga}
                    onChange={handleChange} disabled={loading}
                    className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Nama dokter gigi keluarga (opsional)" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rujukan Dari</label>
                  <input type="text" name="rujukan_dari" value={formData.rujukan_dari}
                    onChange={handleChange} disabled={loading}
                    className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Nama klinik/dokter perujuk (kosongkan jika tidak ada)" />
                </div>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">Keluhan Awal</h2>
              <textarea name="keluhan_awal" value={formData.keluhan_awal}
                onChange={handleChange} disabled={loading}
                className="glass-input w-full px-4 py-2.5 rounded-xl resize-none" rows="3"
                placeholder="Keluhan yang dirasakan pasien saat ini" />
            </div>

            <div className="glass-panel p-6 border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white cursor-pointer flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[var(--color-accent)]" />
                Jadwal Kunjungan Pertama
              </h2>
              <p className="text-sm text-gray-650 dark:text-gray-400 mt-1 mb-6 border-b border-blue-100 dark:border-blue-900/20 pb-3">Tentukan hari, jam, dan dokter gigi pemeriksa jadwal ini.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tanggal Kunjungan <span className="text-red-500">*</span></label>
                  <input type="date" name="tanggal_kunjungan" value={scheduleData.tanggal_kunjungan}
                    onChange={handleScheduleChange} disabled={loading}
                    min={new Date().toISOString().split('T')[0]}
                    className={`glass-input w-full px-4 py-2.5 rounded-xl ${errors.tanggal_kunjungan ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                  {errors.tanggal_kunjungan && <p className="text-red-500 text-xs mt-1.5">{errors.tanggal_kunjungan}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Waktu Kunjungan <span className="text-red-500">*</span></label>
                  <input type="time" name="jam_kunjungan" value={scheduleData.jam_kunjungan}
                    onChange={handleScheduleChange} disabled={loading}
                    className={`glass-input w-full px-4 py-2.5 rounded-xl ${errors.jam_kunjungan ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                  {errors.jam_kunjungan && <p className="text-red-500 text-xs mt-1.5">{errors.jam_kunjungan}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Dokter Pemeriksa <span className="text-red-500">*</span></label>
                  <select
                    name="dokter_id"
                    value={scheduleData.dokter_id}
                    onChange={handleScheduleChange}
                    disabled={loading}
                    className={`glass-input w-full px-4 py-2.5 rounded-xl appearance-none ${errors.dokter_id ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  >
                    <option value="">-- Pilih Dokter --</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.full_name}</option>
                    ))}
                  </select>
                  {errors.dokter_id && <p className="text-red-500 text-xs mt-1.5">{errors.dokter_id}</p>}
                  {doctors.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">Tidak ada dokter aktif ditemukan. Periksa pengaturan akun dokter.</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Keluhan Kunjungan (Opsional)</label>
                  <input type="text" name="keluhan" value={scheduleData.keluhan}
                    onChange={handleScheduleChange} disabled={loading} className="glass-input w-full px-4 py-2.5 rounded-xl"
                    placeholder="Keluhan spesifik untuk kunjungan ini (akan menggunakan keluhan awal jika kosong)" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Catatan Tambahan (Opsional)</label>
                  <textarea name="catatan" value={scheduleData.catatan}
                    onChange={handleScheduleChange} disabled={loading}
                    className="glass-input w-full px-4 py-2.5 rounded-xl resize-none" rows="2" placeholder="Catatan opsional untuk jadwal rujukan" />
                </div>
              </div>
              <div className="mt-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-start gap-2 text-sm text-[var(--color-accent)]">
                  <Clock className="w-5 h-5 flex-shrink-0" />
                  <p>Jadwal kunjungan pertama pasien akan ditandai dengan status "Terjadwal" dan masuk ke antrean klinik.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Buttons / Stepper Control Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {currentStep === 1 && (
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-sm"
              disabled={loading}
            >
              Reset Form
            </button>
          )}
          {currentStep === 2 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-5 py-2.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
            >
              ← Kembali
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              handleReset();
              navigate('/pasien');
            }}
            className="px-5 py-2.5 rounded-xl font-semibold text-gray-550 hover:text-gray-700 dark:text-gray-450 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
          >
            Batal
          </button>

          {currentStep === 1 && (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] transition-colors shadow-sm"
            >
              Lanjutkan →
            </button>
          )}

          {currentStep === 2 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleRegisterPatient(false)}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-250 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
              >
                {loading && !isDaftarDanJadwalkan ? 'Mendaftar...' : 'Daftar Pasien'}
              </button>
              <button
                type="button"
                onClick={() => handleRegisterPatient(true)}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] transition-colors shadow-sm flex items-center gap-2"
              >
                {loading && isDaftarDanJadwalkan ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
                ) : (
                  <><Save size={18} /> Daftar & Jadwalkan</>
                )}
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
              ) : (
                <><Save size={18} /> Simpan Jadwal</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {successModalData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="bg-emerald-500 px-6 py-4">
              <h2 className="text-white text-lg font-bold text-center">Pendaftaran Berhasil</h2>
            </div>
            <div className="p-6 space-y-6 text-center">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Nama Pasien</p>
                <p className="text-xl font-bold text-gray-900">{successModalData.nama_lengkap}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Nomor RM</p>
                <p className="font-mono text-lg font-bold text-[var(--color-accent)]">{successModalData.no_rm}</p>
              </div>
              <button
                type="button"
                onClick={handleConfirmRegistration}
                className="w-full py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                {isDaftarDanJadwalkan ? 'Lanjut ke Penjadwalan →' : 'Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}

      {scheduleSuccessModalData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="bg-emerald-500 px-6 py-4">
              <h2 className="text-white text-lg font-bold text-center">Pasien Berhasil Dijadwalkan</h2>
            </div>
            <div className="p-6 space-y-6 text-center">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Dokter Gigi Pemeriksa</p>
                <p className="text-xl font-bold text-gray-900">{scheduleSuccessModalData.dokter_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-left">
                <div>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Tanggal</p>
                  <p className="font-semibold text-gray-900 text-sm">{scheduleSuccessModalData.tanggal_kunjungan}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Jam</p>
                  <p className="font-semibold text-gray-900 text-sm">{scheduleSuccessModalData.waktu_kunjungan} WIB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConfirmSchedule}
                className="w-full py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {errorModalMsg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-500 px-6 py-4">
              <h2 className="text-white text-lg font-bold text-center">Pendaftaran Gagal</h2>
            </div>
            <div className="p-6 space-y-6 text-center">
              <div className="text-gray-700 font-medium">
                {errorModalMsg}
              </div>
              <button
                type="button"
                onClick={() => setErrorModalMsg(null)}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientRegistration;
