import React, { useState, useEffect } from 'react';
import { FileText, Search, Calendar, User, Filter, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { patientService } from '../../services/patientService';

const MedicalRecordList = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // Server-side pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadRecords();
  }, [page, pageSize, debouncedSearch]);

  const loadRecords = async () => {
    setLoading(true);
    // We rely on patientService.getAllPatients for server-side pagination and search
    const { success, data, count } = await patientService.getAllPatients({
      page,
      limit: pageSize,
      searchTerm: debouncedSearch
    });
    if (success) {
      setRecords(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getFilteredRecords = () => {
    let filtered = records;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.no_rm?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter based on patient created_at (medical_records not available from getAllPatients)
    const now = new Date();
    if (dateFilter === 'today') {
      filtered = filtered.filter(r => {
        const recordDate = new Date(r.created_at);
        return recordDate.toDateString() === now.toDateString();
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(r => new Date(r.created_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(r => new Date(r.created_at) >= monthAgo);
    }

    return filtered;
  };

  const filteredRecords = getFilteredRecords();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <FileText className="text-primary-600" size={32} />
          Rekam Medis
        </h1>
        <p className="text-gray-600">Lihat dan kelola semua rekam medis pasien</p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search size={16} className="inline mr-2" />
              Cari Pasien
            </label>
            <input
              type="text"
              placeholder="Nama atau No. RM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              Filter Tanggal
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="week">7 Hari Terakhir</option>
              <option value="month">30 Hari Terakhir</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Total Pasien</p>
            <p className="text-xl md:text-3xl font-bold text-primary-600">{totalCount}</p>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Total Pasien Aktif</p>
            <p className="text-xl md:text-3xl font-bold text-green-600">
              {totalCount}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Terdaftar Hari Ini</p>
            <p className="text-xl md:text-3xl font-bold text-[var(--color-accent)]">
              {filteredRecords.filter(r => {
                const recordDate = new Date(r.created_at);
                return recordDate.toDateString() === new Date().toDateString();
              }).length}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Terdaftar Bulan Ini</p>
            <p className="text-xl md:text-3xl font-bold text-purple-600">
              {filteredRecords.filter(r => {
                const d = new Date(r.created_at);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Daftar Rekam Medis</h2>
        
        {loading ? (
          <LoadingSpinner />
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Tidak ada rekam medis yang ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    No. RM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pasien
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kontak
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Jumlah Record
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Terakhir Update
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((patient) => {
                  return (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono text-sm text-primary-600">
                        {patient.no_rm}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <User size={20} className="text-primary-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {patient.nama_lengkap}
                            </div>
                            <div className="text-xs text-gray-500">
                              {patient.tanggal_lahir && (
                                <>
                                  {new Date().getFullYear() - new Date(patient.tanggal_lahir).getFullYear()} tahun
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-sm text-gray-600">
                        {patient.no_wa}
                      </td>
                      <td className="table-cell">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                          Lihat Detail
                        </span>
                      </td>
                      <td className="table-cell text-sm text-gray-600">
                        {formatDate(patient.created_at)}
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/pasien/${patient.id}`)}
                            className="btn btn-secondary text-sm"
                          >
                            <Eye size={16} />
                            Detail
                          </button>
                          <button
                            onClick={() => navigate(`/rekam-medis/${patient.id}`)}
                            className="btn btn-primary text-sm"
                          >
                            <FileText size={16} />
                            Rekam Medis
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination UI */}
        {!loading && totalCount > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-800 pt-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Menampilkan <span className="text-gray-900 dark:text-white font-bold">{(page - 1) * pageSize + 1}</span> - <span className="text-gray-900 dark:text-white font-bold">{Math.min(page * pageSize, totalCount)}</span> dari <span className="text-gray-900 dark:text-white font-bold">{totalCount}</span> pasien
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Sebelumnya
              </button>

              <button
                onClick={() => setPage(p => Math.min(p + 1, Math.ceil(totalCount / pageSize)))}
                disabled={page === Math.ceil(totalCount / pageSize) || totalCount === 0}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalRecordList;
