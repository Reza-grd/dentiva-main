import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import { inventoryService } from '../../services/inventoryService';

const MaterialPurchases = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    material_id: '',
    tanggal: new Date().toISOString().substring(0, 10),
    jumlah_beli: '',
    harga_satuan_beli: '',
    supplier: '',
    no_faktur: '',
    tanggal_kadaluarsa: ''
  });

  const [selectedMaterial, setSelectedMaterial] = useState(null);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    const res = await inventoryService.getMasterBahan();
    if (res.success) {
      setMaterials(res.data.filter(m => m.is_active));
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  const handleMaterialChange = (e) => {
    const matId = e.target.value;
    setFormData({ ...formData, material_id: matId });
    const mat = materials.find(m => m.id === matId);
    setSelectedMaterial(mat || null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.material_id || !formData.jumlah_beli || !formData.harga_satuan_beli) {
      setError('Bahan, jumlah, dan harga satuan wajib diisi');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    // Calculate jumlah_dasar
    const jumlah_dasar = Number(formData.jumlah_beli) * (selectedMaterial?.faktor_konversi || 1);

    const payload = {
      material_id: formData.material_id,
      tanggal: formData.tanggal,
      jumlah_beli: Number(formData.jumlah_beli),
      jumlah_dasar: jumlah_dasar,
      harga_satuan_beli: Number(formData.harga_satuan_beli),
      supplier: formData.supplier,
      no_faktur: formData.no_faktur,
      tanggal_kadaluarsa: formData.tanggal_kadaluarsa || null
    };

    const res = await inventoryService.recordMaterialPurchase(payload);
    
    if (res.success) {
      setSuccess(`Berhasil mencatat stok masuk. Stok master telah otomatis diperbarui.`);
      setFormData({
        material_id: '',
        tanggal: new Date().toISOString().substring(0, 10),
        jumlah_beli: '',
        harga_satuan_beli: '',
        supplier: '',
        no_faktur: '',
        tanggal_kadaluarsa: ''
      });
      setSelectedMaterial(null);
      // Reload materials to get updated stock
      loadMaterials();
    } else {
      setError(res.error);
    }
    setSaving(false);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

  if (loading && materials.length === 0) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex items-center gap-3">
          <div className="p-2 bg-primary-100 text-primary-600 rounded-lg dark:bg-primary-900/50 dark:text-primary-400">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Catat Stok Masuk (Pembelian)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pencatatan ini akan otomatis menghitung ulang harga modal rata-rata tertimbang (WAC) pada master gudang.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kiri */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Transaksi *</label>
                <input 
                  type="date" required
                  value={formData.tanggal}
                  onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilih Master Bahan *</label>
                <select 
                  required
                  value={formData.material_id}
                  onChange={handleMaterialChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">-- Pilih Bahan --</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.kode_bahan} - {m.nama_bahan}</option>
                  ))}
                </select>
                {selectedMaterial && (
                  <p className="mt-1 text-xs text-gray-500">
                    Stok saat ini: {selectedMaterial.stok_saat_ini} {selectedMaterial.satuan_dasar} &bull; Harga Rata2: {formatCurrency(selectedMaterial.harga_rata2)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah Beli *</label>
                  <input 
                    type="number" min="0.001" step="any" required
                    value={formData.jumlah_beli}
                    onChange={(e) => setFormData({...formData, jumlah_beli: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Satuan: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedMaterial?.satuan_beli || '-'}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Harga Satuan *</label>
                  <input 
                    type="number" min="0" step="any" required
                    value={formData.harga_satuan_beli}
                    onChange={(e) => setFormData({...formData, harga_satuan_beli: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">Per {selectedMaterial?.satuan_beli || 'satuan beli'}</p>
                </div>
              </div>
            </div>

            {/* Kanan */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No. Faktur / Referensi</label>
                <input 
                  type="text" 
                  value={formData.no_faktur}
                  onChange={(e) => setFormData({...formData, no_faktur: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="INV-2026..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                <input 
                  type="text" 
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Kadaluarsa (Expired)</label>
                <input 
                  type="date" 
                  value={formData.tanggal_kadaluarsa}
                  onChange={(e) => setFormData({...formData, tanggal_kadaluarsa: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500">Opsional, jika diisi akan tercatat di log material batches.</p>
              </div>
            </div>
          </div>

          {/* Konversi Info */}
          {selectedMaterial && formData.jumlah_beli && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Konversi Gudang (Otomatis):</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {formData.jumlah_beli} {selectedMaterial.satuan_beli} &times; {selectedMaterial.faktor_konversi} = <span className="font-bold">{Number(formData.jumlah_beli) * selectedMaterial.faktor_konversi} {selectedMaterial.satuan_dasar}</span> (masuk ke stok saat ini)
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-700 dark:text-blue-300">Total Nilai Pembelian</p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                  {formatCurrency(Number(formData.jumlah_beli) * Number(formData.harga_satuan_beli || 0))}
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Plus size={18} />}
              {saving ? 'Memproses...' : 'Proses Pembelian'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialPurchases;
