import React, { useState, useEffect } from 'react';
import { X, Printer, Save, FileText, User } from 'lucide-react';
import { patientService } from '../../services/patientService';
import { useToast } from '../common/ToastNotification';
import { formatDoctorName } from '../../utils/dateUtils';

const ReferralLetterModal = ({ isOpen, onClose, patient, userProfile }) => {
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    referral_number: '',
    to_doctor: '',
    to_hospital: '',
    to_specialist: '',
    anamnesis: '',
    physical_exam: '',
    diagnosis: '',
    therapy: '',
    place: 'Tg. Morawa',
    date: new Date().toISOString().split('T')[0]
  });

  const [saving, setSaving] = useState(false);

  // Initialize auto-filled data when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        date: new Date().toISOString().split('T')[0], // reset date to today
        place: 'Tg. Morawa' // default clinic location
      }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle auto-calculated Age
  const calculateAge = (dob) => {
    if (!dob) return '-';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} Tahun`;
  };

  const handleSaveAndPrint = async () => {
    // 1. Validation (ensure required fields like hospital/doctor aren't completely blank if we want, but let's keep it flexible)
    if (!formData.to_doctor || !formData.to_hospital || !formData.to_specialist) {
      toast.error('Harap isi data tujuan rujukan (Yth Dokter, Rumah Sakit, Spesialis)');
      return;
    }

    setSaving(true);
    
    // 2. Prepare data for database
    const dbData = {
      patient_id: patient.id,
      visit_id: null, // Since we aren't strongly tying it to a specific visit in this flow, but could be added later
      referral_number: formData.referral_number,
      to_doctor: formData.to_doctor,
      to_hospital: formData.to_hospital,
      to_specialist: formData.to_specialist,
      anamnesis: formData.anamnesis,
      physical_exam: formData.physical_exam,
      diagnosis: formData.diagnosis,
      therapy: formData.therapy,
      place: formData.place,
      date: formData.date,
      doctor_name: formatDoctorName(userProfile) || 'Dokter Jaga'
    };

    // 3. Save to database
    const { success, error } = await patientService.saveReferralLetter(dbData);
    
    setSaving(false);

    if (!success) {
      toast.error('Gagal menyimpan surat rujukan: ' + error);
      return;
    }

    // 4. Trigger Print
    toast.success('Surat rujukan berhasil disimpan. Menyiapkan cetak...');
    setTimeout(() => {
      window.print();
      // After print dialog closes, we close the modal
      onClose();
    }, 500);
  };

  return (
    <>
      {/* 
        MODAL OVERLAY (Screen Only)
        We use 'print:hidden' to hide the entire dark background overlay and scroll behavior during print.
      */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start pt-10 pb-10 overflow-y-auto print:hidden">
        
        {/* Modal Container */}
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl relative">
          
          {/* Header (Screen Only) */}
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 rounded-t-xl print:hidden">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="text-blue-600" /> Form Surat Rujukan
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Form Content - This area serves as BOTH the interactive form AND the print layout */}
          <div className="p-8 print:p-0 bg-white" id="printable-referral">
            
            {/* PRINT HEADER: Only visible when printing */}
            <div className="hidden print:block mb-8 border-b-2 border-gray-900 pb-4">
              <h1 className="text-2xl font-bold text-center uppercase tracking-widest">Dentiva Clinic</h1>
              <p className="text-center text-sm">Jl. Raya Tg. Morawa No. 123, Sumatera Utara</p>
              <p className="text-center text-sm">Telp: (061) 1234567 | Web: www.Dentiva.com</p>
            </div>

            {/* Title */}
            <h2 className="text-center text-2xl font-bold underline mb-1 uppercase tracking-wider print:mb-2">Surat Rujukan</h2>
            
            {/* Nomor Rujukan */}
            <div className="flex justify-center items-center mb-8 gap-2">
              <span className="font-semibold">Nomor:</span>
              <input 
                type="text" 
                className="w-48 border-b border-gray-300 focus:border-blue-500 outline-none px-2 py-1 text-center bg-transparent print:border-none print:p-0" 
                placeholder="---"
                value={formData.referral_number}
                onChange={e => setFormData({...formData, referral_number: e.target.value})}
              />
            </div>

            {/* To Section */}
            <div className="mb-8 pl-4 border-l-4 border-blue-500 print:border-none print:pl-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-40 font-semibold text-gray-800">Yth, T.S.Dokter Ahli</span>
                <span className="font-semibold">:</span>
                <input 
                  type="text" 
                  className="flex-1 border-b border-dashed border-gray-300 focus:border-blue-500 outline-none px-2 py-1 bg-transparent print:border-none print:p-0"
                  value={formData.to_doctor}
                  onChange={e => setFormData({...formData, to_doctor: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-40 font-semibold text-gray-800">Rumah Sakit</span>
                <span className="font-semibold">:</span>
                <input 
                  type="text" 
                  className="flex-1 border-b border-dashed border-gray-300 focus:border-blue-500 outline-none px-2 py-1 bg-transparent print:border-none print:p-0"
                  value={formData.to_hospital}
                  onChange={e => setFormData({...formData, to_hospital: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-40 font-semibold text-gray-800">Dokter Spesialis Penyakit</span>
                <span className="font-semibold">:</span>
                <input 
                  type="text" 
                  className="flex-1 border-b border-dashed border-gray-300 focus:border-blue-500 outline-none px-2 py-1 bg-transparent print:border-none print:p-0"
                  value={formData.to_specialist}
                  onChange={e => setFormData({...formData, to_specialist: e.target.value})}
                />
              </div>
            </div>

            <p className="mb-4">Bersama ini kami mohon pemeriksaan dan perawatan lebih lanjut terhadap penderita:</p>

            {/* Patient Auto-filled Data */}
            <div className="mb-8 ml-4 space-y-2">
              <div className="flex">
                <span className="w-32 font-semibold">Nama</span>
                <span className="mr-2">:</span>
                <span className="flex-1 font-bold">{patient?.nama_lengkap || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold">Umur</span>
                <span className="mr-2">:</span>
                <span className="flex-1">{calculateAge(patient?.tanggal_lahir)}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold">J. Kelamin</span>
                <span className="mr-2">:</span>
                <span className="flex-1 capitalize">{patient?.jenis_kelamin || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold">Alamat</span>
                <span className="mr-2">:</span>
                <span className="flex-1">{patient?.alamat || '-'}</span>
              </div>
            </div>

            {/* Clinical Notes Inputs */}
            <div className="space-y-4 mb-12">
              <div className="flex items-start gap-2">
                <span className="w-40 font-semibold pt-2">Anamnesa</span>
                <span className="font-semibold pt-2">:</span>
                <textarea 
                  className="flex-1 border border-gray-200 rounded p-2 focus:border-blue-500 outline-none resize-none min-h-[80px] bg-gray-50 print:border-none print:bg-transparent print:p-0 print:min-h-0"
                  value={formData.anamnesis}
                  onChange={e => setFormData({...formData, anamnesis: e.target.value})}
                />
              </div>
              <div className="flex items-start gap-2">
                <span className="w-40 font-semibold pt-2">Pemeriksaan fisik</span>
                <span className="font-semibold pt-2">:</span>
                <textarea 
                  className="flex-1 border border-gray-200 rounded p-2 focus:border-blue-500 outline-none resize-none min-h-[80px] bg-gray-50 print:border-none print:bg-transparent print:p-0 print:min-h-0"
                  value={formData.physical_exam}
                  onChange={e => setFormData({...formData, physical_exam: e.target.value})}
                />
              </div>
              <div className="flex items-start gap-2">
                <span className="w-40 font-semibold pt-2">Diagnosa Sementara</span>
                <span className="font-semibold pt-2">:</span>
                <textarea 
                  className="flex-1 border border-gray-200 rounded p-2 focus:border-blue-500 outline-none resize-none min-h-[80px] bg-gray-50 print:border-none print:bg-transparent print:p-0 print:min-h-0"
                  value={formData.diagnosis}
                  onChange={e => setFormData({...formData, diagnosis: e.target.value})}
                />
              </div>
              <div className="flex items-start gap-2">
                <span className="w-40 font-semibold pt-2">Therapi</span>
                <span className="font-semibold pt-2">:</span>
                <textarea 
                  className="flex-1 border border-gray-200 rounded p-2 focus:border-blue-500 outline-none resize-none min-h-[80px] bg-gray-50 print:border-none print:bg-transparent print:p-0 print:min-h-0"
                  value={formData.therapy}
                  onChange={e => setFormData({...formData, therapy: e.target.value})}
                />
              </div>
            </div>

            <p className="mb-12">Atas bantuan dan kerjasama sejawat kami ucapkan terima kasih.</p>

            {/* Signature Area */}
            <div className="flex justify-end pr-8">
              <div className="flex flex-col items-center w-64">
                <div className="flex gap-1 mb-8">
                  <input 
                    type="text" 
                    className="w-32 border-b border-gray-300 text-right outline-none bg-transparent print:border-none"
                    value={formData.place}
                    onChange={e => setFormData({...formData, place: e.target.value})}
                  />
                  <span>,</span>
                  <input 
                    type="date" 
                    className="w-32 border-b border-gray-300 outline-none bg-transparent print:border-none"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                
                <p className="mb-20">Teman Sejawat,</p>
                
                <div className="border-b border-gray-400 w-full text-center pb-1 font-bold">
                  {formatDoctorName(userProfile) || 'Dokter Jaga'}
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions (Screen Only) */}
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex justify-end gap-4 print:hidden">
            <button onClick={onClose} className="btn btn-secondary px-6">Batal</button>
            <button onClick={handleSaveAndPrint} disabled={saving} className="btn btn-success px-8 flex items-center gap-2">
              {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Printer size={20} />}
              Simpan & Cetak
            </button>
          </div>

        </div>
      </div>

      {/* Global CSS for Print specific to this component */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-referral, #printable-referral * {
            visibility: visible;
          }
          #printable-referral {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 2cm !important;
          }
          textarea, input {
            border: none !important;
            background: transparent !important;
            resize: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default ReferralLetterModal;
