import React, { useRef, useState, useEffect } from 'react';
import { Camera, Trash2, Upload, Loader2 } from 'lucide-react';
import { storageService } from '../../services/storageService';
import PatientAvatar from './PatientAvatar';

/**
 * Komponen upload foto profil pasien
 * Props:
 *   patientId   - UUID pasien (required untuk upload)
 *   currentUrl  - path relatif atau URL foto saat ini (string | null)
 *   name        - Nama pasien untuk fallback avatar
 *   gender      - Jenis kelamin untuk warna avatar
 *   onUploadSuccess(path) - callback setelah upload sukses (menerima path relatif)
 *   onDeleteSuccess()    - callback setelah hapus sukses
 *   readOnly    - jika true, hanya tampilkan foto (tidak bisa edit)
 *
 * PRIVATE BUCKET FIX: currentUrl bisa berupa path relatif.
 * PatientAvatar di dalamnya menangani resolve ke signed URL secara otomatis.
 */
const PhotoUpload = ({
  patientId,
  currentUrl,
  name = '',
  gender = '',
  onUploadSuccess,
  onDeleteSuccess,
  readOnly = false,
}) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // blob URL untuk preview instant

  // displayUrl: blob URL (preview) → currentUrl path (akan di-resolve oleh PatientAvatar) → null
  const displayUrl = preview || currentUrl || null;

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Preview instant sebelum upload
    const blobUrl = URL.createObjectURL(file);
    setPreview(blobUrl);

    if (!patientId) {
      // Mode registrasi: simpan file object dan pass ke parent melalui callback
      onUploadSuccess?.(file, blobUrl);
      return;
    }

    // Mode edit pasien yang sudah ada: langsung upload
    setUploading(true);
    const result = await storageService.uploadPatientPhoto(patientId, file);
    setUploading(false);

    if (result.success) {
      URL.revokeObjectURL(blobUrl);
      setPreview(null);
      // PRIVATE BUCKET FIX: callback dengan path relatif (bukan URL)
      onUploadSuccess?.(result.path);
    } else {
      setPreview(null);
      setError(result.error || 'Gagal mengupload foto');
    }

    // Reset input agar file yang sama bisa dipilih lagi
    e.target.value = '';
  };

  const handleDelete = async () => {
    if (!patientId) {
      setPreview(null);
      onDeleteSuccess?.();
      return;
    }

    setDeleting(true);
    setError('');
    const result = await storageService.deletePatientPhoto(patientId, currentUrl);
    setDeleting(false);

    if (result.success) {
      onDeleteSuccess?.();
    } else {
      setError(result.error || 'Gagal menghapus foto');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar + overlay tombol */}
      <div className="relative group">
        <PatientAvatar
          src={displayUrl}
          name={name}
          gender={gender}
          size="lg"
        />

        {/* Loading overlay */}
        {(uploading || deleting) && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <Loader2 size={24} className="text-white animate-spin" />
          </div>
        )}

        {/* Hover overlay - tombol kamera */}
        {!readOnly && !uploading && !deleting && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100
                       flex items-center justify-center transition-opacity cursor-pointer"
            title="Ganti foto"
          >
            <Camera size={24} className="text-white" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 text-center max-w-[180px]">{error}</p>
      )}

      {/* Tombol aksi */}
      {!readOnly && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || deleting}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md
                       bg-primary-50 text-primary-700 hover:bg-primary-100
                       disabled:opacity-50 transition-colors"
          >
            <Upload size={12} />
            {uploading ? 'Mengupload...' : displayUrl ? 'Ganti Foto' : 'Upload Foto'}
          </button>

          {displayUrl && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading || deleting}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md
                         bg-red-50 text-red-600 hover:bg-red-100
                         disabled:opacity-50 transition-colors"
            >
              <Trash2 size={12} />
              {deleting ? 'Menghapus...' : 'Hapus'}
            </button>
          )}
        </div>
      )}

      {/* Hint teks */}
      {!readOnly && (
        <p className="text-xs text-gray-400 text-center">
          JPG, PNG, WebP · Maks 5MB
        </p>
      )}

      {/* Hidden input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default PhotoUpload;
