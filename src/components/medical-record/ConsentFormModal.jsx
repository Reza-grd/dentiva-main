import React, { useState, useRef } from 'react';
import { X, Check, PenTool, Trash2, Printer, Save } from 'lucide-react';
import { consentService } from '../../services/consentService';
import { useToast } from '../common/ToastNotification';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const ConsentFormModal = ({ patient, visit, userProfile, onClose, onSaveSuccess }) => {
  const [title, setTitle] = useState('Persetujuan Tindakan Medis');
  const [treatmentType, setTreatmentType] = useState('');
  const [saving, setSaving] = useState(false);
  
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const toast = useToast();

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Support for both mouse and touch
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling while drawing
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Setup canvas context on load
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000000';
      // Fill with white background initially
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const handleSave = async () => {
    if (!treatmentType.trim()) {
      toast.error('Jenis tindakan harus diisi');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Basic check if canvas is empty by checking if there's any non-white pixel
    const ctx = canvas.getContext('2d');
    const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    const hasColor = pixelBuffer.some(color => color !== 0xFFFFFFFF); // 0xFFFFFFFF is solid white
    
    if (!hasColor) {
      toast.error('Tanda tangan pasien wajib diisi');
      return;
    }

    const signatureData = canvas.toDataURL('image/jpeg', 0.8);

    setSaving(true);
    const consentData = {
      patient_id: patient.id,
      visit_id: visit?.id || null,
      title: title,
      treatment_type: treatmentType,
      patient_name: patient.nama_lengkap,
      doctor_name: userProfile?.nama || 'Dokter',
      signature_data: signatureData
    };

    const { success, error } = await consentService.saveConsent(consentData);
    setSaving(false);

    if (success) {
      toast.success('Informed consent berhasil disimpan');
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } else {
      toast.error('Gagal menyimpan consent: ' + error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-full flex flex-col my-8">
        
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PenTool className="text-blue-500" /> Form Informed Consent
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">Informasi Pasien</p>
            <p>Nama: <strong>{patient?.nama_lengkap}</strong></p>
            <p>Tanggal: <strong>{format(new Date(), 'dd MMMM yyyy', { locale: id })}</strong></p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Judul Dokumen</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="glass-input w-full px-4 py-2.5 rounded-xl"
              placeholder="Contoh: Persetujuan Tindakan Medis"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Jenis Tindakan / Perawatan <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              value={treatmentType} 
              onChange={e => setTreatmentType(e.target.value)} 
              className="glass-input w-full px-4 py-2.5 rounded-xl"
              placeholder="Contoh: Pencabutan Gigi Molar 3 Kiri Bawah"
            />
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mt-4">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tanda Tangan Pasien</label>
              <button 
                type="button" 
                onClick={clearCanvas} 
                className="text-xs font-medium text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md"
              >
                <Trash2 size={14} /> Bersihkan
              </button>
            </div>
            <div className="p-4 flex justify-center bg-gray-100 dark:bg-gray-900">
              <div className="bg-white rounded-lg shadow-inner overflow-hidden border-2 border-dashed border-gray-300 cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="touch-none" // Prevents zooming/scrolling on mobile while drawing
                />
              </div>
            </div>
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 text-center">
              Gunakan mouse atau jari untuk menandatangani di dalam kotak di atas.
            </div>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="mb-2">Dengan menandatangani form ini, pasien menyatakan bahwa:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Telah menerima penjelasan dari dokter mengenai tindakan yang akan dilakukan.</li>
              <li>Telah memahami risiko, komplikasi yang mungkin terjadi, dan alternatif tindakan lain.</li>
              <li>Memberikan persetujuan secara sadar dan tanpa paksaan.</li>
            </ol>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-b-2xl">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-6 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
            Simpan Persetujuan
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default ConsentFormModal;
