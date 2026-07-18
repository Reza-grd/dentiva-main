import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, CheckCircle, AlertCircle, Package, Layers } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import { inventoryService } from '../../services/inventoryService';

const MasterBahan = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  
  const [formData, setFormData] = useState({
    kode_bahan: '',
    nama_bahan: '',
    kategori: '',
    satuan_dasar: '',
    satuan_beli: '',
    faktor_konversi: 1,
    stok_minimum: 0,
    supplier: '',
    is_active: true
  });

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [batches, setBatches] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await inventoryService.getMasterBahan();
    if (res.success) {
      setMaterials(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.kode_bahan || !formData.nama_bahan || !formData.satuan_dasar) {
      setError('Kode, nama, dan satuan dasar wajib diisi');
      return;
    }
    setSaving(true);
    const payload = {
      ...formData,
      id: editTarget?.id,
      faktor_konversi: Number(formData.faktor_konversi) || 1,
      stok_minimum: Number(formData.stok_minimum) || 0
    };

    const res = await inventoryService.upsertMasterBahan(payload);
    if (res.success) {
      setSuccess('Master bahan berhasil disimpan');
      closeModal();
      loadData();
    } else {
      setError(res.error);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus master bahan ini? Data tidak bisa dihapus jika sudah memiliki riwayat stok.')) return;
    const res = await inventoryService.deleteMasterBahan(id);
    if (res.success) {
      setSuccess('Bahan berhasil dihapus');
      loadData();
    } else {
      setError(res.error);
    }
  };

  const openAddModal = () => {
    setEditTarget(null);
    setFormData({
      kode_bahan: `BHN-${Date.now().toString().slice(-6)}`,
      nama_bahan: '',
      kategori: 'Consumable',
      satuan_dasar: 'pcs',
      satuan_beli: 'box',
      faktor_konversi: 1,
      stok_minimum: 5,
      supplier: '',
      is_active: true
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditTarget(item);
    setFormData({
      kode_bahan: item.kode_bahan,
      nama_bahan: item.nama_bahan,
      kategori: item.kategori || '',
      satuan_dasar: item.satuan_dasar,
      satuan_beli: item.satuan_beli || '',
      faktor_konversi: item.faktor_konversi,
      stok_minimum: item.stok_minimum,
      supplier: item.supplier || '',
      is_active: item.is_active
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    setError(null);
  };

  const handleViewBatches = async (material) => {
    setSelectedMaterial(material);
    setShowBatchModal(true);
    setBatchLoading(true);
    const res = await inventoryService.getMaterialBatches(material.id);
    if (res.success) {
      setBatches(res.data);
    } else {
      alert(res.error);
    }
    setBatchLoading(false);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  if (loading && materials.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Package className="text-primary-600" />
          Master Bahan & Gudang
        </h3>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} /> Tambah Bahan Baru
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Bahan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok (Satuan)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hrg Rata2 (Dasar)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {materials.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Belum ada data bahan</td></tr>
              ) : (
                materials.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">{m.kode_bahan}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {m.nama_bahan}
                      {m.stok_saat_ini <= m.stok_minimum && (
                        <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                          Low Stock
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{m.kategori}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      <span className={m.stok_saat_ini <= m.stok_minimum ? 'text-red-600' : 'text-gray-900 dark:text-gray-200'}>
                        {m.stok_saat_ini} {m.satuan_dasar}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200 text-right">
                      {formatCurrency(m.harga_rata2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleViewBatches(m)}
                          title="Lihat Batch & Expired"
                          className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg"
                        ><Layers size={16}/></button>
                        <button onClick={() => openEditModal(m)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16}/></button>
                        <button onClick={() => handleDelete(m.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editTarget ? 'Edit Master Bahan' : 'Tambah Master Bahan Baru'}
              </h3>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode Bahan *</label>
                  <input type="text" value={formData.kode_bahan} onChange={e => setFormData({...formData, kode_bahan: e.target.value})} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori</label>
                  <select value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="Consumable">Consumable (BHP)</option>
                    <option value="Obat">Obat</option>
                    <option value="Alat">Alat Sekali Pakai</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Bahan *</label>
                  <input type="text" value={formData.nama_bahan} onChange={e => setFormData({...formData, nama_bahan: e.target.value})} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                
                {/* Konversi Satuan */}
                <div className="md:col-span-2 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Konfigurasi Satuan (Pemakaian vs Pembelian)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Satuan Dasar (dipakai)</label>
                      <input type="text" placeholder="pcs, ml, gr..." value={formData.satuan_dasar} onChange={e => setFormData({...formData, satuan_dasar: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Satuan Beli (kulakan)</label>
                      <input type="text" placeholder="box, botol, karton..." value={formData.satuan_beli} onChange={e => setFormData({...formData, satuan_beli: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Faktor Konversi</label>
                      <input type="number" min="0.001" step="any" value={formData.faktor_konversi} onChange={e => setFormData({...formData, faktor_konversi: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 italic">Rumus: 1 {formData.satuan_beli || 'Satuan Beli'} = {formData.faktor_konversi || 1} {formData.satuan_dasar || 'Satuan Dasar'}. Saat treatment berlangsung, yang dikurangi adalah Satuan Dasar.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ambang Stok Minimum (Alert)</label>
                  <input type="number" value={formData.stok_minimum} onChange={e => setFormData({...formData, stok_minimum: e.target.value})} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier / Merek</label>
                  <input type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div className="md:col-span-2 flex items-center gap-2 mt-2">
                  <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 rounded text-primary-600" />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Aktif</label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
              <button onClick={closeModal} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Batches / Kadaluarsa */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="text-primary-600" /> 
                Info Batch & Kadaluarsa
              </h3>
              <button onClick={() => setShowBatchModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="p-6 bg-gray-50 dark:bg-gray-900/20">
              <div className="mb-4">
                <p className="text-sm text-gray-500">Bahan: <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedMaterial?.nama_bahan}</span></p>
                <p className="text-xs text-gray-400">Total Stok Sistem: {selectedMaterial?.stok_saat_ini} {selectedMaterial?.satuan_dasar}</p>
              </div>

              {batchLoading ? (
                <div className="py-8 text-center"><LoadingSpinner /></div>
              ) : (
                <div className="bg-white dark:bg-gray-800 border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">No. Batch</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tgl Masuk</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Expired</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty (Sisa/Awal)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {batches.length === 0 ? (
                        <tr><td colSpan="4" className="px-4 py-6 text-center text-sm text-gray-500">Belum ada catatan batch spesifik.</td></tr>
                      ) : (
                        batches.map(b => (
                          <tr key={b.id}>
                            <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-gray-300">{b.no_batch}</td>
                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{new Date(b.tanggal_masuk).toLocaleDateString('id-ID')}</td>
                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                              <span className={new Date(b.tanggal_kadaluarsa) < new Date() ? 'text-red-600 font-medium' : ''}>
                                {b.tanggal_kadaluarsa ? new Date(b.tanggal_kadaluarsa).toLocaleDateString('id-ID') : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-gray-300">
                              {b.qty_sisa} / {b.qty_awal}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button onClick={() => setShowBatchModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterBahan;
