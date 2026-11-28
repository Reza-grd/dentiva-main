import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from '@dentiva/ui';
import RecallKeputusanForm from './RecallKeputusanForm';
import { recallService } from '../../services/recallService';
import { validasiKeputusan } from '../../utils/recallSop';
import { useToast } from '../common/ToastNotification';

/**
 * Pop-up setelah RM disimpan bila recall kunjungan ini belum diputuskan.
 * Menutup tanpa memilih = disimpan "Belum ditentukan" (muncul di tab Recall → Belum ditentukan).
 */
export default function RecallKonfirmasiModal({ buka, visitId, tanggalKunjungan, usulan, namaPasien, onSelesai }) {
  const toast = useToast();
  const [nilai, setNilai] = useState(null);
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    if (buka) setNilai(usulan ? { ...usulan } : { keputusan: 'perlu', interval_hari: 180, wajib: false, tujuan: '', sumber: 'dokter' });
  }, [buka, usulan]);

  const simpan = async (isi) => {
    const galat = validasiKeputusan(isi);
    if (galat) return toast.error(galat);
    setMenyimpan(true);
    const res = await recallService.simpanKeputusan(visitId, isi);
    setMenyimpan(false);
    if (!res.success) return toast.error('Recall gagal disimpan: ' + res.error);
    if (isi.keputusan === 'perlu') toast.success(res.data?.wajib ? 'Recall WAJIB dijadwalkan.' : 'Recall dijadwalkan.');
    onSelesai?.(res.data);
  };

  const nanti = () => { if (!menyimpan) simpan({ keputusan: 'belum', sumber: 'dokter' }); };

  return (
    <Dialog open={buka} onOpenChange={(o) => { if (!o) nanti(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BellRing size={18} className="text-[var(--color-accent)]" /> Perlu recall?</DialogTitle>
          <DialogDescription>
            Rekam medis{namaPasien ? ` ${namaPasien}` : ''} tersimpan. Tentukan apakah pasien perlu dipanggil kontrol kembali.
          </DialogDescription>
        </DialogHeader>
        {nilai && (
          <RecallKeputusanForm nilai={nilai} ubah={setNilai} usulan={usulan} tanggalKunjungan={tanggalKunjungan} disabled={menyimpan} idPrefix="recall-modal" />
        )}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={nanti} disabled={menyimpan}>Nanti saja</Button>
          <Button onClick={() => simpan(nilai)} disabled={menyimpan || !nilai}>{menyimpan ? 'Menyimpan…' : 'Simpan keputusan'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
