import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import SearchBar from '../common/SearchBar';
import PatientAvatar from '../common/PatientAvatar';
import { useToast } from '../common/ToastNotification';
import { useAuth } from '../../contexts/AuthContext';
import { patientService } from '../../services/patientService';
import { Users, UserPlus, Eye, Edit, Calendar, Phone, MapPin, User, Search, Filter } from 'lucide-react';

const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Server-side Pagination States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, male: 0, female: 0, active: 0 });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const toast = useToast();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // Debounce search term to minimize query hits
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load stats once on mount
  useEffect(() => {
    loadStats();
  }, []);

  // Fetch paginated data
  useEffect(() => {
    loadPatients();
  }, [page, pageSize, debouncedSearch, filterGender, filterStatus]);

  const loadStats = async () => {
    const res = await patientService.getPatientStats();
    if (res.success && res.data) {
      setStats(res.data);
    }
  };

  const loadPatients = async () => {
    try {
      setLoading(true);
      const { success, data, count, error } = await patientService.getAllPatients({
        page,
        limit: pageSize,
        searchTerm: debouncedSearch,
        gender: filterGender,
        status: filterStatus
      });
      
      if (success && data) {
        setPatients(data);
        setTotalCount(count || 0);
      } else {
        toast.error('Gagal memuat data pasien: ' + (error || 'Unknown error'));
        setPatients([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Error loading patients:', err);
      toast.error('Terjadi kesalahan saat memuat data pasien');
      setPatients([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleViewDetail = (patientId) => {
    navigate(`/pasien/${patientId}`);
  };

  const handleCreateSchedule = (patientId) => {
    const role = userProfile?.role;
    if (role === 'dokter') {
      navigate(`/dokter/jadwal`);
    } else if (role === 'resepsionis') {
      navigate(`/resepsionis/jadwal`);
    } else {
      navigate(`/admin/jadwal`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center">
            <Users size={24} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Data Pasien</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total {totalCount} {searchTerm || filterGender !== 'all' || filterStatus !== 'all' ? 'pasien cocok filter' : 'pasien terdaftar'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/pasien/daftar')}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95"
        >
          <UserPlus size={18} />
          Daftar Pasien Baru
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Pasien</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="text-blue-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Laki-laki</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.male}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <User className="text-emerald-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Perempuan</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.female}</p>
            </div>
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <User className="text-rose-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Pasien Aktif</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="text-purple-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="glass-panel overflow-hidden">
        {/* Search & Filter */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                placeholder="Cari nama, No. RM, No. WA, atau alamat..."
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={filterGender}
                  onChange={(e) => { setFilterGender(e.target.value); setPage(1); }}
                  className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-sm appearance-none"
                >
                  <option value="all">Semua Gender</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-sm appearance-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Tidak Aktif</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Patient List */}
        {patients.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchTerm || filterGender !== 'all' || filterStatus !== 'all' 
                ? 'Tidak ada pasien yang sesuai filter' 
                : 'Belum ada data pasien'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm || filterGender !== 'all' || filterStatus !== 'all'
                ? 'Coba ubah filter atau kata kunci pencarian'
                : 'Mulai dengan mendaftarkan pasien baru'}
            </p>
            {!searchTerm && filterGender === 'all' && filterStatus === 'all' && (
              <button
                onClick={() => navigate('/pasien/daftar')}
                className="btn btn-primary"
              >
                <UserPlus size={18} />
                Daftar Pasien Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">No. RM</th>
                  <th className="px-6 py-4 font-semibold">Pasien</th>
                  <th className="px-6 py-4 font-semibold">Kontak & Alamat</th>
                  <th className="px-6 py-4 font-semibold">Info Medis</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">
                        {patient.no_rm}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <PatientAvatar
                          src={patient.foto_profile}
                          name={patient.nama_lengkap}
                          gender={patient.jenis_kelamin}
                          size="sm"
                        />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {patient.nama_lengkap}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {patient.jenis_kelamin} • {patient.umur} tahun
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{patient.no_wa || '-'}</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-1 max-w-[200px]" title={patient.alamat_detail || patient.alamat}>
                            {patient.alamat_detail || patient.alamat || '-'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div><span className="font-medium text-gray-900 dark:text-gray-300">Gol. Darah:</span> {patient.golongan_darah || '-'}</div>
                      <div><span className="font-medium text-gray-900 dark:text-gray-300">Jaminan:</span> {patient.jaminan_kesehatan || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        patient.status === 'active' 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                          : 'bg-gray-50 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${patient.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        {patient.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetail(patient.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye size={18} />
                        </button>
                        {userProfile?.role === 'dokter' && (
                          <button
                            onClick={() => navigate(`/rekam-medis/${patient.id}`)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Rekam Medis"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        {userProfile?.role !== 'resepsionis' && (
                          <button
                            onClick={() => handleCreateSchedule(patient.id)}
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
                            title="Buat Jadwal"
                          >
                            <Calendar size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {patients.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Menampilkan <span className="font-medium text-gray-950 dark:text-white">{(page - 1) * pageSize + 1}</span> -{' '}
                <span className="font-medium text-gray-950 dark:text-white">{Math.min(page * pageSize, totalCount)}</span> dari{' '}
                <span className="font-medium text-gray-950 dark:text-white">{totalCount}</span> pasien
              </p>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Per Halaman:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="glass-input px-2.5 py-1 text-xs rounded-lg bg-transparent border-gray-250"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Sebelumnya
              </button>
              
              {/* Simple numerical pages */}
              {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, idx) => idx + 1)
                .filter(p => p === 1 || p === Math.ceil(totalCount / pageSize) || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          page === p
                            ? 'bg-[var(--color-accent)] text-white shadow-md'
                            : 'border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

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

export default PatientList;
