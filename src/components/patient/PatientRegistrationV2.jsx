import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '../common/ToastNotification';
import { patientService } from '../../services/patientService';
import { visitService } from '../../services/visitService';
import { patientRegistrationSchema } from '../../utils/validationSchemas';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { FormError } from '../ui/FormError';
import { UserPlus, ChevronLeft, Search, Loader2 } from 'lucide-react';

const PatientRegistrationV2 = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [registrationMode, setRegistrationMode] = useState('baru'); // 'baru' | 'lama'

  // Pasien Lama States (Simpler form, not using RHF for this search part)
  const [searchOldTerm, setSearchOldTerm] = useState('');
  const [debouncedOldTerm, setDebouncedOldTerm] = useState('');
  const [oldSearchResults, setOldSearchResults] = useState([]);
  const [selectedOldPatient, setSelectedOldPatient] = useState(null);
  const [isSearchingOld, setIsSearchingOld] = useState(false);
  const [isSubmittingOld, setIsSubmittingOld] = useState(false);

  // Pasien Baru form setup
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      nama_lengkap: '',
      no_wa: '',
      jenis_kelamin: '',
      tanggal_lahir: '',
    }
  });

  const onSubmitBaru = async (data) => {
    try {
      // Simulate submission
      await new Promise(r => setTimeout(r, 1000));
      console.log('Submitted data:', data);
      toast.success('Pasien berhasil didaftarkan (V2 Pilot)');
      navigate(-1);
    } catch (err) {
      toast.error('Gagal mendaftar pasien');
    }
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Pendaftaran Pasien <span className="text-sm font-normal bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full ml-2">V2 (Zod)</span>
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Isi form di bawah untuk mendaftarkan pasien baru ke sistem
          </p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-xl inline-flex relative shadow-inner">
          <button
            onClick={() => setRegistrationMode('baru')}
            className={`relative z-10 px-8 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
              registrationMode === 'baru' 
                ? 'text-[var(--color-primary)] shadow-sm bg-white dark:bg-[#1A1D24]' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Pasien Baru
          </button>
          <button
            onClick={() => setRegistrationMode('lama')}
            className={`relative z-10 px-8 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
              registrationMode === 'lama' 
                ? 'text-[var(--color-primary)] shadow-sm bg-white dark:bg-[#1A1D24]' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Pasien Lama
          </button>
        </div>
      </div>

      {registrationMode === 'baru' ? (
        <Card className="animate-fade-in">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmitBaru)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Nama Lengkap</label>
                  <Input {...register('nama_lengkap')} error={errors.nama_lengkap?.message} />
                  <FormError message={errors.nama_lengkap?.message} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Nomor WhatsApp</label>
                  <Input {...register('no_wa')} error={errors.no_wa?.message} />
                  <FormError message={errors.no_wa?.message} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Jenis Kelamin</label>
                  <select {...register('jenis_kelamin')} className="glass-input w-full px-4 py-2.5 rounded-xl text-sm" aria-invalid={!!errors.jenis_kelamin}>
                    <option value="">Pilih...</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                  <FormError message={errors.jenis_kelamin?.message} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Tanggal Lahir</label>
                  <Input type="date" {...register('tanggal_lahir')} error={errors.tanggal_lahir?.message} />
                  <FormError message={errors.tanggal_lahir?.message} />
                </div>
              </div>
              <Button type="submit" isLoading={isSubmitting} className="w-full">
                Simpan & Daftarkan
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center p-8 text-gray-500 animate-fade-in">
          Modul Pasien Lama sedang disempurnakan.
        </div>
      )}
    </div>
  );
};

export default PatientRegistrationV2;
