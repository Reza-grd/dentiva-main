/**
 * Kecilkan foto (mis. nota dari kamera HP) menjadi JPEG agar cepat diunggah dan murah diproses AI.
 * @returns {Promise<{ base64: string, mediaType: 'image/jpeg', blob: Blob, width: number, height: number }>}
 */
export async function resizeImageToJpeg(file, maxSide = 1600, quality = 0.85) {
  if (!file || !/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type || '')) {
    throw new Error('Pilih foto berformat JPG, PNG, atau WEBP.');
  }
  const bitmap = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // PNG transparan → latar putih
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Foto tidak dapat diproses.'))), 'image/jpeg', quality));
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Foto tidak dapat dibaca.'));
    r.readAsDataURL(blob);
  });
  return { base64: String(dataUrl).split(',')[1], mediaType: 'image/jpeg', blob, width, height };
}

async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* coba cara lama */ }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Format foto tidak didukung browser ini. Coba JPG atau PNG.'));
      img.src = url;
    });
  } finally {
    // URL dilepas setelah gambar dimuat (drawImage memakai elemen yang sudah termuat)
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
