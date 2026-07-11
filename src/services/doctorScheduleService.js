import { supabase } from './supabase';

// ─────────────────────────────────────────────
//  Nama hari dalam Bahasa Indonesia (index 0 = Minggu)
// ─────────────────────────────────────────────
export const HARI_LIST = [
  { value: 0, label: 'Minggu' },
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
];

export const getHariLabel = (dayIndex) =>
  HARI_LIST.find((h) => h.value === dayIndex)?.label ?? `Hari ${dayIndex}`;

// ─────────────────────────────────────────────
//  doctorScheduleService
// ─────────────────────────────────────────────
export const doctorScheduleService = {
  // Ambil semua jadwal (admin: semua dokter | dokter: milik sendiri)
  async getAllSchedules() {
    try {
      const { data, error } = await supabase
        .from('doctor_schedules')
        .select(`
          *,
          dokter:users(id, full_name)
        `)
        .order('dokter_id')
        .order('hari');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching schedules:', error);
      return { success: false, error: error.message };
    }
  },

  // Ambil jadwal milik satu dokter
  async getSchedulesByDoctor(dokterId) {
    try {
      const { data, error } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('dokter_id', dokterId)
        .order('hari');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching doctor schedules:', error);
      return { success: false, error: error.message };
    }
  },

  // Ambil SEMUA jadwal aktif (semua hari) — digunakan untuk filtering sisi client
  async getAllActiveSchedules() {
    try {
      const { data, error } = await supabase
        .from('doctor_schedules')
        .select(`
          *,
          dokter:users(id, full_name)
        `)
        .eq('is_active', true)
        .order('hari')
        .order('jam_mulai');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching all active schedules:', error);
      return { success: false, error: error.message };
    }
  },

  // Ambil jadwal aktif untuk hari tertentu (0‑6)
  async getActiveSchedulesByDay(dayIndex) {
    try {
      const { data, error } = await supabase
        .from('doctor_schedules')
        .select(`
          *,
          dokter:users(id, full_name)
        `)
        .eq('hari', dayIndex)
        .eq('is_active', true)
        .order('jam_mulai');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching schedules by day:', error);
      return { success: false, error: error.message };
    }
  },

  // Buat jadwal baru
  async createSchedule(scheduleData) {
    try {
      const { data, error } = await supabase
        .from('doctor_schedules')
        .insert([scheduleData])
        .select(`
          *,
          dokter:users(id, full_name)
        `)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating schedule:', error);
      return { success: false, error: error.message };
    }
  },

  // Update jadwal
  async updateSchedule(id, updates) {
    try {
      const { data, error } = await supabase
        .from('doctor_schedules')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          dokter:users(id, full_name)
        `)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating schedule:', error);
      return { success: false, error: error.message };
    }
  },

  // Toggle aktif / nonaktif
  async toggleScheduleActive(id, isActive) {
    return this.updateSchedule(id, { is_active: isActive });
  },

  // Hapus jadwal
  async deleteSchedule(id) {
    try {
      const { error } = await supabase
        .from('doctor_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting schedule:', error);
      return { success: false, error: error.message };
    }
  },

  // Generate slot waktu (tiap 30 menit) dari jam_mulai s/d jam_selesai
  generateTimeSlots(jamMulai, jamSelesai, intervalMenit = 30) {
    const slots = [];
    const [startH, startM] = jamMulai.split(':').map(Number);
    const [endH, endM] = jamSelesai.split(':').map(Number);

    let current = startH * 60 + startM;
    const end = endH * 60 + endM;

    while (current < end) {
      const h = String(Math.floor(current / 60)).padStart(2, '0');
      const m = String(current % 60).padStart(2, '0');
      slots.push(`${h}:${m}`);
      current += intervalMenit;
    }

    return slots;
  },
};
