import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { storageService } from '../../services/storageService';

/**
 * Komponen avatar pasien — digunakan di tiga tempat:
 *  - PatientList  : size="sm" (avatar kecil di tabel)
 *  - PatientDetail: size="lg" (kartu profil)
 *  - MedicalRecord: size="md" (header rekam medis)
 *
 * PRIVATE BUCKET FIX: prop `src` bisa berupa path relatif atau full URL.
 * Komponen akan otomatis resolve ke signed URL via storageService.getPhotoUrl().
 */
const PatientAvatar = ({
  src,
  name = '',
  size = 'md',    // 'sm' | 'md' | 'lg'
  gender = '',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState(null);

  // Resolve path relatif → signed URL (atau pass-through URL lengkap)
  useEffect(() => {
    let cancelled = false;
    setImgError(false);
    setResolvedUrl(null);

    if (!src) return;

    storageService.getPhotoUrl(src).then((url) => {
      if (!cancelled) setResolvedUrl(url);
    });

    return () => { cancelled = true; };
  }, [src]);

  const sizeMap = {
    sm: { container: 'w-10 h-10', icon: 16, text: 'text-sm' },
    md: { container: 'w-16 h-16', icon: 24, text: 'text-xl'  },
    lg: { container: 'w-24 h-24', icon: 36, text: 'text-3xl' },
  };

  const s = sizeMap[size] || sizeMap.md;

  // Inisial dari nama (maks 2 huruf)
  const initials = name
    ? name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '';

  // Warna background berdasarkan gender
  const bgColor = gender === 'Perempuan'
    ? 'bg-pink-100 text-pink-700'
    : gender === 'Laki-laki'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-500';

  const showImage = resolvedUrl && !imgError;

  return (
    <div
      className={`
        ${s.container} rounded-full flex items-center justify-center
        overflow-hidden flex-shrink-0 ${showImage ? '' : bgColor} ${className}
      `}
    >
      {showImage ? (
        <img
          src={resolvedUrl}
          alt={name || 'Foto Pasien'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : initials ? (
        <span className={`font-bold ${s.text}`}>{initials}</span>
      ) : (
        <User size={s.icon} />
      )}
    </div>
  );
};

export default PatientAvatar;
