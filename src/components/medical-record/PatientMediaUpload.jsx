import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Image as ImageIcon, FileText, Loader2, Camera, Info, ZoomIn } from 'lucide-react';
import { mediaService } from '../../services/mediaService';
import { useToast } from '../common/ToastNotification';
import ImageViewer from '../common/ImageViewer';

const CATEGORIES = {
  radiologi: [
    { id: 'panoramic', label: 'Radiologi Panoramik', multiple: false, type: 'radiology' },
    { id: 'cephalometric', label: 'Radiologi Sefalometri', multiple: false, type: 'radiology' },
    { id: 'dental', label: 'Radiologi Dental (Periapical)', multiple: true, type: 'radiology' },
    { id: 'other', label: 'Lainnya', multiple: true, type: 'radiology', isCustom: true }
  ],
  klinik: [
    { id: 'intraoral', label: 'Foto Intra Oral', multiple: true, type: 'clinical' },
    { id: 'extraoral', label: 'Foto Ekstra Oral', multiple: true, type: 'clinical' }
  ]
};

const PatientMediaUpload = ({ patientId, visitId }) => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({}); // { categoryId: boolean }
  const [lightboxData, setLightboxData] = useState(null); // { images: [], index: 0 }
  const toast = useToast();
  
  const fileInputRefs = useRef({});

  useEffect(() => {
    if (patientId) {
      loadMedia();
    }
  }, [patientId]);

  const loadMedia = async () => {
    setLoading(true);
    const { success, data, error } = await mediaService.fetchPatientMedia(patientId);
    if (success) {
      setMedia(data || []);
    } else {
      toast.error('Gagal memuat media: ' + error);
    }
    setLoading(false);
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for radiologi/klinis
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  const handleFileSelect = async (e, categoryConfig) => {
    const rawFiles = Array.from(e.target.files);
    if (!rawFiles.length) return;

    // Validation
    const validFiles = rawFiles.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Format tidak didukung: ${file.name}`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Ukuran file maksimal 10MB: ${file.name}`);
        return false;
      }
      return true;
    });

    // Reset input
    e.target.value = null;

    if (!validFiles.length) return;
    const files = validFiles;

    // For single uploads, we might want to delete the existing one first
    if (!categoryConfig.multiple) {
      const existing = media.find(m => m.category === categoryConfig.id);
      if (existing) {
        await mediaService.deleteMedia(existing);
        setMedia(prev => prev.filter(m => m.id !== existing.id));
      }
    }

    setUploading(prev => ({ ...prev, [categoryConfig.id]: true }));

    let successCount = 0;
    for (const file of files) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} terlalu besar (maks 5MB)`);
        continue;
      }
      
      const { success, data, error } = await mediaService.uploadMedia(
        file, 
        categoryConfig.id, 
        patientId, 
        visitId
      );

      if (success) {
        successCount++;
        setMedia(prev => [data, ...prev]);
      } else {
        toast.error(`Gagal upload ${file.name}: ${error}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} file berhasil diunggah`);
    }

    setUploading(prev => ({ ...prev, [categoryConfig.id]: false }));
  };

  const handleDelete = async (mediaItem) => {
    if (!window.confirm('Yakin ingin menghapus media ini?')) return;
    
    // Optimistic UI update
    const previousMedia = [...media];
    setMedia(prev => prev.filter(m => m.id !== mediaItem.id));
    
    const { success, error } = await mediaService.deleteMedia(mediaItem);
    if (success) {
      toast.success('Media dihapus');
    } else {
      toast.error('Gagal menghapus media: ' + error);
      setMedia(previousMedia); // Revert on fail
    }
  };

  const handleCaptionChange = async (mediaId, newCaption) => {
    // Update local state first
    setMedia(prev => prev.map(m => m.id === mediaId ? { ...m, caption: newCaption } : m));
  };

  const handleCaptionBlur = async (mediaItem, newCaption) => {
    if (mediaItem.caption === newCaption) return; // No change
    const { success } = await mediaService.updateMediaCaption(mediaItem.id, { caption: newCaption });
    if (!success) toast.error('Gagal menyimpan caption');
  };

  const openLightbox = (image, allImagesInCategory) => {
    const index = allImagesInCategory.findIndex(img => img.id === image.id);
    setLightboxData({
      images: allImagesInCategory,
      index: index >= 0 ? index : 0
    });
  };

  const renderUploadZone = (config) => {
    const categoryMedia = media.filter(m => m.category === config.id);
    const isUploading = uploading[config.id];
    
    return (
      <div key={config.id} className={`border border-gray-200 rounded-xl bg-gray-50/50 overflow-hidden flex flex-col h-full shadow-sm ${categoryMedia.length === 0 ? 'print:hidden' : ''}`}>
        <div className="bg-white px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            {config.type === 'radiology' ? <ImageIcon size={16} className="text-blue-500" /> : <Camera size={16} className="text-green-500" />}
            {config.label}
          </h4>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
            {categoryMedia.length} item
          </span>
        </div>
        
        <div className="p-4 flex-1 flex flex-col gap-4">
          {/* Upload Button Area - Hidden in Print */}
          {(!categoryMedia.length || config.multiple) && (
            <div 
              onClick={() => !isUploading && fileInputRefs.current[config.id]?.click()}
              className={`print:hidden border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all min-h-[100px]
                ${isUploading ? 'border-gray-300 bg-gray-100 cursor-not-allowed' : 'border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 cursor-pointer'}`}
            >
              <input 
                type="file" 
                ref={el => fileInputRefs.current[config.id] = el}
                className="hidden" 
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple={config.multiple}
                onChange={(e) => handleFileSelect(e, config)}
                disabled={isUploading}
              />
              {isUploading ? (
                <>
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                  <span className="text-sm font-medium text-gray-600">Mengunggah...</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-blue-400 mb-2" />
                  <span className="text-sm font-medium text-blue-700">Pilih File</span>
                  <span className="text-xs text-gray-500 mt-1">
                    {config.multiple ? 'Bisa pilih lebih dari satu' : 'Maks 5MB'}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Media Grid */}
          {categoryMedia.length > 0 && (
            <div className={`grid gap-3 ${config.multiple ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {categoryMedia.map(item => (
                <div key={item.id} className="relative group bg-white p-2 rounded-lg border border-gray-200 shadow-sm flex flex-col">
                  {/* Delete Button - Hidden in Print */}
                  <button 
                    onClick={() => handleDelete(item)}
                    className="print:hidden absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>

                  {/* Thumbnail Container */}
                  <div 
                    className="aspect-square w-full overflow-hidden rounded bg-gray-100 cursor-zoom-in relative"
                    onClick={() => openLightbox(item, categoryMedia)}
                  >
                    {item.file_type === 'application/pdf' ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <FileText size={32} className="text-red-400 mb-2" />
                        <span className="text-xs font-semibold">PDF Document</span>
                      </div>
                    ) : (
                      <img 
                        src={item.file_url} 
                        alt={`Thumbnail media medis ${item.filename || ''}`} 
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                        loading="lazy"
                      />
                    )}
                    
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                    </div>
                  </div>

                  {/* Caption/Notes Input */}
                  <div className="mt-2 flex-1 flex flex-col justify-end">
                    {config.type === 'clinical' || config.isCustom ? (
                      <input 
                        type="text" 
                        value={item.caption || ''} 
                        onChange={e => handleCaptionChange(item.id, e.target.value)}
                        onBlur={e => handleCaptionBlur(item, e.target.value)}
                        placeholder="Regio / keterangan..." 
                        className="w-full text-xs p-1.5 border border-gray-200 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                      />
                    ) : (
                      <p className="text-[10px] text-gray-500 truncate" title={item.filename}>{item.filename}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <h3 className="font-bold text-lg text-gray-900">Media Pasien (Radiologi & Foto Klinik)</h3>
        <span className="print:hidden text-xs font-medium text-gray-500 bg-gray-200 px-2.5 py-1 rounded-md flex items-center gap-1">
          <Info size={14} /> Tersimpan Otomatis
        </span>
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Radiology Section */}
            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 border-b pb-2">A. Radiologi</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {CATEGORIES.radiologi.map(renderUploadZone)}
              </div>
            </div>

            {/* Clinical Photos Section */}
            <div>
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 border-b pb-2">B. Foto Klinik</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {CATEGORIES.klinik.map(renderUploadZone)}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxData && (
        <ImageViewer 
          images={lightboxData.images}
          initialIndex={lightboxData.index}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
};

export default PatientMediaUpload;
