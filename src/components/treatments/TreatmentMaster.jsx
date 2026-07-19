import { useToast } from '../common/ToastNotification';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Package, DollarSign } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import { treatmentService } from '../../services/treatmentService';

const TreatmentMaster = () => {
  const toast = useToast();
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState(null);
  const [formData, setFormData] = useState({
    kode_treatment: '',
    nama_treatment: '',
    harga_dasar: '',
    kategori: '',
    deskripsi: ''
  });

  useEffect(() => {
    loadTreatments();
  }, []);

  const loadTreatments = async () => {
    setLoading(true);
    const { success, data } = await treatmentService.getAllTreatments();
    if (success) {
      setTreatments(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validasi form
    const errors = [];
    if (!formData.kode_treatment?.trim()) errors.push('Kode treatment wajib diisi');
    if (!formData.nama_treatment?.trim()) errors.push('Nama treatment wajib diisi');
    if (!formData.harga_dasar || parseFloat(formData.harga_dasar) < 0) errors.push('Harga dasar harus diisi dan tidak boleh negatif');
    if (errors.length > 0) {
      toast.error(errors.join('. '));
      return;
    }

    const treatmentData = {
      ...formData,
      harga_dasar: parseFloat(formData.harga_dasar)
    };

    let result;
    if (editingTreatment) {
      result = await treatmentService.updateTreatment(editingTreatment.id, treatmentData);
    } else {
      result = await treatmentService.createTreatment(treatmentData);
    }

    if (result.success) {
      toast.success(editingTreatment ? 'Treatment berhasil diupdate!' : 'Treatment berhasil ditambahkan!');
      loadTreatments();
      closeModal();
    } else {
      toast.error(result.error || 'Gagal menyimpan treatment');
    }
  };

  const handleEdit = (treatment) => {
    setEditingTreatment(treatment);
    setFormData({
      kode_treatment: treatment.kode_treatment,
      nama_treatment: treatment.nama_treatment,
      harga_dasar: treatment.harga_dasar.toString(),
      kategori: treatment.kategori || '',
      deskripsi: treatment.deskripsi || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus treatment ini?')) return;
    
    const { success } = await treatmentService.deleteTreatment(id);
    if (success) {
      toast.success('Treatment berhasil dihapus!');
      loadTreatments();
    } else {
      toast.error('Gagal menghapus treatment');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTreatment(null);
    setFormData({
      kode_treatment: '',
      nama_treatment: '',
      harga_dasar: '',
      kategori: '',
      deskripsi: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const filteredTreatments = treatments.filter(t =>
    t.nama_treatment.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.kode_treatment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ['Pemeriksaan', 'Perawatan', 'Bedah', 'Ortodonti', 'Prostodonti', 'Estetik', 'Lainnya'];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Package className="text-primary-600" size={32} />
          Master Treatment
        </h1>
        <p className="text-gray-600">Kelola daftar perawatan dan harga</p>
      </div>

      {/* Actions Bar */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari treatment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary w-full md:w-auto"
          >
            <Plus size={20} />
            Tambah Treatment
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Treatment</p>
              <p className="text-xl md:text-3xl font-bold text-primary-600">{treatments.length}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <Package className="text-primary-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Harga Rata-rata</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(treatments.reduce((sum, t) => sum + t.harga_dasar, 0) / (treatments.length || 1))}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Harga Tertinggi</p>
              <p className="text-2xl font-bold text-[var(--color-accent)]">
                {formatCurrency(Math.max(...treatments.map(t => t.harga_dasar), 0))}
              </p>
            </div>
            <div className="w-12 h-12 bg-[var(--color-accent)]/10 dark:bg-[var(--color-accent)]/20 rounded-full flex items-center justify-center">
              <DollarSign className="text-[var(--color-accent)]" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Treatment List */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Daftar Treatment</h2>
        {loading ? (
          <LoadingSpinner />
        ) : filteredTreatments.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Tidak ada treatment yang ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Treatment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harga</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTreatments.map((treatment) => (
                  <tr key={treatment.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-sm text-primary-600">
                      {treatment.kode_treatment}
                    </td>
                    <td className="table-cell">
                      <div className="font-semibold text-gray-900">{treatment.nama_treatment}</div>
                      {treatment.deskripsi && (
                        <div className="text-sm text-gray-500 mt-1">{treatment.deskripsi}</div>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {treatment.kategori || 'Lainnya'}
                      </span>
                    </td>
                    <td className="table-cell font-semibold text-green-600">
                      {formatCurrency(treatment.harga_dasar)}
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(treatment)}
                          className="p-2 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 dark:hover:bg-[var(--color-accent)]/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(treatment.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingTreatment ? 'Edit Treatment' : 'Tambah Treatment Baru'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kode Treatment *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.kode_treatment}
                      onChange={(e) => setFormData({ ...formData, kode_treatment: e.target.value })}
                      className="input-field"
                      placeholder="e.g., TRT001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori *
                    </label>
                    <select
                      required
                      value={formData.kategori}
                      onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Pilih Kategori</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Treatment *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama_treatment}
                    onChange={(e) => setFormData({ ...formData, nama_treatment: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Scaling + Polishing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga (IDR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    value={formData.harga_dasar}
                    onChange={(e) => setFormData({ ...formData, harga_dasar: e.target.value })}
                    className="input-field"
                    placeholder="e.g., 250000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi
                  </label>
                  <textarea
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                    className="input-field"
                    rows="3"
                    placeholder="Deskripsi treatment (opsional)"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn btn-primary flex-1">
                    {editingTreatment ? 'Update' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn btn-secondary flex-1"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreatmentMaster;
