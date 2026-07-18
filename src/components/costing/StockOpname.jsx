import React, { useState, useEffect } from 'react';
import { Settings, Plus, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../contexts/AuthContext';

const StockOpname = () => {
  const { userProfile } = useAuth();
  const [opnames, setOpnames] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().substring(0, 10),
    material_id: '',
    stok_sistem: 0,
    stok_fisik: '',
    catatan: ''
  });

  const [selectedMaterial, setSelectedMaterial] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [opRes, matRes] = await Promise.all([
        inventoryService.getStokOpnameHistory(),
        inventoryService.getMasterBahan()
      ]);
      if (opRes.success) setOpnames(opRes.data);
      if (matRes.success) setMaterials(matRes.data.filter(m => m.is_active));
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleMaterialChange = (e) => {
    const matId = e.target.value;
    const mat = materials.find(m => m.id === matId);
    setSelectedMaterial(mat || null);
    setFormData({ 
      ...formData, 
      material_id: matId,
      stok_sistem: mat ? mat.stok_saat_ini : 0,
      stok_fisik: ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.material_id || formData.stok_fisik === '') {
      setError('Bahan dan stok fisik wajib diisi');
      return;
    }

    setSaving(true);
    setError(null);
    
    const payload = {
      tanggal: formData.tanggal,
      material_id: formData.material_id,
      stok_sistem: formData.stok_sistem,
      stok_fisik: Number(formData.stok_fisik),
      catatan: formData.catatan,
      dilakukan_oleh: userProfile?.id
    };

    const res = await inventoryService.createStokOpname(payload);
    
    if (res.success) {
      setSuccess('Stok opname berhasil dicatat dan saldo disesuaikan');
      setShowModal(false);
      loadData();
    } else {
      setError(res.error);
    }
    setSaving(false);
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('id-ID');

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

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Settings className="text-primary-600" />
          Riwayat Stok Opname
        </h3>
        <button
          onClick={() => {
            setFormData({
              tanggal: new Date().toISOString().substring(0, 10),
              material_id: '',
              stok_sistem: 0,
              stok_fisik: '',
              catatan: ''
            });
            setSelectedMaterial(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} /> Lakukan Opname Baru
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bahan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok Sistem</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok Fisik</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Selisih</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Petugas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {opnames.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500">Belum ada riwayat stok opname.</td></tr>
                ) : (
                  opnames.map(op => {
                    const diff = op.stok_fisik - op.stok_sistem;
                    return (
                      <tr key={op.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300 whitespace-nowrap">{formatDate(op.tanggal)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{op.master_bahan?.nama_bahan}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-500 dark:text-gray-400">{op.stok_sistem} {op.master_bahan?.satuan_dasar}</td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900 dark:text-white">{op.stok_fisik} {op.master_bahan?.satuan_dasar}</td>
                        <td className={`px-6 py-4 text-sm text-right font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{op.users?.full_name || 'System'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {op.catatan ? (
                            <div className="flex items-center gap-1"><FileText size={14} className="text-gray-400"/> {op.catatan}</div>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add Opname */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="text-primary-600" />
                Stok Opname
              </h3>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal</label>
                <input 
                  type="date" required
                  value={formData.tanggal} 
                  onChange={e => setFormData({...formData, tanggal: e.target.value})} 
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bahan</label>
                <select 
                  required
                  value={formData.material_id} 
                  onChange={handleMaterialChange} 
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">-- Pilih Bahan --</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.kode_bahan} - {m.nama_bahan}</option>)}
                </select>
              </div>

              {selectedMaterial && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <label className="block text-xs text-gray-500 mb-1">Stok Sistem (Saat Ini)</label>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {formData.stok_sistem} <span className="text-sm font-normal text-gray-500">{selectedMaterial.satuan_dasar}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stok Fisik Aktual *</label>
                    <input 
                      type="number" step="any" required
                      value={formData.stok_fisik} 
                      onChange={e => setFormData({...formData, stok_fisik: e.target.value})} 
                      className="w-full border rounded-lg px-3 py-2 text-lg font-bold text-primary-700 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-primary-400"
                    />
                  </div>
                </div>
              )}

              {selectedMaterial && formData.stok_fisik !== '' && (
                <div className={`p-3 rounded-lg text-sm font-medium ${Number(formData.stok_fisik) === formData.stok_sistem ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                  Selisih: {Number(formData.stok_fisik) - formData.stok_sistem} {selectedMaterial.satuan_dasar}
                  {Number(formData.stok_fisik) !== formData.stok_sistem && ' (Stok sistem akan disesuaikan)'}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
                <input 
                  type="text" 
                  placeholder="Alasan selisih (rusak, hilang, dll)..."
                  value={formData.catatan} 
                  onChange={e => setFormData({...formData, catatan: e.target.value})} 
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">
                  {saving ? 'Memproses...' : 'Simpan Opname'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockOpname;
