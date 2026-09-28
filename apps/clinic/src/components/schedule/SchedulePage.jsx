import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon, Clock, Users, Filter,
  RefreshCw, Plus, X, Search, UserCheck, ChevronDown,
  AlertCircle, CheckCircle2, Stethoscope,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { visitService } from '../../services/visitService';
import { useToast } from '../common/ToastNotification';
import { patientService } from '../../services/patientService';
import { doctorScheduleService, getHariLabel } from '../../services/doctorScheduleService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusColor = {
  scheduled: 'bg-blue-100 text-blue-800',
  ongoing:   'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};
const statusLabel = {
  scheduled: 'Terjadwal',
  ongoing:   'Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const getDisplayTime = (visit) =>
  visit.jam_kunjungan ? visit.jam_kunjungan.substring(0, 5) : '—';

const dayOfWeek = (dateStr) => new Date(dateStr + 'T00:00:00').getDay();

const initForm = (dateStr) => ({
  patient_id:        '',
  patient_name:      '',
  tanggal_kunjungan: dateStr,
  jam_kunjungan:     '',
  keluhan:           '',
  status:            'scheduled',
  dokter_id:         '',
});

// ─── Main Component ───────────────────────────────────────────────────────────

const SchedulePage = () => {
  const { userProfile } = useAuth();
  const navigate        = useNavigate();

  // ── State utama ─────────────────────────────────────────────────────────────
  const [visits,       setVisits]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [weekVisits,   setWeekVisits]   = useState([]);

  const getWeekDates = (dateStr) => {
    const current = new Date(dateStr + 'T00:00:00');
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const getDayLabelShort = (dayIndex) => {
    return ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dayIndex];
  };

  // dokter filter di daftar kunjungan
  const [filterDokter,  setFilterDokter]  = useState('all');
  const [allDoctors,    setAllDoctors]    = useState([]);

  // ── Jadwal praktek hari ini ─────────────────────────────────────────────────
  const [daySchedules,     setDaySchedules]     = useState([]);   // jadwal dokter aktif hari ini
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // ── Modal tambah jadwal ─────────────────────────────────────────────────────
  const [showModal,      setShowModal]      = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [patientSearch,  setPatientSearch]  = useState('');
  const [searchResults,  setSearchResults]  = useState([]);
  const [searching,      setSearching]      = useState(false);
  const [formData,       setFormData]       = useState(initForm(new Date().toISOString().split('T')[0]));
  const [availableSlots, setAvailableSlots] = useState([]);   // slot waktu dari jadwal dokter terpilih
  const [takenSlots,     setTakenSlots]     = useState([]);   // slot yang sudah terpakai di tanggal itu

  const isAdminOrResepsionis =
    userProfile?.role === 'admin' || userProfile?.role === 'resepsionis';

  // ── Load visits ─────────────────────────────────────────────────────────────
  const loadVisits = useCallback(async () => {
    setLoading(true);
    const result = await visitService.getVisitsByDate(selectedDate);
    if (result.success) {
      setVisits(result.data || []);
      // Simpan taken slots untuk selectedDate (tampilan kalender)
      const taken = (result.data || [])
        .filter(v => v.jam_kunjungan && v.status !== 'cancelled')
        .map(v => ({
          dokter_id: v.dokter_id,
          jam: v.jam_kunjungan.substring(0, 5),
          tanggal: selectedDate,   // FIX Bug #4: tandai slot dengan tanggalnya
        }));
      setTakenSlots(taken);
    }

    const weekDates = getWeekDates(selectedDate);
    const startOfWeek = weekDates[0];
    const endOfWeek = weekDates[6];
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('id, dokter_id, jam_kunjungan, tanggal_kunjungan, status')
        .gte('tanggal_kunjungan', startOfWeek)
        .lte('tanggal_kunjungan', endOfWeek);
      if (!error && data) {
        setWeekVisits(data);
      }
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }, [selectedDate]);

  // FIX Bug #4: fetch taken slots untuk tanggal form jika berbeda dari selectedDate
  const loadTakenSlotsForDate = useCallback(async (date) => {
    if (date === selectedDate) return; // sudah ada di takenSlots
    const result = await visitService.getVisitsByDate(date);
    if (result.success) {
      const taken = (result.data || [])
        .filter(v => v.jam_kunjungan && v.status !== 'cancelled')
        .map(v => ({
          dokter_id: v.dokter_id,
          jam: v.jam_kunjungan.substring(0, 5),
          tanggal: date,
        }));
      setTakenSlots(prev => [
        ...prev.filter(t => t.tanggal !== date), // hapus data lama untuk tanggal ini
        ...taken,
      ]);
    }
  }, [selectedDate]);

  // ── Load SEMUA jadwal dokter aktif (semua hari) ─────────────────────────────
  // FIX Bug #1: Dulu hanya load jadwal untuk 1 hari (selectedDate), sehingga
  // saat user mengubah tanggal_kunjungan di modal ke hari berbeda, daySchedules
  // tidak punya data hari tersebut → slot waktu kosong & badge "✓ praktek" salah.
  // Solusi: load semua hari sekaligus, filter per-hari di sisi client.
  const loadDaySchedules = useCallback(async () => {
    setLoadingSchedules(true);
    const result = await doctorScheduleService.getAllActiveSchedules();
    setDaySchedules(result.success ? result.data || [] : []);
    setLoadingSchedules(false);
  }, []);

  // ── Load daftar semua dokter (untuk filter & dropdown) ───────────────────────
  const loadDoctors = useCallback(async () => {
    const result = await visitService.getAllDoctors();
    if (result.success) setAllDoctors(result.data || []);
  }, []);

  // ── Effect: setiap selectedDate berubah ──────────────────────────────────────
  useEffect(() => {
    loadVisits();
    loadDaySchedules();
    if (isAdminOrResepsionis) loadDoctors();
  }, [selectedDate, loadVisits, loadDaySchedules, loadDoctors, isAdminOrResepsionis]);

  // ── Saat statusFilter berubah, tidak perlu fetch ulang — filter lokal ────────
  const filteredVisits = visits.filter(v => {
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchDokter = filterDokter === 'all'  || v.dokter_id === filterDokter;
    return matchStatus && matchDokter;
  });

  // ── Summary stats (dari visits mentah, bukan filtered) ──────────────────────
  const summaryStats = [
    { label: 'Terjadwal',   value: visits.filter(v => v.status === 'scheduled').length,  color: 'blue'   },
    { label: 'Berlangsung', value: visits.filter(v => v.status === 'ongoing').length,    color: 'yellow' },
    { label: 'Selesai',     value: visits.filter(v => v.status === 'completed').length,  color: 'green'  },
    { label: 'Dibatalkan',  value: visits.filter(v => v.status === 'cancelled').length,  color: 'red'    },
  ];

  // ── Update slot saat dokter atau tanggal di form berubah ─────────────────────
  useEffect(() => {
    if (!formData.dokter_id) { setAvailableSlots([]); return; }

    const dow     = dayOfWeek(formData.tanggal_kunjungan);
    const sched   = daySchedules.find(
      s => s.dokter_id === formData.dokter_id && s.hari === dow
    );

    if (!sched) {
      setAvailableSlots([]);
      return;
    }

    const interval = doctorScheduleService.calculateSlotInterval(sched.jam_mulai.substring(0, 5), sched.jam_selesai.substring(0, 5), sched.kapasitas_pasien_per_hari);
    const slots = doctorScheduleService.generateTimeSlots(
      sched.jam_mulai.substring(0, 5),
      sched.jam_selesai.substring(0, 5),
      interval
    );
    setAvailableSlots(slots);
  }, [formData.dokter_id, formData.tanggal_kunjungan, daySchedules]);

  // ── Patient search ───────────────────────────────────────────────────────────
  const handlePatientSearch = async (val) => {
    setPatientSearch(val);
    if (val.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const result = await patientService.searchPatients(val);
    setSearchResults(result.success ? result.data || [] : []);
    setSearching(false);
  };

  const selectPatient = (patient) => {
    setFormData(prev => ({ ...prev, patient_id: patient.id, patient_name: patient.nama_lengkap }));
    setPatientSearch('');
    setSearchResults([]);
  };

  // ── Saat dokter di-form berubah, reset jam ───────────────────────────────────
  const handleDokterChange = (dokterId) => {
    setFormData(prev => ({ ...prev, dokter_id: dokterId, jam_kunjungan: '' }));
  };

  // ── Saat tanggal form berubah, pastikan takenSlots tersedia ─────────────────
  const handleFormDateChange = (date) => {
    setFormData(prev => ({ ...prev, tanggal_kunjungan: date, jam_kunjungan: '' }));
    loadTakenSlotsForDate(date); // FIX Bug #4: fetch slots untuk tanggal baru
  };

  // ── Cek apakah slot sudah terpakai (filter berdasarkan tanggal form) ─────────
  const isSlotTaken = (slot) =>
    takenSlots.some(
      t => t.dokter_id === formData.dokter_id &&
           t.jam === slot &&
           t.tanggal === formData.tanggal_kunjungan  // FIX Bug #4: filter by date
    );

  // ── Save jadwal ──────────────────────────────────────────────────────────────
  const handleSaveSchedule = async () => {
    if (!formData.patient_id) { toast.error('Pilih pasien terlebih dahulu'); return; }
    if (!formData.tanggal_kunjungan) { toast.error('Pilih tanggal kunjungan'); return; }
    if (isAdminOrResepsionis && !formData.dokter_id) {
      toast.error('Pilih dokter yang bertugas'); return;
    }

    setSaving(true);
    try {
      const payload = {
        patient_id:        formData.patient_id,
        tanggal_kunjungan: formData.tanggal_kunjungan,
        jam_kunjungan:     formData.jam_kunjungan || null,
        keluhan:           formData.keluhan,
        status:            formData.status,
      };
      if (formData.dokter_id) payload.dokter_id = formData.dokter_id;

      const result = await visitService.createVisit(payload);
      if (result.success) {
        toast.success('Jadwal berhasil disimpan!');
        setShowModal(false);
        resetForm();
        loadVisits();
        loadDaySchedules();
      } else {
        toast.error(result.error || 'Gagal menyimpan jadwal');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData(initForm(selectedDate));
    setPatientSearch('');
    setSearchResults([]);
    setAvailableSlots([]);
  };

  const handleUpdateStatus = async (visitId, newStatus) => {
    const result = await visitService.updateVisit(visitId, { status: newStatus });
    if (result.success) loadVisits();
    else toast.error('Gagal update status: ' + (result.error || 'Unknown error'));
  };

  const openModal = () => {
    setFormData(initForm(selectedDate));
    setAvailableSlots([]);
    setShowModal(true);
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jadwal Kunjungan</h1>
          <p className="text-sm text-gray-500 mt-1">
            {getHariLabel(dayOfWeek(selectedDate))},{' '}
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { loadVisits(); loadDaySchedules(); }}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {userProfile?.role !== 'resepsionis' && (
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm hover:bg-[var(--color-accent-secondary)] transition-colors shadow-lg shadow-[var(--color-accent)]/20"
            >
              <Plus size={14} /> Tambah Jadwal
            </button>
          )}
        </div>
      </div>

      {/* ── Weekly Calendar Selector ────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-2 md:gap-3 no-print">
        {getWeekDates(selectedDate).map((dateStr) => {
          const d = new Date(dateStr + 'T00:00:00');
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const dow = d.getDay();
          const dayDocs = daySchedules.filter(s => s.hari === dow);
          
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(dateStr)}
              className={`p-2.5 rounded-2xl border transition-all text-left flex flex-col justify-between h-full min-h-[110px] ${
                isSelected
                  ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20'
                  : 'glass-panel hover:bg-gray-50/50 dark:hover:bg-gray-850/50'
              }`}
            >
              <div className="w-full flex justify-between items-start">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                  {getDayLabelShort(dow)}
                </span>
                {isToday && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[var(--color-accent)]'} animate-pulse`} />
                )}
              </div>
              
              <div className={`text-xl font-extrabold my-1 ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {d.getDate()}
              </div>

              {dayDocs.length > 0 ? (
                <div className="w-full mt-1 space-y-1">
                  {dayDocs.map(s => {
                    const interval = doctorScheduleService.calculateSlotInterval(s.jam_mulai.substring(0, 5), s.jam_selesai.substring(0, 5), s.kapasitas_pasien_per_hari);
                    const slots = doctorScheduleService.generateTimeSlots(
                      s.jam_mulai.substring(0, 5),
                      s.jam_selesai.substring(0, 5),
                      interval
                    );
                    const taken = weekVisits.filter(
                      v => v.dokter_id === s.dokter_id && 
                           v.tanggal_kunjungan === dateStr && 
                           v.status !== 'cancelled' && 
                           v.jam_kunjungan
                    ).length;
                    const avail = slots.length - taken;
                    const nameShort = s.dokter?.full_name ? s.dokter.full_name.split(' ').slice(0, 2).map(n => n[0]).join('') : 'Dr';
                    
                    return (
                      <div 
                        key={s.id} 
                        className={`flex justify-between items-center text-[9px] px-1 py-0.5 rounded font-mono ${
                          isSelected 
                            ? 'bg-white/20 text-white border-white/10' 
                            : 'bg-[var(--color-accent)]/5 dark:bg-[var(--color-accent)]/10 text-[var(--color-accent)] dark:text-[var(--color-accent-secondary)] border-[var(--color-accent)]/10'
                        } border`}
                      >
                        <span className="font-semibold truncate max-w-[24px]" title={s.dokter?.full_name}>{nameShort}</span>
                        <span>{avail}/{slots.length}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className={`text-[9px] italic ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
                  Libur
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Date picker */}
        <div className="flex items-center gap-2">
          <CalendarIcon size={16} className="text-gray-400 dark:text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="glass-input border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400 dark:text-gray-500" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="glass-input border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
          >
            <option value="all">Semua Status</option>
            <option value="scheduled">Terjadwal</option>
            <option value="ongoing">Berlangsung</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>

        {/* Dokter filter — admin & resepsionis */}
        {isAdminOrResepsionis && allDoctors.length > 0 && (
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="text-gray-400 dark:text-gray-500" />
            <select
              value={filterDokter}
              onChange={e => setFilterDokter(e.target.value)}
              className="glass-input border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            >
              <option value="all">Semua Dokter</option>
              {allDoctors.map(d => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Panel Dokter Praktek Hari Ini ────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 bg-[var(--color-accent)]/5 dark:bg-[var(--color-accent)]/10 border-b border-[var(--color-accent)]/10 dark:border-[var(--color-accent)]/20 flex items-center gap-2">
          <Stethoscope size={16} className="text-[var(--color-accent)]" />
          <span className="font-semibold text-[var(--color-accent)] dark:text-gray-200 text-sm">
            Dokter Praktek — {getHariLabel(dayOfWeek(selectedDate))}
          </span>
          {loadingSchedules && (
            <span className="ml-2 w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {!loadingSchedules && daySchedules.filter(s => s.hari === dayOfWeek(selectedDate)).length === 0 ? (
          <div className="px-5 py-4 text-sm text-gray-400 flex items-center gap-2">
            <AlertCircle size={15} />
            Tidak ada dokter yang praktek pada hari ini.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {daySchedules.filter(s => s.hari === dayOfWeek(selectedDate)).map(sched => {
              const interval = doctorScheduleService.calculateSlotInterval(sched.jam_mulai.substring(0, 5), sched.jam_selesai.substring(0, 5), sched.kapasitas_pasien_per_hari);
              const slots = doctorScheduleService.generateTimeSlots(
                sched.jam_mulai.substring(0, 5),
                sched.jam_selesai.substring(0, 5),
                interval
              );
              const takenCount = takenSlots.filter(t => t.dokter_id === sched.dokter_id && t.tanggal === selectedDate).length;
              const freeCount  = slots.length - takenCount;

              return (
                <div key={sched.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  {/* Nama dokter */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/10 dark:bg-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
                      <UserCheck size={14} className="text-[var(--color-accent)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">
                        {sched.dokter?.full_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {sched.jam_mulai.substring(0, 5)} – {sched.jam_selesai.substring(0, 5)}
                        {sched.keterangan && ` · ${sched.keterangan}`}
                      </p>
                    </div>
                  </div>

                  {/* Slot summary */}
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                      <CheckCircle2 size={11} />
                      {freeCount} slot tersedia
                    </span>
                    <span className="text-gray-400">{slots.length} total slot</span>
                  </div>

                  {/* Slot pills */}
                  <div className="flex flex-wrap gap-1 mt-1 sm:mt-0">
                    {slots.map(slot => {
                      const taken = takenSlots.some(
                        t => t.dokter_id === sched.dokter_id && t.jam === slot && t.tanggal === selectedDate
                      );
                      return (
                        <span
                          key={slot}
                          title={taken ? 'Sudah terisi' : 'Tersedia'}
                          className={`px-2 py-0.5 rounded text-xs font-mono border ${
                            taken
                              ? 'bg-red-50 text-red-400 border-red-200 line-through'
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}
                        >
                          {slot}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryStats.map(s => (
          <div
            key={s.label}
            className={`glass-panel rounded-xl p-4 text-center border-l-4 border-l-${s.color}-500`}
          >
            <p className={`text-2xl font-bold text-${s.color}-600 dark:text-${s.color}-400`}>{s.value}</p>
            <p className={`text-xs text-gray-600 dark:text-gray-400 mt-1`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Visit List ───────────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredVisits.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CalendarIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Tidak ada kunjungan</p>
          <p className="text-sm mt-1">
            {visits.length > 0
              ? 'Tidak ada kunjungan yang cocok dengan filter.'
              : 'Belum ada jadwal untuk tanggal ini.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVisits.map(visit => (
            <div
              key={visit.id}
              className="glass-panel rounded-xl p-4 hover:border-[var(--color-accent)]/30 transition-colors shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Pasien */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-[var(--color-accent)]/10 rounded-full flex items-center justify-center shrink-0">
                    <Users size={18} className="text-[var(--color-accent)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {visit.patient?.nama_lengkap}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{visit.patient?.no_rm}</p>
                  </div>
                </div>

                {/* Jam */}
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 shrink-0">
                  <Clock size={14} className="text-[var(--color-accent)]" />
                  <span className="font-mono">{getDisplayTime(visit)}</span>
                </div>

                {/* Status badge */}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                    statusColor[visit.status] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {statusLabel[visit.status] || visit.status}
                </span>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => navigate(`/pasien/${visit.patient_id}`)}
                    className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Profil
                  </button>

                  {(userProfile?.role === 'dokter' || userProfile?.role === 'admin') && (
                    <button
                      onClick={() => navigate(`/rekam-medis/${visit.patient_id}`)}
                      className="text-xs px-3 py-1.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 rounded-lg hover:bg-[var(--color-accent)]/20 transition-colors"
                    >
                      Rekam Medis
                    </button>
                  )}

                  {isAdminOrResepsionis && visit.status === 'completed' && (
                    <button
                      onClick={() => navigate(`/pembayaran/${visit.id}`)}
                      className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
                    >
                      Pembayaran
                    </button>
                  )}

                  {visit.status === 'scheduled' && (
                    <button
                      onClick={() => handleUpdateStatus(visit.id, 'ongoing')}
                      className="text-xs px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100"
                    >
                      Mulai
                    </button>
                  )}

                  {visit.status === 'ongoing' && (
                    <button
                      onClick={() => handleUpdateStatus(visit.id, 'completed')}
                      className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
                    >
                      Selesai
                    </button>
                  )}

                  {(visit.status === 'scheduled' || visit.status === 'ongoing') && (
                    <button
                      onClick={() => handleUpdateStatus(visit.id, 'cancelled')}
                      className="text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              </div>

              {/* Keluhan & dokter */}
              <div className="mt-2 pl-1 space-y-0.5">
                {visit.keluhan && (
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Keluhan:</span> {visit.keluhan}
                  </p>
                )}
                {visit.dokter && (
                  <p className="text-xs text-gray-400">
                    Dokter: {visit.dokter.full_name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Tambah Jadwal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md z-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tambah Jadwal Kunjungan</h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Cari Pasien */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pasien <span className="text-red-500">*</span>
                </label>
                {formData.patient_id ? (
                  <div className="flex items-center gap-2 p-3 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-lg">
                    <Users size={16} className="text-[var(--color-accent)]" />
                    <span className="text-sm font-medium text-[var(--color-accent)] flex-1">
                      {formData.patient_name}
                    </span>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, patient_id: '', patient_name: '' }))}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari nama / No RM pasien..."
                      value={patientSearch}
                      onChange={e => handlePatientSearch(e.target.value)}
                      className="glass-input w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                    />
                    {searching && <p className="text-xs text-gray-500 mt-1">Mencari...</p>}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                        {searchResults.map(p => (
                          <button
                            key={p.id}
                            onClick={() => selectPatient(p)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          >
                            <span className="font-medium">{p.nama_lengkap}</span>
                            <span className="text-gray-400 ml-2 font-mono text-xs">{p.no_rm}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pilih Dokter — admin & resepsionis */}
              {isAdminOrResepsionis && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Dokter yang Bertugas{' '}
                    {userProfile?.role === 'resepsionis' && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.dokter_id}
                    onChange={e => handleDokterChange(e.target.value)}
                    className="glass-input w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  >
                    <option value="">— Pilih Dokter —</option>
                    {allDoctors.map(d => {
                      const dow = dayOfWeek(formData.tanggal_kunjungan);
                      const hasSched = daySchedules.some(
                        s => s.dokter_id === d.id && s.hari === dow
                      );
                      return (
                        <option key={d.id} value={d.id}>
                          {d.full_name}{hasSched ? ' ✓ praktek hari ini' : ''}
                        </option>
                      );
                    })}
                  </select>

                  {/* Info: tidak ada jadwal */}
                  {formData.dokter_id &&
                    !daySchedules.some(
                      s =>
                        s.dokter_id === formData.dokter_id &&
                        s.hari === dayOfWeek(formData.tanggal_kunjungan)
                    ) && (
                      <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Dokter ini tidak memiliki jadwal praktek pada hari yang dipilih.
                      </p>
                    )}
                </div>
              )}

              {/* Tanggal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.tanggal_kunjungan}
                  onChange={e => handleFormDateChange(e.target.value)}
                  className="glass-input w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
              </div>

              {/* Pilih Jam — dari slot jadwal dokter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jam Kunjungan
                </label>

                {availableSlots.length > 0 ? (
                  <>
                    <p className="text-xs text-gray-400 mb-2">
                      Pilih slot tersedia (merah = sudah terisi)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableSlots.map(slot => {
                        const taken    = isSlotTaken(slot);
                        const selected = formData.jam_kunjungan === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={taken}
                            onClick={() =>
                              !taken && setFormData(prev => ({ ...prev, jam_kunjungan: slot }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-sm font-mono border transition-all ${
                              taken
                                ? 'bg-red-50 text-red-300 border-red-200 cursor-not-allowed line-through'
                                : selected
                                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm'
                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                    {/* Tetap boleh input manual */}
                    <div className="mt-2">
                      <input
                        type="time"
                        value={formData.jam_kunjungan}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, jam_kunjungan: e.target.value }))
                        }
                        className="glass-input border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                      />
                      <span className="ml-2 text-xs text-gray-400">atau ketik manual</span>
                    </div>
                  </>
                ) : (
                  /* Fallback: input time biasa jika dokter belum dipilih / tidak punya jadwal */
                  <div>
                    <input
                      type="time"
                      value={formData.jam_kunjungan}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, jam_kunjungan: e.target.value }))
                      }
                      className="glass-input w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                    />
                    {isAdminOrResepsionis && !formData.dokter_id && (
                      <p className="mt-1 text-xs text-gray-400">
                        Pilih dokter untuk melihat slot waktu yang tersedia.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Keluhan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keluhan</label>
                <textarea
                  rows={3}
                  value={formData.keluhan}
                  onChange={e => setFormData(prev => ({ ...prev, keluhan: e.target.value }))}
                  placeholder="Keluhan pasien..."
                  className="glass-input w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="glass-input w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                >
                  <option value="scheduled">Terjadwal</option>
                  <option value="ongoing">Berlangsung</option>
                  <option value="completed">Selesai</option>
                </select>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 justify-end sticky bottom-0 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={saving || !formData.patient_id}
                className="px-5 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm hover:bg-[var(--color-accent-secondary)] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
