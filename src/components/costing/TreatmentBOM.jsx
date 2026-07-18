import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Search, Plus, Trash2, CheckCircle, AlertCircle, RefreshCw, Save } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import { costingService } from '../../services/costingService';
import { inventoryService } from '../../services/inventoryService';
import { treatmentService } from '../../services/treatmentService';

const TreatmentBOM = () => {
  const [treatments, setTreatments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  
  const [bomItems, setBomItems] = useState([]);
  const [bomLoading, setBomLoading] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    material_id: '',
    qty_rata2: '',
    wajib: true,
    wastage_percent: 0,
    catatan: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [treatsRes, matsRes] = await Promise.all([
        treatmentService.getAllTreatments(),
        inventoryService.getMasterBahan()
      ]);
      
      if (treatsRes.success) setTreatments(treatsRes.data);
      if (matsRes.success) setMaterials(matsRes.data.filter(m => m.is_active));
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const loadBOM = async (treatmentId) => {
    setBomLoading(true);
    const res = await costingService.getTreatmentMaterials(treatmentId);
    if (res.success) {
      setBomItems(res.data);
    } else {
      setError(res.error);
    }
    setBomLoading(false);
  };

  const handleSelectTreatment = (t) => {
    setSelectedTreatment(t);
    loadBOM(t.id);
  };

  const handleSaveBOM = async () => {
    if (!formData.material_id || !formData.qty_rata2) {
      setError('Bahan dan rata-rata pemakaian wajib diisi');
      return;
    }
    setSaving(true);
    const payload = {
      treatment_id: selectedTreatment.id,
      material_id: formData.material_id,
      qty_rata2: Number(formData.qty_rata2),
      wajib: formData.wajib,
      wastage_percent: Number(formData.wastage_percent) || 0,
      catatan: formData.catatan
    };

    const res = await costingService.upsertTreatmentMaterial(payload);
    if (res.success) {
      setSuccess('Bahan berhasil ditambahkan ke resep perawatan');
      setShowAddModal(false);
      loadBOM(selectedTreatment.id);
    } else {
      setError(res.error);
    }
    setSaving(false);
  };

  const handleDeleteBOM = async (id) => {
    if (!confirm('Hapus bahan ini dari resep perawatan?')) return;
    const res = await costingService.deleteTreatmentMaterial(id);
    if (res.success) {
      setSuccess('Bahan dihapus dari resep');
      loadBOM(selectedTreatment.id);
    } else {
      setError(res.error);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const filteredTreatments = treatments.filter(t => 
    t.nama_treatment.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.kategori && t.kategori.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <LoadingSpinner />;

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
        {/* Panel Kiri: Daftar Treatment */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Pilih Perawatan</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Cari perawatan..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredTreatments.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectTreatment(t)}
                className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${selectedTreatment?.id === t.id ? 'bg-primary-50 border border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-400' : 'hover:bg-gray-50 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50'}`}
              >
                <div className="font-medium text-sm">{t.nama_treatment}</div>
                <div className="text-xs opacity-70 mt-0.5">{t.kategori} &bull; {t.tier}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Panel Kanan: Bill of Materials (BOM) */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
          {!selectedTreatment ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <FileSpreadsheet size={48} className="mb-4 opacity-50" />
              <p>Pilih salah satu perawatan di samping untuk melihat resep bahannya (BOM).</p>
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedTreatment.nama_treatment}</h2>
                  <p className="text-sm text-gray-500">Harga Jual Dasar: {formatCurrency(selectedTreatment.harga_dasar)}</p>
                </div>
                <button
                  onClick={() => {
                    setFormData({ material_id: '', qty_rata2: '', wajib: true, wastage_percent: 0, catatan: '' });
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  <Plus size={16} /> Tambah Bahan
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {bomLoading ? (
                  <div className="py-12"><LoadingSpinner /></div>
                ) : bomItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>Resep bahan belum diatur untuk perawatan ini.</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Bahan</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Rata2</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Est. Biaya</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {bomItems.map(item => {
                        const estBiaya = item.qty_rata2 * (1 + (item.wastage_percent/100)) * item.master_bahan.harga_rata2;
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{item.master_bahan.nama_bahan}</div>
                              {item.catatan && <div className="text-xs text-gray-500 mt-0.5">{item.catatan}</div>}
                            </td>
                            <td className="px-6 py-4 text-sm text-right">
                              <span className="font-semibold text-gray-900 dark:text-gray-200">{item.qty_rata2}</span> {item.master_bahan.satuan_dasar}
                              {item.wastage_percent > 0 && <div className="text-xs text-red-500 mt-0.5">+ {item.wastage_percent}% waste</div>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">
                              {formatCurrency(estBiaya)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex px-2 py-1 text-[10px] font-medium rounded-full ${item.wajib ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                {item.wajib ? 'Wajib' : 'Opsional'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => handleDeleteBOM(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-900/50 sticky bottom-0 border-t border-gray-200 dark:border-gray-700">
                      <tr>
                        <td colSpan="2" className="px-6 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">Total Estimasi Biaya Bahan:</td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-primary-600 dark:text-primary-400">
                          {formatCurrency(bomItems.reduce((sum, item) => sum + (item.qty_rata2 * (1 + (item.wastage_percent/100)) * item.master_bahan.harga_rata2), 0))}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Add BOM Item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tambah Bahan ke BOM</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedTreatment?.nama_treatment}</p>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilih Master Bahan *</label>
                <select 
                  value={formData.material_id} 
                  onChange={e => setFormData({...formData, material_id: e.target.value})} 
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">-- Pilih Bahan --</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.nama_bahan} ({m.stok_saat_ini} {m.satuan_dasar})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qty Rata2 *</label>
                  <input 
                    type="number" min="0.001" step="any"
                    value={formData.qty_rata2} 
                    onChange={e => setFormData({...formData, qty_rata2: e.target.value})} 
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Dalam satuan: {materials.find(m => m.id === formData.material_id)?.satuan_dasar || '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wastage (%)</label>
                  <input 
                    type="number" min="0" max="99"
                    value={formData.wastage_percent} 
                    onChange={e => setFormData({...formData, wastage_percent: e.target.value})} 
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
                <input 
                  type="text" 
                  value={formData.catatan} 
                  onChange={e => setFormData({...formData, catatan: e.target.value})} 
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                />
              </div>
              <div className="flex items-center gap-2 mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <input 
                  type="checkbox" 
                  id="wajib" 
                  checked={formData.wajib} 
                  onChange={e => setFormData({...formData, wajib: e.target.checked})} 
                  className="w-4 h-4 rounded text-blue-600" 
                />
                <label htmlFor="wajib" className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  Bahan Wajib (otomatis dipotong dari stok saat selesai)
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Batal</button>
              <button onClick={handleSaveBOM} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreatmentBOM;
