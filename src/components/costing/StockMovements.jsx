import React, { useState, useEffect } from 'react';
import { List, Search, Filter } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import { inventoryService } from '../../services/inventoryService';

const StockMovements = () => {
  const [movements, setMovements] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    materialId: '',
    tipe: 'all',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    loadMovements();
  }, [filters]);

  const loadMaterials = async () => {
    const res = await inventoryService.getMasterBahan();
    if (res.success) setMaterials(res.data);
  };

  const loadMovements = async () => {
    setLoading(true);
    setError(null);
    const res = await inventoryService.getStokMovements(filters);
    if (res.success) {
      setMovements(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleString('id-ID');

  const getTipeBadge = (tipe) => {
    switch(tipe) {
      case 'masuk': return <span className="inline-flex px-2 py-1 text-[10px] font-medium rounded-full bg-green-100 text-green-700">Masuk</span>;
      case 'keluar': return <span className="inline-flex px-2 py-1 text-[10px] font-medium rounded-full bg-red-100 text-red-700">Keluar</span>;
      case 'opname': return <span className="inline-flex px-2 py-1 text-[10px] font-medium rounded-full bg-orange-100 text-orange-700">Opname</span>;
      case 'penyesuaian': return <span className="inline-flex px-2 py-1 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">Penyesuaian</span>;
      default: return <span className="inline-flex px-2 py-1 text-[10px] font-medium rounded-full bg-gray-100 text-gray-700">{tipe}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-500 mb-1">Filter Bahan</label>
          <select 
            value={filters.materialId}
            onChange={e => setFilters({...filters, materialId: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Semua Bahan</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.kode_bahan} - {m.nama_bahan}</option>)}
          </select>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipe Mutasi</label>
          <select 
            value={filters.tipe}
            onChange={e => setFilters({...filters, tipe: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">Semua Tipe</option>
            <option value="masuk">Masuk (Pembelian)</option>
            <option value="keluar">Keluar (Pemakaian)</option>
            <option value="opname">Opname (Selisih)</option>
          </select>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
          <input 
            type="date"
            value={filters.startDate}
            onChange={e => setFilters({...filters, startDate: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
          <input 
            type="date"
            value={filters.endDate}
            onChange={e => setFilters({...filters, endDate: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bahan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Perubahan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo Stok</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Harga @</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catatan / Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {movements.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500">Tidak ada riwayat pergerakan stok.</td></tr>
                ) : (
                  movements.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(m.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {m.master_bahan?.nama_bahan}
                      </td>
                      <td className="px-6 py-4">
                        {getTipeBadge(m.tipe)}
                      </td>
                      <td className={`px-6 py-4 text-sm text-right font-bold ${m.jumlah > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.jumlah > 0 ? '+' : ''}{m.jumlah} {m.master_bahan?.satuan_dasar}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-200 font-medium">
                        {m.stok_sesudah} {m.master_bahan?.satuan_dasar}
                      </td>
                      <td className="px-6 py-4 text-xs text-right text-gray-500 dark:text-gray-400">
                        {m.harga_saat_itu ? formatCurrency(m.harga_saat_itu) : '-'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="font-medium text-gray-700 dark:text-gray-300">{m.referensi_tipe}</div>
                        {m.catatan && <div className="text-orange-600 mt-0.5">{m.catatan}</div>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockMovements;
