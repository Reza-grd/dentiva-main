import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/ToastNotification';
import LoadingSpinner from '../common/LoadingSpinner';
import { supabase } from '../../services/supabase';
import { formatDoctorName } from '../../utils/dateUtils';
import { User, Phone, Shield, Save, Camera, FileText, Briefcase, Sparkles, Loader } from 'lucide-react';
import { satusehatService } from '../../services/satusehatService';

const DoctorProfilePage = () => {
  const { user, userProfile, updateProfile } = useAuth();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSyncSatuSehat = async () => {
    setSyncing(true);
    try {
      const res = await satusehatService.syncPractitioner(user.id);
      if (res.success) {
        toast.success('Penyelarasan SatuSehat Practitioner Berhasil!');
        // Force refetch local user profile state by doing a no-op update
        await updateProfile({});
      } else {
        toast.error('Gagal menyelaraskan: ' + res.error);
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };
  
  // Form fields
  const [gelarDepan, setGelarDepan] = useState('');
  const [fullName, setFullName] = useState('');
  const [gelarBelakang, setGelarBelakang] = useState('');
  const [jenisDokter, setJenisDokter] = useState('umum');
  const [spesialisasi, setSpesialisasi] = useState('');
  const [noStr, setNoStr] = useState('');
  const [noSip, setNoSip] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [nik, setNik] = useState('');
  const [strBerlakuHingga, setStrBerlakuHingga] = useState('');
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userProfile) {
      setGelarDepan(userProfile.gelar_depan || '');
      setFullName(userProfile.full_name || '');
      setGelarBelakang(userProfile.gelar_belakang || '');
      setJenisDokter(userProfile.jenis_dokter || 'umum');
      setSpesialisasi(userProfile.spesialisasi || '');
      setNoStr(userProfile.no_str || '');
      setNoSip(userProfile.no_sip || '');
      setNoTelepon(userProfile.no_telepon || userProfile.phone || '');
      setBio(userProfile.bio || '');
      setNik(userProfile.nik || '');
      setStrBerlakuHingga(userProfile.str_berlaku_hingga || '');
      
      if (userProfile.foto_profil) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(userProfile.foto_profil);
        setPhotoUrl(publicUrl);
      }
    }
  }, [userProfile]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file foto maksimal 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Format file harus berupa gambar');
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      // Update database path
      const { success, error: updateError } = await updateProfile({
        foto_profil: filePath
      });

      if (!success) throw new Error(updateError);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      setPhotoUrl(publicUrl);
      toast.success('Foto profil berhasil diperbarui!');
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Gagal mengunggah foto: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrors({});
    
    const newErrors = {};
    if (!fullName.trim()) {
      newErrors.fullName = 'Nama Lengkap wajib diisi';
    }
    
    if (nik.trim() && !/^\d{16}$/.test(nik.trim())) {
      newErrors.nik = 'NIK harus berupa 16 digit angka';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Harap lengkapi formulir dengan benar.');
      return;
    }

    setLoading(true);
    
    const profileUpdates = {
      gelar_depan: gelarDepan.trim() || null,
      full_name: fullName.trim(),
      gelar_belakang: gelarBelakang.trim() || null,
      jenis_dokter: jenisDokter,
      spesialisasi: jenisDokter === 'spesialis' ? (spesialisasi.trim() || null) : null,
      no_str: noStr.trim() || null,
      no_sip: noSip.trim() || null,
      no_telepon: noTelepon.trim() || null,
      phone: noTelepon.trim() || null, // Keep synced with auth phone field
      bio: bio.trim() || null,
      nik: nik.trim() || null,
      str_berlaku_hingga: strBerlakuHingga || null
    };

    const { success, error } = await updateProfile(profileUpdates);
    setLoading(false);

    if (success) {
      toast.success('Profil dokter berhasil diperbarui!');
    } else {
      toast.error('Gagal memperbarui profil: ' + error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'D';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <Shield className="text-[var(--color-accent)]" size={32} />
          Profil Dokter
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Kelola kredensial medis dan biodata profesional Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Quick Info */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-accent)]/5 rounded-bl-full -z-10"></div>
            
            {/* Profile Picture */}
            <div className="relative group mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-md flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                {photoUrl ? (
                  <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-white font-bold text-4xl"
                    style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary, var(--color-accent)))' }}
                  >
                    {getInitials(userProfile?.full_name)}
                  </div>
                )}
                
                {/* Upload Overlay */}
                <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                  <Camera size={24} className="mb-1" />
                  <span className="text-[10px] font-semibold">Ganti Foto</span>
                  <input type="file" onChange={handlePhotoUpload} className="hidden" accept="image/*" disabled={uploadingPhoto} />
                </label>
              </div>
              
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white">
                  <Loader className="animate-spin" size={24} />
                </div>
              )}
            </div>

            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
              {formatDoctorName(userProfile) || userProfile?.full_name || 'Dokter'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mb-3">
              {jenisDokter === 'spesialis' ? `Spesialis ${spesialisasi || 'Gigi'}` : 'Dokter Gigi Umum'}
            </p>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[var(--color-accent)]/10 text-[var(--color-accent)] mb-4">
              <Shield size={12} />
              {userProfile?.role}
            </div>
            
            <p className="text-xs text-gray-400 dark:text-gray-500">Terdaftar sejak: {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
          </div>

          {/* SatuSehat Integration Card */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
              <Shield size={16} className="text-blue-500" /> Integrasi SATUSEHAT
            </h4>
            <div className="p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">Status Sinkronisasi</div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${userProfile?.satusehat_practitioner_id ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span className="text-sm font-bold text-gray-850 dark:text-gray-200">
                  {userProfile?.satusehat_practitioner_id ? 'Terhubung (SISDMK)' : 'Belum Terhubung'}
                </span>
              </div>
              {userProfile?.satusehat_practitioner_id && (
                <div className="mt-2 text-[10px] text-gray-500 font-mono select-all">
                  ID: {userProfile.satusehat_practitioner_id}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSyncSatuSehat}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {syncing ? <Loader className="animate-spin" size={16} /> : <Shield size={16} />}
              {syncing ? 'Menghubungkan...' : 'Sinkronkan ke SatuSehat'}
            </button>
          </div>

          {/* Quick Stats / Bio View */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
              <Sparkles size={16} className="text-[var(--color-accent)]" />
              Biografi Singkat
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
              {bio || '"Belum menambahkan biografi singkat. Tuliskan deskripsi profesional Anda di form profil."'}
            </p>
          </div>
        </div>

        {/* Right Column: Profile Edit Form */}
        <div className="md:col-span-2">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl">
            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Kredensial Nama */}
              <div>
                <h3 className="font-bold text-gray-950 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2 text-sm uppercase tracking-wider">Kredensial & Nama</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Gelar Depan</label>
                    <input
                      type="text"
                      value={gelarDepan}
                      onChange={(e) => setGelarDepan(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                      placeholder="Contoh: drg."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Nama Lengkap <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: null })); }}
                      className={`glass-input w-full px-4 py-2.5 rounded-xl text-sm ${errors.fullName ? 'border-rose-500 ring-rose-500' : ''}`}
                      placeholder="Nama tanpa gelar..."
                    />
                    {errors.fullName && <p className="text-rose-500 text-xs mt-1">{errors.fullName}</p>}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Gelar Belakang</label>
                    <input
                      type="text"
                      value={gelarBelakang}
                      onChange={(e) => setGelarBelakang(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                      placeholder="Contoh: Sp.Ort, M.Si"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">NIK (No. Induk Kependudukan)</label>
                    <input
                      type="text"
                      value={nik}
                      onChange={(e) => { setNik(e.target.value); setErrors(p => ({ ...p, nik: null })); }}
                      className={`glass-input w-full px-4 py-2.5 rounded-xl text-sm ${errors.nik ? 'border-rose-500 ring-rose-500' : ''}`}
                      placeholder="16 digit NIK..."
                      maxLength="16"
                    />
                    {errors.nik && <p className="text-rose-500 text-xs mt-1">{errors.nik}</p>}
                  </div>
                </div>
              </div>

              {/* Detail Spesialisasi */}
              <div>
                <h3 className="font-bold text-gray-950 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2 text-sm uppercase tracking-wider">Keahlian & Spesialisasi</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Jenis Dokter</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="jenis_dokter"
                          value="umum"
                          checked={jenisDokter === 'umum'}
                          onChange={() => setJenisDokter('umum')}
                          className="w-4 h-4 text-[var(--color-accent)] focus:ring-[var(--color-accent)] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dokter Gigi Umum</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="jenis_dokter"
                          value="spesialis"
                          checked={jenisDokter === 'spesialis'}
                          onChange={() => setJenisDokter('spesialis')}
                          className="w-4 h-4 text-[var(--color-accent)] focus:ring-[var(--color-accent)] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Spesialis</span>
                      </label>
                    </div>
                  </div>
                  {jenisDokter === 'spesialis' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Spesialisasi</label>
                      <input
                        type="text"
                        value={spesialisasi}
                        onChange={(e) => setSpesialisasi(e.target.value)}
                        className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                        placeholder="Contoh: Ortodonsia, Konservasi Gigi"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Lisensi Medis */}
              <div>
                <h3 className="font-bold text-gray-950 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2 text-sm uppercase tracking-wider">Nomor Lisensi Medis</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                      <FileText size={14} />
                      No. STR (Registrasi)
                    </label>
                    <input
                      type="text"
                      value={noStr}
                      onChange={(e) => setNoStr(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                      placeholder="Nomor STR aktif..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                      <Briefcase size={14} />
                      No. SIP (Izin Praktek)
                    </label>
                    <input
                      type="text"
                      value={noSip}
                      onChange={(e) => setNoSip(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                      placeholder="Nomor SIP aktif..."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar size={14} />
                      STR Berlaku Hingga
                    </label>
                    <input
                      type="date"
                      value={strBerlakuHingga}
                      onChange={(e) => setStrBerlakuHingga(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                    />
                    {strBerlakuHingga && (() => {
                      const isExpired = new Date(strBerlakuHingga) < new Date();
                      const isExpiringSoon = !isExpired && (new Date(strBerlakuHingga) - new Date()) < 30 * 24 * 60 * 60 * 1000;
                      if (isExpired) {
                        return (
                          <div className="mt-2 text-xs font-semibold text-rose-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Peringatan: STR Anda sudah kedaluwarsa!
                          </div>
                        );
                      }
                      if (isExpiringSoon) {
                        return (
                          <div className="mt-2 text-xs font-semibold text-amber-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Peringatan: STR Anda akan kedaluwarsa kurang dari 30 hari.
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              {/* Kontak & Bio */}
              <div>
                <h3 className="font-bold text-gray-950 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2 text-sm uppercase tracking-wider">Kontak & Informasi Tambahan</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                      <Phone size={14} />
                      No. Telepon / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={noTelepon}
                      onChange={(e) => setNoTelepon(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                      placeholder="Contoh: 081234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Tentang Saya / Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-xl resize-none h-28 text-sm"
                      placeholder="Tuliskan biografi profesional singkat Anda..."
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DoctorProfilePage;
