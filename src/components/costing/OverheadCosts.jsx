import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, CheckCircle, AlertCircle, RefreshCw, Calendar as CalendarIcon, Save } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import { costingService } from '../../services/costingService';

const OverheadCosts = () => {
  const [costs, setCosts] = useState([]);
  const [target, setTarget] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form Overhead Costs
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({
    nama_biaya: '',
    kategori: '',
    jumlah_bulanan: '',
    aktif: true,
    catatan: ''
  });

  // Target Form
  const currentMonth = new Date().toISOString().substring(0, 8) + '01'; // YYYY-MM-01
  const [targetForm, setTargetForm] = useState({
    periode: currentMonth,
    total_overhead_bulanan: '',
    total_bobot_estimasi: '',
    catatan: ''
  });
  
  const [isEditingTarget, setIsEditingTarget] = useState(false);

  useEffect(() => {
    loadData();
  }, [targetForm.periode]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [costsRes, targetRes] = await Promise.all([
        costingService.getOverheadCosts(),
        costingService.getMonthlyOverheadTarget(targetForm.periode)
      ]);

      if (costsRes.success) setCosts(costsRes.data);
      else setError(costsRes.error);

      if (targetRes.success) {
        setTarget(targetRes.data);
        if (targetRes.data) {
          setTargetForm({
            periode: targetRes.data.periode,
            total_overhead_bulanan: targetRes.data.total_overhead_bulanan,
            total_bobot_estimasi: targetRes.data.total_bobot_estimasi,
            catatan: targetRes.data.catatan || ''
          });
        } else {
          // If no target, calculate default from costs sum
          const totalFromCosts = costsRes.data?.filter(c => c.aktif).reduce((sum, c) => sum + Number(c.jumlah_bulanan), 0) || 0;
          setTargetForm(prev => ({
            ...prev,
            total_overhead_bulanan: totalFromCosts,
            total_bobot_estimasi: '',
            catatan: ''
          }));
        }
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSaveCost = async () => {
    if (!formData.nama_biaya || !formData.kategori || !formData.jumlah_bulanan) {
      setError('Nama biaya, kategori, dan jumlah wajib diisi');
      return;
    }
    
    setSaving(true);
    const payload = {
      ...formData,
      id: editTarget?.id,
      jumlah_bulanan: Number(formData.jumlah_bulanan)
    };

    const res = await costingService.upsertOverheadCost(payload);
    if (res.success) {
      setSuccess('Biaya operasional berhasil disimpan');
      closeModal();
      loadData();
    } else {
      setError(res.error);
    }
    setSaving(false);
  };

  const handleDeleteCost = async (id) => {
    if (!confirm('Yakin ingin menghapus biaya ini?')) return;
    const res = await costingService.deleteOverheadCost(id);
    if (res.success) {
      setSuccess('Biaya berhasil dihapus');
      loadData();
    } else {
      setError(res.error);
    }
  };

  const handleSaveTarget = async () => {
    if (!targetForm.total_overhead_bulanan || !targetForm.total_bobot_estimasi) {
      setError('Total overhead dan estimasi bobot wajib diisi');
      return;
    }
    setSaving(true);
    const res = await costingService.setMonthlyOverheadTarget(
      targetForm.periode,
      Number(targetForm.total_overhead_bulanan),
      Number(targetForm.total_bobot_estimasi),
      targetForm.catatan
    );
    if (res.success) {
      setSuccess('Target bulanan berhasil dikunci');
      setIsEditingTarget(false);
      loadData();
    } else {
      setError(res.error);
    }
    setSaving(false);
  };

  const openAddModal = () => {
    setEditTarget(null);
    setFormData({ nama_biaya: '', kategori: '', jumlah_bulanan: '', aktif: true, catatan: '' });
    setShowModal(true);
  };

  const openEditModal = (cost) => {
    setEditTarget(cost);
    setFormData({
      nama_biaya: cost.nama_biaya,
      kategori: cost.kategori,
      jumlah_bulanan: cost.jumlah_bulanan,
      aktif: cost.aktif,
      catatan: cost.catatan || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    setError(null);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  if (loading && costs.length === 0) return <LoadingSpinner />;

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Target Bulanan */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <CalendarIcon size={20} className="text-primary-600" />
              Target & Alokasi Bulanan
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Periode</label>
                <input 
                  type="date" 
                  value={targetForm.periode}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    const period = date.toISOString().substring(0, 8) + '01'; // Selalu tgl 1
                    setTargetForm({...targetForm, periode: period});
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {target && !isEditingTarget ? (
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Overhead</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(target.total_overhead_bulanan)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Est. Total Bobot</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{target.total_bobot_estimasi} unit</span>
                  </div>
                  <div className="pt-3 border-t border-primary-200 dark:border-primary-800 flex justify-between items-center">
                    <span className="text-primary-700 dark:text-primary-400 font-medium text-sm">Alokasi per Unit</span>
                    <span className="font-bold text-primary-700 dark:text-primary-400">{formatCurrency(target.overhead_per_unit_bobot)}</span>
                  </div>
                  <button 
                    onClick={() => setIsEditingTarget(true)}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg text-sm hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                  >
                    <Pencil size={16} /> Edit Target
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Total Overhead Bulanan (Rp)</label>
                    <input 
                      type="number" 
                      value={targetForm.total_overhead_bulanan}
                      onChange={(e) => setTargetForm({...targetForm, total_overhead_bulanan: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      (Diambil otomatis dari total master biaya aktif, bisa dioverride)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Estimasi Total Bobot Tindakan</label>
                    <input 
                      type="number" 
                      value={targetForm.total_bobot_estimasi}
                      onChange={(e) => setTargetForm({...targetForm, total_bobot_estimasi: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    {target && (
                      <button 
                        onClick={() => setIsEditingTarget(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Batal
                      </button>
                    )}
                    <button 
                      onClick={handleSaveTarget}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Save size={16} /> Kunci Target
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Daftar Master Biaya */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Master Biaya Operasional</h3>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus size={16} /> Tambah Biaya
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Biaya</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah (Rp)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {costs.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Belum ada data biaya operasional</td></tr>
                ) : (
                  costs.map((cost) => (
                    <tr key={cost.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{cost.kategori}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {cost.nama_biaya}
                        {cost.catatan && <div className="text-xs text-gray-400 font-normal mt-0.5">{cost.catatan}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-right">
                        {formatCurrency(cost.jumlah_bulanan)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${cost.aktif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {cost.aktif ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(cost)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16}/></button>
                          <button onClick={() => handleDeleteCost(cost.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editTarget ? 'Edit Biaya Operasional' : 'Tambah Biaya Operasional'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori</label>
                <input 
                  type="text" 
                  value={formData.kategori}
                  onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                  placeholder="Utilitas, Sewa, Gaji..."
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Biaya</label>
                <input 
                  type="text" 
                  value={formData.nama_biaya}
                  onChange={(e) => setFormData({...formData, nama_biaya: e.target.value})}
                  placeholder="Listrik, Internet..."
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah Bulanan (Rp)</label>
                <input 
                  type="number" 
                  value={formData.jumlah_bulanan}
                  onChange={(e) => setFormData({...formData, jumlah_bulanan: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
                <input 
                  type="text" 
                  value={formData.catatan}
                  onChange={(e) => setFormData({...formData, catatan: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="aktif"
                  checked={formData.aktif}
                  onChange={(e) => setFormData({...formData, aktif: e.target.checked})}
                  className="w-4 h-4 rounded text-primary-600"
                />
                <label htmlFor="aktif" className="text-sm text-gray-700 dark:text-gray-300">Biaya Aktif</label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
              <button onClick={closeModal} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                Batal
              </button>
              <button 
                onClick={handleSaveCost}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverheadCosts;
