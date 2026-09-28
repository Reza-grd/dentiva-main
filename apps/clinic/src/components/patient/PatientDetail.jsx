import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import ScheduleVisitForm from './ScheduleVisitForm';
import LoadingSpinner from '../common/LoadingSpinner';
import PhotoUpload from '../common/PhotoUpload';
import { patientService } from '../../services/patientService';
import { visitService } from '../../services/visitService';
import { consentService } from '../../services/consentService';
import { satusehatService } from '../../services/satusehatService';
import { pdpService } from '../../services/pdpService';
import { generatePDPAccessPDF } from '../../utils/pdpExportPdfGenerator';
import { User, Edit, Save, X, Calendar, FileText, AlertCircle, ChevronLeft, Shield, Loader, Database, Download, Clock, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/ToastNotification';
import { PROVINSI, getKabupatenByProvinsi, getKecamatanByKabupaten, getDesaByKecamatan } from '../../utils/wilayahIndonesia';

const AGAMA_OPTIONS = ['Islam','Kristen','Katolik','Hindu','Budha','Konghucu'];
const PENDIDIKAN_OPTIONS = ['SD','SLTP','SLTA','D3','S1','Sp/S2','S3'];
const PEKERJAAN_OPTIONS = ['PNS','TNI/POLRI','Swasta','Pensiunan','Lainnya'];

const PatientDetail = () => {
  const { patientId } = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [error, setError] = useState('');
  const [editForm, setEditForm] = useState({});
  const [pekerjaanLainnya, setPekerjaanLainnya] = useState('');
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const role = userProfile?.role;

  const [kabupatenList, setKabupatenList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);

  const [allDoctors, setAllDoctors] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    tanggal_kunjungan: new Date().toISOString().split('T')[0],
    jam_kunjungan: '',
    dokter_id: '',
    keluhan: '',
  });
  const [schedulingVisit, setSchedulingVisit] = useState(false);
  const [satusehatConsent, setSatusehatConsent] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [syncingPatient, setSyncingPatient] = useState(false);

  // UU PDP & Permenkes 24/2022 States
  const [pdpRequests, setPdpRequests] = useState([]);
  const [retentionInfo, setRetentionInfo] = useState({ isExpired: false, label: 'Aktif' });
  const [showPdpModal, setShowPdpModal] = useState(false);
  const [pdpForm, setPdpForm] = useState({ requestType: 'access', notes: '' });
  const [submittingPdp, setSubmittingPdp] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      const res = await visitService.getAllDoctors();
      if (res.success) setAllDoctors(res.data || []);
    };
    fetchDoctors();
  }, []);

  useEffect(() => { loadPatientData(); }, [patientId]);

  useEffect(() => {
    if (editForm.provinsi) setKabupatenList(getKabupatenByProvinsi(editForm.provinsi));
    else setKabupatenList([]);
  }, [editForm.provinsi]);

  useEffect(() => {
    if (editForm.kabupaten) setKecamatanList(getKecamatanByKabupaten(editForm.kabupaten));
    else setKecamatanList([]);
  }, [editForm.kabupaten]);

  useEffect(() => {
    if (editForm.kecamatan) setDesaList(getDesaByKecamatan(editForm.kecamatan));
    else setDesaList([]);
  }, [editForm.kecamatan]);

  const loadPatientData = async () => {
    setLoading(true);
    const patientResult = await patientService.getPatientById(patientId);
    if (patientResult.success) {
      setPatient(patientResult.data);
      setEditForm(patientResult.data);
      if (patientResult.data.pekerjaan && !PEKERJAAN_OPTIONS.includes(patientResult.data.pekerjaan)) {
        setPekerjaanLainnya(patientResult.data.pekerjaan);
        setEditForm(prev => ({ ...prev, pekerjaan: 'Lainnya' }));
      }
      
      // Load SatuSehat consent
      const consentRes = await consentService.getLatestSatuSehatConsent(patientId);
      if (consentRes.success && consentRes.data) {
        setSatusehatConsent(consentRes.data.consent_given);
      } else {
        setSatusehatConsent(false);
      }

      // Load UU PDP Data Subject Requests
      const pdpRes = await pdpService.getDataSubjectRequests(patientId);
      if (pdpRes.success) {
        setPdpRequests(pdpRes.data || []);
      }
    } else {
      setError('Pasien tidak ditemukan');
    }

    const visitsResult = await visitService.getVisitsByPatient(patientId);
    const visitList = visitsResult.success ? (visitsResult.data || []) : [];
    if (visitsResult.success) setVisits(visitList);

    // Permenkes 24/2022 Retention Audit Check
    const lastVisitDate = visitList.length > 0 ? visitList[0].tanggal_kunjungan : null;
    const rInfo = pdpService.checkRetentionStatus(lastVisitDate, 5);
    setRetentionInfo(rInfo);

    setLoading(false);
  };

  const handleCreatePDPRequest = async (e) => {
    e.preventDefault();
    setSubmittingPdp(true);
    try {
      const res = await pdpService.createDataSubjectRequest({
        clinicId: userProfile?.clinic_id,
        patientId: patientId,
        requestType: pdpForm.requestType,
        notes: pdpForm.notes
      });
      if (res.success) {
        toast.success('Permintaan Subjek Data (UU PDP) berhasil dicatat!');
        setShowPdpModal(false);
        setPdpForm({ requestType: 'access', notes: '' });
        
        const pdpRes = await pdpService.getDataSubjectRequests(patientId);
        if (pdpRes.success) setPdpRequests(pdpRes.data || []);

        if (pdpForm.requestType === 'access') {
          generatePDPAccessPDF(patient, visits, { nama_klinik: userProfile?.clinic_name });
        }
      } else {
        toast.error('Gagal mencatat permintaan: ' + res.error);
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSubmittingPdp(false);
    }
  };

  const handleExportPDPPdf = () => {
    generatePDPAccessPDF(patient, visits, { nama_klinik: userProfile?.clinic_name });
    toast.success('Berkas Hak Akses Subjek Data PDF berhasil diunduh!');
  };

  const handleSatuSehatConsentChange = async (e) => {
    const val = e.target.checked;
    setSavingConsent(true);
    const res = await consentService.saveSatuSehatConsent(patientId, val, 'Diperbarui dari dashboard profil pasien');
    if (res.success) {
      setSatusehatConsent(val);
      toast.success(val ? 'Persetujuan integrasi SatuSehat diaktifkan' : 'Persetujuan integrasi SatuSehat dinonaktifkan');
    } else {
      toast.error('Gagal memperbarui persetujuan SatuSehat: ' + res.error);
    }
    setSavingConsent(false);
  };

  const handleSyncPatient = async () => {
    setSyncingPatient(true);
    try {
      const res = await satusehatService.syncPatient(patientId);
      if (res.success) {
        toast.success('Penyelarasan SatuSehat Patient Berhasil!');
        await loadPatientData(); // Reload patient data to reflect new ID/sync date
      } else {
        toast.error('Gagal menyelaraskan: ' + res.error);
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSyncingPatient(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    if (name === 'provinsi') {
      setEditForm(prev => ({ ...prev, provinsi: finalValue, kabupaten: '', kecamatan: '', desa: '' }));
    } else if (name === 'kabupaten') {
      setEditForm(prev => ({ ...prev, kabupaten: finalValue, kecamatan: '', desa: '' }));
    } else if (name === 'kecamatan') {
      setEditForm(prev => ({ ...prev, kecamatan: finalValue, desa: '' }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const handleSave = async () => {
    setError('');
    const idJenis = editForm.identitas_alternatif_jenis || 'NIK';
    if (idJenis === 'NIK') {
      const nikClean = (editForm.nik || '').trim();
      if (!nikClean) {
        setError('NIK wajib diisi');
        return;
      } else if (!/^\d{16}$/.test(nikClean)) {
        setError('NIK harus berupa 16 digit angka');
        return;
      }
    } else if (idJenis === 'NIK_IBU') {
      const nikIbuClean = (editForm.nik_ibu || '').trim();
      const nikClean = (editForm.nik || '').trim();
      if (!nikIbuClean) {
        setError('NIK Ibu wajib diisi');
        return;
      } else if (!/^\d{16}$/.test(nikIbuClean)) {
        setError('NIK Ibu harus berupa 16 digit angka');
        return;
      }
      if (nikClean && !/^\d{16}$/.test(nikClean)) {
        setError('NIK Bayi harus berupa 16 digit angka');
        return;
      }
    } else {
      const nikClean = (editForm.nik || '').trim();
      if (!nikClean) {
        setError('Nomor identitas alternatif wajib diisi');
        return;
      }
    }

    setSaving(true);
    const { foto_profile, ...dataToUpdate } = editForm;
    if (dataToUpdate.pekerjaan === 'Lainnya') {
      dataToUpdate.pekerjaan = pekerjaanLainnya.trim() || 'Lainnya';
    }
    dataToUpdate.umur = dataToUpdate.umur !== '' && dataToUpdate.umur !== null && dataToUpdate.umur !== undefined
      ? parseInt(dataToUpdate.umur, 10) || null
      : null;
    dataToUpdate.berat_badan = dataToUpdate.berat_badan !== '' && dataToUpdate.berat_badan !== null && dataToUpdate.berat_badan !== undefined
      ? parseFloat(dataToUpdate.berat_badan) || null
      : null;
    dataToUpdate.tinggi_badan = dataToUpdate.tinggi_badan !== '' && dataToUpdate.tinggi_badan !== null && dataToUpdate.tinggi_badan !== undefined
      ? parseFloat(dataToUpdate.tinggi_badan) || null
      : null;
    const { success, error: updateError } = await patientService.updatePatient(patientId, dataToUpdate);
    if (success) {
      setPatient(prev => ({ ...prev, ...dataToUpdate }));
      setEditing(false);
    } else {
      setError(updateError || 'Gagal menyimpan perubahan');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setEditForm(patient);
    setEditing(false);
    setError('');
    if (patient.pekerjaan && !PEKERJAAN_OPTIONS.includes(patient.pekerjaan)) {
      setPekerjaanLainnya(patient.pekerjaan);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.tanggal_kunjungan) {
      toast.error('Tanggal kunjungan wajib diisi');
      return;
    }
    if (!scheduleForm.dokter_id) {
      toast.error('Pilih dokter terlebih dahulu');
      return;
    }
    
    setSchedulingVisit(true);
    try {
      const res = await visitService.createVisit({
        patient_id: patientId,
        tanggal_kunjungan: scheduleForm.tanggal_kunjungan,
        jam_kunjungan: scheduleForm.jam_kunjungan ? scheduleForm.jam_kunjungan + ':00' : null,
        dokter_id: scheduleForm.dokter_id,
        keluhan: scheduleForm.keluhan,
        status: 'scheduled'
      });
      
      if (res.success) {
        toast.success('Kunjungan ulang berhasil dijadwalkan!');
        setShowScheduleModal(false);
        setScheduleForm({
          tanggal_kunjungan: new Date().toISOString().split('T')[0],
          jam_kunjungan: '',
          dokter_id: '',
          keluhan: '',
        });
        // Reload visits
        const visitsResult = await visitService.getVisitsByPatient(patientId);
        if (visitsResult.success) setVisits(visitsResult.data || []);
      } else {
        toast.error(res.error || 'Gagal menjadwalkan kunjungan');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menjadwalkan kunjungan');
    } finally {
      setSchedulingVisit(false);
    }
  };

  const handlePhotoUploadSuccess = (path) => setPatient(prev => ({ ...prev, foto_profile: path }));
  const handlePhotoDeleteSuccess = () => setPatient(prev => ({ ...prev, foto_profile: null }));

  if (loading) return <div className="py-20 flex justify-center"><LoadingSpinner /></div>;

  if (error && !patient) return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="glass-panel text-center py-12">
        <AlertCircle className="mx-auto text-rose-500 mb-4 opacity-80" size={64} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pasien Tidak Ditemukan</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
        <button onClick={() => navigate('/pasien')} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors">Kembali ke Daftar Pasien</button>
      </div>
    </div>
  );

  const fieldView = (label, value) => (
    <div className="bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</label>
      <p className="font-semibold text-gray-900 dark:text-white text-base">{value || '-'}</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/pasien')}
            className="p-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
              <User size={24} className="text-[var(--color-accent)]" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Detail Pasien</h1>
          </div>
        </div>
        {(role === 'admin' || role === 'resepsionis') && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={handleCancel} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm" disabled={saving}>
                  <X size={16} /> Batal
                </button>
                <button onClick={handleSave} className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm" disabled={saving}>
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Save size={16} /> Simpan</>
                  )}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm">
                <Edit size={16} /> Edit Data
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border-l-4 border-rose-500 rounded-r-xl text-rose-700 dark:text-rose-400 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Foto + Info Singkat */}
          <div className="glass-panel p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)]/5 rounded-bl-full -z-10"></div>
            <PhotoUpload patientId={patientId} currentUrl={patient?.foto_profile}
              name={patient?.nama_lengkap} gender={patient?.jenis_kelamin}
              onUploadSuccess={handlePhotoUploadSuccess} onDeleteSuccess={handlePhotoDeleteSuccess}
              readOnly={!editing} />
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{patient?.nama_lengkap}</h2>
              <p className="text-[var(--color-accent)] font-bold text-xl font-mono mt-1">{patient?.no_rm}</p>
              <div className="flex gap-2 mt-3 flex-wrap justify-center sm:justify-start">
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg">
                  {patient?.jenis_kelamin}
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg">
                  {patient?.umur ? `${patient.umur} tahun` : '-'}
                </span>
                <span className={`px-3 py-1 text-sm font-semibold rounded-lg ${patient?.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
                  {patient?.status === 'active' ? 'Aktif' : 'Non-Aktif'}
                </span>
              </div>
            </div>
          </div>

          {/* Informasi Dasar */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center gap-2">
              <User size={18} className="text-[var(--color-accent)]" /> Informasi Dasar
            </h3>
            
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nama Lengkap</label>
                  <input type="text" name="nama_lengkap" value={editForm.nama_lengkap || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Jenis Identitas</label>
                  <select name="identitas_alternatif_jenis" value={editForm.identitas_alternatif_jenis || 'NIK'} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="NIK">NIK (KTP/KIA)</option>
                    <option value="NIK_IBU">NIK Ibu Kandung (Bayi Baru Lahir)</option>
                    <option value="PASPOR">Paspor (WNA)</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>

                {editForm.identitas_alternatif_jenis === 'NIK_IBU' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">NIK Ibu Kandung</label>
                      <input type="text" name="nik_ibu" value={editForm.nik_ibu || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="16 digit NIK Ibu Kandung" maxLength="16" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">NIK Bayi (Opsional)</label>
                      <input type="text" name="nik" value={editForm.nik || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="16 digit NIK Bayi" maxLength="16" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      {editForm.identitas_alternatif_jenis === 'NIK' ? 'NIK (Nomor Induk Kependudukan)' :
                       editForm.identitas_alternatif_jenis === 'PASPOR' ? 'Nomor Paspor' : 'Nomor Identitas'}
                    </label>
                    <input type="text" name="nik" value={editForm.nik || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder={editForm.identitas_alternatif_jenis === 'NIK' ? '16 digit NIK' : 'Nomor identitas'} maxLength={editForm.identitas_alternatif_jenis === 'NIK' ? "16" : undefined} />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Jenis Kelamin</label>
                  <select name="jenis_kelamin" value={editForm.jenis_kelamin || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Umur</label>
                  <input type="number" name="umur" value={editForm.umur || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tempat Lahir</label>
                  <input type="text" name="tempat_lahir" value={editForm.tempat_lahir || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tanggal Lahir</label>
                  <input type="date" name="tanggal_lahir" value={editForm.tanggal_lahir || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Agama</label>
                  <select name="agama" value={editForm.agama || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih</option>
                    {AGAMA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status Pernikahan</label>
                  <select name="status_pernikahan" value={editForm.status_pernikahan || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih</option>
                    <option value="Belum Menikah">Belum Menikah</option>
                    <option value="Menikah">Menikah</option>
                    <option value="Duda/Janda">Duda/Janda</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Pendidikan Terakhir</label>
                  <select name="pendidikan_terakhir" value={editForm.pendidikan_terakhir || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih</option>
                    {PENDIDIKAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Pekerjaan</label>
                  <select name="pekerjaan" value={editForm.pekerjaan || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih</option>
                    {PEKERJAAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {editForm.pekerjaan === 'Lainnya' && (
                    <input type="text" value={pekerjaanLainnya} onChange={e => setPekerjaanLainnya(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-xl mt-3" placeholder="Sebutkan pekerjaan..." />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Golongan Darah</label>
                  <select name="golongan_darah" value={editForm.golongan_darah || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih</option>
                    <option value="A">A</option><option value="B">B</option>
                    <option value="AB">AB</option><option value="O">O</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Berat Badan</label>
                    <input type="number" name="berat_badan" value={editForm.berat_badan || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="kg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tinggi Badan</label>
                    <input type="number" name="tinggi_badan" value={editForm.tinggi_badan || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="cm" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fieldView('Nama Lengkap', patient?.nama_lengkap)}
                {fieldView('Jenis Identitas', patient?.identitas_alternatif_jenis || 'NIK')}
                {patient?.identitas_alternatif_jenis === 'NIK_IBU' ? (
                  <>
                    {fieldView('NIK Ibu Kandung', patient?.nik_ibu || '-')}
                    {fieldView('NIK Bayi', patient?.nik || '-')}
                  </>
                ) : (
                  fieldView(patient?.identitas_alternatif_jenis === 'PASPOR' ? 'Nomor Paspor' : 'NIK', patient?.nik || '-')
                )}
                {fieldView('Jenis Kelamin', patient?.jenis_kelamin)}
                {fieldView('Umur', patient?.umur ? `${patient.umur} tahun` : '-')}
                {fieldView('Tempat, Tanggal Lahir', `${patient?.tempat_lahir || '-'}, ${patient?.tanggal_lahir ? new Date(patient.tanggal_lahir).toLocaleDateString('id-ID') : '-'}`)}
                {fieldView('Agama', patient?.agama)}
                {fieldView('Status Pernikahan', patient?.status_pernikahan)}
                {fieldView('Pendidikan Terakhir', patient?.pendidikan_terakhir)}
                {fieldView('Pekerjaan', patient?.pekerjaan)}
                {fieldView('Golongan Darah', patient?.golongan_darah)}
                {fieldView('Berat & Tinggi', `${patient?.berat_badan ? `${patient.berat_badan} kg` : '-'} / ${patient?.tinggi_badan ? `${patient.tinggi_badan} cm` : '-'}`)}
              </div>
            )}
          </div>

          {/* Alamat */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-3">Alamat Domisili</h3>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Provinsi</label>
                  <select name="provinsi" value={editForm.provinsi || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih provinsi</option>
                    {PROVINSI.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Kabupaten / Kota</label>
                  <select name="kabupaten" value={editForm.kabupaten || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none" disabled={!editForm.provinsi}>
                    <option value="">Pilih kabupaten/kota</option>
                    {kabupatenList.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Kecamatan</label>
                  {kecamatanList.length > 0 ? (
                    <select name="kecamatan" value={editForm.kecamatan || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                      <option value="">Pilih kecamatan</option>
                      {kecamatanList.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  ) : (
                    <input type="text" name="kecamatan" value={editForm.kecamatan || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Ketik kecamatan" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Desa / Kelurahan</label>
                  {desaList.length > 0 ? (
                    <select name="desa" value={editForm.desa || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                      <option value="">Pilih desa/kelurahan</option>
                      {desaList.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : (
                    <input type="text" name="desa" value={editForm.desa || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Ketik desa/kelurahan" />
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Alamat Detail</label>
                  <textarea name="alamat_detail" value={editForm.alamat_detail || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" rows="2" placeholder="Jalan / RT / RW / No. Rumah" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Alamat Lengkap (Lama / Legacy)</label>
                  <textarea name="alamat" value={editForm.alamat || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl opacity-70" rows="2" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fieldView('Provinsi', patient?.provinsi)}
                {fieldView('Kabupaten / Kota', patient?.kabupaten)}
                {fieldView('Kecamatan', patient?.kecamatan)}
                {fieldView('Desa / Kelurahan', patient?.desa)}
                <div className="sm:col-span-2">{fieldView('Alamat Detail', patient?.alamat_detail || patient?.alamat)}</div>
              </div>
            )}
          </div>

          {/* Kontak & Jaminan */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-3">Kontak & Jaminan Kesehatan</h3>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">No. WhatsApp</label>
                  <input type="tel" name="no_wa" value={editForm.no_wa || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" />
                  
                  <div className="mt-3 flex items-start gap-2">
                    <input 
                      type="checkbox" 
                      id="edit_wa_consent" 
                      name="wa_consent"
                      checked={editForm.wa_consent === true} 
                      onChange={handleEditChange}
                      className="mt-0.5 shrink-0 w-4 h-4 text-[var(--color-accent)] rounded border-gray-300 focus:ring-[var(--color-accent)]"
                    />
                    <label htmlFor="edit_wa_consent" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                      Pasien setuju menerima notifikasi WA otomatis
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">No. Telepon Lain</label>
                  <input type="tel" name="no_telepon" value={editForm.no_telepon || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Jaminan Kesehatan</label>
                  <select name="jaminan_kesehatan" value={editForm.jaminan_kesehatan || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none">
                    <option value="">Pilih</option>
                    <option value="BPJS">BPJS</option>
                    <option value="Asuransi Swasta">Asuransi Swasta</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Rujukan Dari</label>
                  <input type="text" name="rujukan_dari" value={editForm.rujukan_dari || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" placeholder="Nama klinik/dokter perujuk" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  {fieldView('No. WhatsApp', patient?.no_wa)}
                  <div className="mt-1 flex items-center gap-2 px-1">
                    <span className={`w-2 h-2 rounded-full ${patient?.wa_consent ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {patient?.wa_consent ? 'Menerima Notifikasi WA' : 'Menolak Notifikasi WA'}
                    </span>
                  </div>
                </div>
                {fieldView('No. Telepon Lain', patient?.no_telepon)}
                {fieldView('Jaminan Kesehatan', patient?.jaminan_kesehatan)}
                {fieldView('Rujukan Dari', patient?.rujukan_dari)}
              </div>
            )}
          </div>

          {/* Dokter Keluarga */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-3">Dokter Keluarga</h3>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Dokter Keluarga</label>
                  <input type="text" name="dokter_keluarga" value={editForm.dokter_keluarga || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Dokter Gigi Keluarga</label>
                  <input type="text" name="dokter_gigi_keluarga" value={editForm.dokter_gigi_keluarga || ''} onChange={handleEditChange} className="glass-input w-full px-4 py-2.5 rounded-xl" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fieldView('Dokter Keluarga', patient?.dokter_keluarga)}
                {fieldView('Dokter Gigi Keluarga', patient?.dokter_gigi_keluarga)}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Aksi Cepat</h3>
            <div className="space-y-3">
              {role === 'dokter' && (
                <button onClick={() => navigate(`/rekam-medis/${patientId}`)} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white font-bold rounded-xl transition-all shadow-sm active:scale-95">
                  <FileText size={18} /> Buka Rekam Medis
                </button>
              )}
              <button onClick={() => navigate(`/pasien/${patientId}/kunjungan`)} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-all shadow-sm">
                <Calendar size={18} /> Riwayat Kunjungan
              </button>
              <button 
                onClick={() => setShowScheduleModal(true)} 
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold rounded-xl transition-all shadow-sm active:scale-95"
              >
                <Calendar size={18} /> Jadwalkan Kunjungan Ulang
              </button>
            </div>
          </div>

          {/* SatuSehat Integration */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield size={18} className="text-blue-500" /> Integrasi SATUSEHAT
            </h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">Status Sinkronisasi</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${patient?.satusehat_patient_id ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {patient?.satusehat_patient_id ? 'Terhubung (FHIR)' : 'Belum Sinkron'}
                  </span>
                </div>
                {patient?.satusehat_patient_id && (
                  <div className="mt-2 text-[10px] text-gray-500 font-mono select-all">
                    ID: {patient.satusehat_patient_id}
                  </div>
                )}
                {patient?.satusehat_last_synced_at && (
                  <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                    Terakhir sinkron: {new Date(patient.satusehat_last_synced_at).toLocaleString('id-ID')}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="satusehat_consent_checkbox"
                  checked={satusehatConsent}
                  onChange={handleSatuSehatConsentChange}
                  disabled={savingConsent}
                  className="mt-1 w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="satusehat_consent_checkbox" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                    Persetujuan SatuSehat
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Pasien menyetujui pembagian data rekam medis dengan platform SATUSEHAT Kemenkes RI.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSyncPatient}
                disabled={syncingPatient || !satusehatConsent}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!satusehatConsent ? 'Persetujuan SatuSehat wajib diaktifkan terlebih dahulu' : ''}
              >
                {syncingPatient ? <Loader className="animate-spin" size={16} /> : <Shield size={16} />}
                {syncingPatient ? 'Menghubungkan...' : 'Sinkronkan ke SatuSehat'}
              </button>
            </div>
          </div>

          {/* Permenkes 24/2022 Retention & UU PDP Data Subject Rights Panel */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lock size={18} className="text-emerald-500" /> Kepatuhan Retensi & UU PDP
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                retentionInfo.isExpired
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              }`}>
                {retentionInfo.label}
              </span>
            </h3>

            {/* Permenkes Retention Audit Info */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span className="flex items-center gap-1 font-semibold"><Clock size={12} /> Masa Retensi Medis</span>
                <span>{retentionInfo.retentionYears || 5} Tahun</span>
              </div>
              {retentionInfo.isExpired ? (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                  ⚠️ Rekam medis ini telah melewati periode retensi 5 tahun (terakhir kunjungan: {retentionInfo.lastVisitDate}). Ditandai untuk review manual admin.
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Status rekam medis aktif dalam periode penyimpanan retensi wajib Permenkes 24/2022.
                </p>
              )}
            </div>

            {/* UU PDP Data Subject Actions */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-gray-700 dark:text-gray-300">
                <span>Hak Subjek Data (PDP)</span>
                <span className="text-[10px] text-gray-400 font-normal">{pdpRequests.length} Permintaan</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportPDPPdf}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl text-xs transition-all"
                  title="Unduh Berkas Rekam Medis (Hak Akses UU PDP)"
                >
                  <Download size={12} /> Export PDF PDP
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdpModal(true)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 font-bold rounded-xl text-xs transition-all"
                >
                  <FileText size={12} /> Catat Permintaan
                </button>
              </div>

              {/* History of Requests */}
              {pdpRequests.length > 0 && (
                <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {pdpRequests.map(r => (
                    <div key={r.id} className="p-2 bg-gray-50 dark:bg-gray-800/40 rounded-lg text-[11px] flex justify-between items-center border border-gray-100 dark:border-gray-800">
                      <div>
                        <span className="font-bold uppercase text-gray-700 dark:text-gray-300">{r.request_type}</span>
                        {r.notes && <span className="text-gray-400 ml-1 truncate max-w-[120px] inline-block font-normal">({r.notes})</span>}
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
              Kunjungan Terakhir
              <span className="text-xs font-semibold bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-0.5 rounded-full">{visits.length}</span>
            </h3>
            {visits.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Belum ada kunjungan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visits.slice(0, 5).map((visit) => (
                  <div key={visit.id} className="p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-[var(--color-accent)]/30 transition-colors cursor-pointer" onClick={() => navigate(`/pasien/${patientId}/kunjungan`)}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-gray-900 dark:text-white font-mono">
                        {new Date(visit.tanggal_kunjungan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${visit.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800'}`}>
                        {visit.status === 'completed' ? 'Selesai' : 'Ongoing'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 font-medium">{visit.diagnosa || visit.keluhan || 'Tidak ada catatan'}</p>
                  </div>
                ))}
                {visits.length > 5 && (
                  <button onClick={() => navigate(`/pasien/${patientId}/kunjungan`)} className="w-full text-sm font-bold text-[var(--color-accent)] hover:text-[var(--color-accent-secondary)] py-2 mt-2 transition-colors">
                    Lihat semua kunjungan ➔
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Jadwalkan Kunjungan Ulang */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4 no-print">
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in text-left">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="text-[var(--color-accent)]" /> Jadwalkan Kunjungan Ulang
              </h3>
              <button 
                onClick={() => setShowScheduleModal(false)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <ScheduleVisitForm 
              scheduleForm={scheduleForm} 
              setScheduleForm={setScheduleForm} 
              allDoctors={allDoctors} 
            />

            <div className="flex gap-3 justify-end mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm transition-colors"
                disabled={schedulingVisit}
              >
                Batal
              </button>
              <button 
                onClick={handleSaveSchedule}
                className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white rounded-xl font-semibold text-sm transition-all shadow-md flex items-center gap-1.5"
                disabled={schedulingVisit}
              >
                {schedulingVisit ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Jadwal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Catat Permintaan Subjek Data (UU PDP) */}
      {showPdpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-left">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Lock size={18} className="text-purple-500" /> Permintaan Subjek Data (UU PDP)
              </h3>
              <button onClick={() => setShowPdpModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">&times;</button>
            </div>

            <form onSubmit={handleCreatePDPRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Jenis Hak Subjek Data (UU PDP No. 27/2022)
                </label>
                <select
                  value={pdpForm.requestType}
                  onChange={e => setPdpForm({ ...pdpForm, requestType: e.target.value })}
                  className="glass-input w-full px-3 py-2 rounded-xl text-sm"
                >
                  <option value="access">Akses / Permintaan Salinan Data (Export PDF)</option>
                  <option value="correction">Koreksi / Perbaruan Informasi Data</option>
                  <option value="deletion">Penghapusan / Pemutusan Akses Rekam Medis</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Catatan / Dasar Permintaan Pasien
                </label>
                <textarea
                  value={pdpForm.notes}
                  onChange={e => setPdpForm({ ...pdpForm, notes: e.target.value })}
                  placeholder="Masukkan nomor identitas verifikator atau alasan permintaan pasien..."
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                  rows="3"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPdpModal(false)}
                  className="flex-1 py-2 px-4 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPdp}
                  className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {submittingPdp ? <Loader className="animate-spin" size={14} /> : 'Catat & Proses'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;
