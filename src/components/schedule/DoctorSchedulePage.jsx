import React, { useState, useEffect } from 'react';
import {
  Clock, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  RefreshCw, X, CheckCircle, AlertCircle, UserCheck,
} from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  doctorScheduleService,
  HARI_LIST,
  getHariLabel,
} from '../../services/doctorScheduleService';
import { visitService } from '../../services/visitService';

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
const initForm = (dokterId = '') => ({
  dokter_id: dokterId,
  hari: 1,           // Senin default
  jam_mulai: '08:00',
  jam_selesai: '17:00',
  is_active: true,
  keterangan: '',
});

const Badge = ({ active }) =>
  active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      <CheckCircle size={11} /> Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
      <AlertCircle size={11} /> Nonaktif
    </span>
  );

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
const DoctorSchedulePage = () => {
  const [schedules, setSchedules] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Filter
  const [filterDoktor, setFilterDoktor] = useState('all');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = tambah baru
  const [formData, setFormData] = useState(initForm());
  const [formError, setFormError] = useState('');

  // Toast sederhana
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load ─────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [schRes, docRes] = await Promise.all([
      doctorScheduleService.getAllSchedules(),
      visitService.getAllDoctors(),
    ]);
    if (schRes.success) setSchedules(schRes.data || []);
    if (docRes.success) setDoctors(docRes.data || []);
    setLoading(false);
  };

  // ── Filter ───────────────────────────────────
  const displayed = filterDoktor === 'all'
    ? schedules
    : schedules.filter((s) => s.dokter_id === filterDoktor);

  // Group per dokter untuk tampilan yang rapi
  const grouped = displayed.reduce((acc, s) => {
    const key = s.dokter_id;
    if (!acc[key]) acc[key] = { dokter: s.dokter, items: [] };
    acc[key].items.push(s);
    return acc;
  }, {});

  // ── Modal helpers ─────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setFormData(initForm(filterDoktor !== 'all' ? filterDoktor : ''));
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (schedule) => {
    setEditTarget(schedule);
    setFormData({
      dokter_id: schedule.dokter_id,
      hari: schedule.hari,
      jam_mulai: schedule.jam_mulai?.substring(0, 5) ?? '08:00',
      jam_selesai: schedule.jam_selesai?.substring(0, 5) ?? '17:00',
      is_active: schedule.is_active,
      keterangan: schedule.keterangan ?? '',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    setFormError('');
  };

  // ── Validasi ──────────────────────────────────
  const validate = () => {
    if (!formData.dokter_id) return 'Pilih dokter terlebih dahulu.';
    if (formData.jam_mulai >= formData.jam_selesai)
      return 'Jam mulai harus lebih awal dari jam selesai.';

    // Cek duplikat (hari + dokter yang sama), kecuali saat edit
    const duplicate = schedules.find(
      (s) =>
        s.dokter_id === formData.dokter_id &&
        s.hari === Number(formData.hari) &&
        s.id !== editTarget?.id
    );
    if (duplicate)
      return `Dokter ini sudah memiliki jadwal pada hari ${getHariLabel(Number(formData.hari))}.`;

    return '';
  };

  // ── Save ──────────────────────────────────────
  const handleSave = async () => {
    try {
      const err = validate();
      if (err) { setFormError(err); return; }

      setSaving(true);
      const payload = {
        ...formData,
        hari: Number(formData.hari),
      };

      const result = editTarget
        ? await doctorScheduleService.updateSchedule(editTarget.id, payload)
        : await doctorScheduleService.createSchedule(payload);

      setSaving(false);

      if (result.success) {
        showToast(editTarget ? 'Jadwal berhasil diperbarui.' : 'Jadwal baru berhasil ditambahkan.');
        closeModal();
        loadAll();
      } else {
        setFormError(result.error || 'Gagal menyimpan jadwal.');
        showToast(result.error || 'Gagal menyimpan jadwal.', 'error');
      }
    } catch (err) {
      setSaving(false);
      setFormError(err.message || 'Terjadi kesalahan sistem.');
      showToast(err.message || 'Terjadi kesalahan sistem.', 'error');
    }
  };

  // ── Toggle aktif ──────────────────────────────
  const handleToggle = async (schedule) => {
    setTogglingId(schedule.id);
    const result = await doctorScheduleService.toggleScheduleActive(
      schedule.id,
      !schedule.is_active
    );
    if (result.success) {
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === schedule.id ? { ...s, is_active: !s.is_active } : s
        )
      );
      showToast(`Jadwal ${!schedule.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } else {
      showToast('Gagal mengubah status.', 'error');
    }
    setTogglingId(null);
  };

  // ── Delete ────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Hapus jadwal ini?')) return;
    setDeletingId(id);
    const result = await doctorScheduleService.deleteSchedule(id);
    if (result.success) {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      showToast('Jadwal dihapus.');
    } else {
      showToast('Gagal menghapus jadwal.', 'error');
    }
    setDeletingId(null);
  };

  // ─────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6 relative">

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jadwal Praktek Dokter</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola hari & jam praktek setiap dokter</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAll}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            <Plus size={14} /> Tambah Jadwal
          </button>
        </div>
      </div>

      {/* Filter Dokter */}
      <div className="flex items-center gap-3">
        <UserCheck size={16} className="text-gray-400 shrink-0" />
        <select
          value={filterDoktor}
          onChange={(e) => setFilterDoktor(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Semua Dokter</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.full_name}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">
          {displayed.length} jadwal ditampilkan
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Clock size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Belum ada jadwal</p>
          <p className="text-sm mt-1">Klik "Tambah Jadwal" untuk mulai mengatur jadwal praktek.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(grouped).map(({ dokter, items }) => (
            <div key={dokter?.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Dokter header */}
              <div className="px-5 py-3 bg-primary-50 border-b border-primary-100 flex items-center gap-2">
                <UserCheck size={16} className="text-primary-600" />
                <span className="font-semibold text-primary-800">{dokter?.full_name ?? '—'}</span>
                <span className="ml-auto text-xs text-primary-600">{items.length} hari praktek</span>
              </div>

              {/* Jadwal per hari */}
              <div className="divide-y divide-gray-100">
                {items
                  .slice()
                  .sort((a, b) => a.hari - b.hari)
                  .map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 ${
                        !schedule.is_active ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Hari */}
                      <div className="w-24 shrink-0">
                        <span className="font-medium text-gray-800 text-sm">
                          {getHariLabel(schedule.hari)}
                        </span>
                      </div>

                      {/* Jam */}
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 flex-1">
                        <Clock size={13} className="text-gray-400" />
                        <span className="font-mono">
                          {schedule.jam_mulai?.substring(0, 5)} – {schedule.jam_selesai?.substring(0, 5)}
                        </span>
                        {schedule.keterangan && (
                          <span className="ml-2 text-xs text-gray-400 italic truncate max-w-[160px]">
                            ({schedule.keterangan})
                          </span>
                        )}
                      </div>

                      {/* Badge */}
                      <Badge active={schedule.is_active} />

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Toggle */}
                        <button
                          onClick={() => handleToggle(schedule)}
                          disabled={togglingId === schedule.id}
                          title={schedule.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        >
                          {schedule.is_active
                            ? <ToggleRight size={18} className="text-green-500" />
                            : <ToggleLeft size={18} />}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => openEdit(schedule)}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                        >
                          <Pencil size={15} />
                        </button>

                        {/* Hapus */}
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          disabled={deletingId === schedule.id}
                          title="Hapus"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Tambah / Edit ─────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editTarget ? 'Edit Jadwal Praktek' : 'Tambah Jadwal Praktek'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Error */}
              {formError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}

              {/* Dokter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dokter <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.dokter_id}
                  onChange={(e) => setFormData({ ...formData, dokter_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— Pilih Dokter —</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Hari */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hari Praktek <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.hari}
                  onChange={(e) => setFormData({ ...formData, hari: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  {HARI_LIST.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>

              {/* Jam */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jam Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.jam_mulai}
                    onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jam Selesai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.jam_selesai}
                    onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keterangan (opsional)
                </label>
                <input
                  type="text"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="mis. Praktek Poli Umum"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Status aktif */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700 select-none">
                  Jadwal aktif (tampil di pilihan slot waktu)
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  editTarget ? 'Simpan Perubahan' : 'Tambah Jadwal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorSchedulePage;
