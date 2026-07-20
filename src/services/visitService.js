import { supabase } from './supabase.js';
import { encryptionService } from './encryptionService.js';
import { getTodayLocal } from '../utils/dateUtils.js';
import { satusehatService } from './satusehatService.js';

async function decryptVisitsList(list) {
  if (!list || list.length === 0) return list;
  const isArray = Array.isArray(list);
  const items = isArray ? list : [list];

  const payloads = [];
  items.forEach(v => {
    // Visit EMR fields
    payloads.push(v.diagnosa || '');
    payloads.push(v.keluhan || '');
    payloads.push(v.pemeriksaan_fisik || '');
    payloads.push(v.terapi || '');
    payloads.push(v.catatan_dokter || '');

    // Nested Patient PII fields
    if (v.patient) {
      payloads.push(v.patient.nama_lengkap || '');
      payloads.push(v.patient.no_wa || '');
      payloads.push(v.patient.alamat || '');
    }
  });

  const decrypted = await encryptionService.decryptBatch(payloads);

  let idx = 0;
  items.forEach(v => {
    v.diagnosa = decrypted[idx++];
    v.keluhan = decrypted[idx++];
    v.pemeriksaan_fisik = decrypted[idx++];
    v.terapi = decrypted[idx++];
    v.catatan_dokter = decrypted[idx++];

    if (v.patient) {
      v.patient.nama_lengkap = decrypted[idx++];
      v.patient.no_wa = decrypted[idx++];
      v.patient.alamat = decrypted[idx++];
    }
  });

  return list;
}

export const visitService = {
  // Get all visits — lengkap dengan dokter, pasien, dan payment status
  async getAllVisits({ page = 1, limit = 20 } = {}) {
    try {
      const offset = (page - 1) * limit;
      const { data, error, count } = await supabase
        .from('visits')
        .select(`
          *,
          patient:patients(id, nama_lengkap, no_rm, no_wa),
          dokter:users!dokter_id(id, full_name)
        `, { count: 'exact' })
        .order('tanggal_kunjungan', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      const decryptedData = await decryptVisitsList(data);
      return { success: true, data: decryptedData, count };
    } catch (error) {
      console.error('Error fetching visits:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all visits with payment info — untuk VisitHistory timeline
  async getAllVisitsWithPayments({ patientId, dokterIdFilter, dateFrom, dateTo, page = 1, limit = 20 } = {}) {
    try {
      const offset = (page - 1) * limit;
      let query = supabase
        .from('visits')
        .select(`
          *,
          patient:patients(id, nama_lengkap, no_rm, no_wa),
          dokter:users!dokter_id(id, full_name),
          payments(id, invoice_number, total_bayar, status_pembayaran, metode_pembayaran, tanggal_pembayaran)
        `, { count: 'exact' })
        .order('tanggal_kunjungan', { ascending: false });

      if (patientId)       query = query.eq('patient_id', patientId);
      if (dokterIdFilter)  query = query.eq('dokter_id', dokterIdFilter);
      if (dateFrom)        query = query.gte('tanggal_kunjungan', dateFrom);
      if (dateTo)          query = query.lte('tanggal_kunjungan', dateTo);

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      const decryptedData = await decryptVisitsList(data);
      return { success: true, data: decryptedData, count };
    } catch (error) {
      console.error('Error fetching visits with payments:', error);
      return { success: false, error: error.message };
    }
  },

  // Get visits by patient
  async getVisitsByPatient(patientId) {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          dokter:users!dokter_id(full_name),
          payments(id, invoice_number, total_bayar, status_pembayaran, metode_pembayaran)
        `)
        .eq('patient_id', patientId)
        .order('tanggal_kunjungan', { ascending: false });

      if (error) throw error;
      const decryptedData = await decryptVisitsList(data);
      return { success: true, data: decryptedData };
    } catch (error) {
      console.error('Error fetching patient visits:', error);
      return { success: false, error: error.message };
    }
  },

  // Get today's visits
  async getTodayVisits() {
    try {
      const today = getTodayLocal();
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          patient:patients(nama_lengkap, no_rm, no_wa),
          dokter:users!dokter_id(full_name),
          payments(status_pembayaran)
        `)
        .eq('tanggal_kunjungan', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const decryptedData = await decryptVisitsList(data);
      return { success: true, data: decryptedData };
    } catch (error) {
      console.error('Error fetching today visits:', error);
      return { success: false, error: error.message };
    }
  },

  // Get visits by date
  async getVisitsByDate(date) {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          patient:patients(nama_lengkap, no_rm, no_wa),
          dokter:users!dokter_id(full_name)
        `)
        .eq('tanggal_kunjungan', date)
        // FIX Bug #6: order by jam_kunjungan (nulls last) untuk urutan slot yang benar
        .order('jam_kunjungan', { ascending: true, nullsFirst: false });

      if (error) throw error;
      const decryptedData = await decryptVisitsList(data);
      return { success: true, data: decryptedData };
    } catch (error) {
      console.error('Error fetching visits by date:', error);
      return { success: false, error: error.message };
    }
  },

  async getVisitById(visitId) {
    try {
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .select(`
          *,
          patient:patients(*),
          dokter:users!dokter_id(full_name)
        `)
        .eq('id', visitId)
        .single();

      if (visitError) throw visitError;

      const [treatmentsRes, paymentsRes] = await Promise.all([
        supabase
          .from('visit_treatments')
          .select(`*, treatment:treatments(id, nama_treatment, kategori, kode_treatment)`)
          .eq('visit_id', visitId),
        supabase
          .from('payments')
          .select('*')
          .eq('visit_id', visitId)
          .maybeSingle(),
      ]);

      const [decryptedVisit] = await decryptVisitsList([visit]);

      return {
        success: true,
        data: {
          ...decryptedVisit,
          treatments: treatmentsRes.data || [],
          payment: paymentsRes.data || null,
        }
      };
    } catch (error) {
      console.error('Error fetching visit:', error);
      return { success: false, error: error.message };
    }
  },

  async createVisit(visitData) {
    try {
      const user = (await supabase.auth.getUser()).data.user;

      // BUG-B4 FIX: Hapus perhitungan visit_number di frontend (race condition).
      // Trigger set_visit_number() di DB sudah menangani ini secara atomic.
      // Jangan kirim visit_number — biarkan trigger DB yang mengisinya.

      // FIX: Jika visitData sudah menyertakan dokter_id (dipilih resepsionis),
      // gunakan itu. Jika tidak, fallback ke user yang sedang login.
      const finalDokterID = visitData.dokter_id || user?.id;
      // Hapus dokter_id dan visit_number dari payload (keduanya ditangani DB)
      const { dokter_id: _removed, visit_number: _vn, ...visitDataClean } = visitData;

      // Encrypt EMR fields if present
      const encFields = ['diagnosa', 'keluhan', 'pemeriksaan_fisik', 'terapi', 'catatan_dokter'];
      const payloads = [];
      const indices = [];
      encFields.forEach(f => {
        if (visitDataClean[f] !== undefined && visitDataClean[f] !== null) {
          payloads.push(visitDataClean[f]);
          indices.push(f);
        }
      });

      if (payloads.length > 0) {
        const encrypted = await encryptionService.encryptBatch(payloads);
        indices.forEach((f, idx) => {
          visitDataClean[f] = encrypted[idx];
        });
      }

      const { data, error } = await supabase
        .from('visits')
        .insert([{
          ...visitDataClean,
          dokter_id: finalDokterID,
        }])
        .select()
        .single();

      if (error) throw error;
      const decryptedData = data ? (await decryptVisitsList([data]))[0] : data;
      return { success: true, data: decryptedData };
    } catch (error) {
      console.error('Error creating visit:', error);
      return { success: false, error: error.message };
    }
  },

  async updateVisit(visitId, visitData) {
    try {
      const encryptedData = { ...visitData };
      const encFields = ['diagnosa', 'keluhan', 'pemeriksaan_fisik', 'terapi', 'catatan_dokter'];
      const payloads = [];
      const indices = [];
      encFields.forEach(f => {
        if (visitData[f] !== undefined && visitData[f] !== null) {
          payloads.push(visitData[f]);
          indices.push(f);
        }
      });

      if (payloads.length > 0) {
        const encrypted = await encryptionService.encryptBatch(payloads);
        indices.forEach((f, idx) => {
          encryptedData[f] = encrypted[idx];
        });
      }

      const { data, error } = await supabase
        .from('visits')
        .update(encryptedData)
        .eq('id', visitId)
        .select()
        .maybeSingle();

      if (error) throw error;
      const decryptedData = data ? (await decryptVisitsList([data]))[0] : data;

      // Asynchronous / Non-blocking SatuSehat trigger when status becomes completed
      if (decryptedData && decryptedData.status === 'completed') {
        satusehatService.syncVisit(visitId)
          .then(res => {
            if (res.success) {
              console.log(`[SATUSEHAT] Auto-sync clinical resources for visit ${visitId} succeeded.`, res.data);
            } else {
              console.warn(`[SATUSEHAT] Auto-sync clinical resources for visit ${visitId} failed:`, res.error);
            }
          })
          .catch(err => {
            console.error(`[SATUSEHAT] Unexpected error during auto-sync for visit ${visitId}:`, err);
          });
      }

      return { success: true, data: decryptedData };
    } catch (error) {
      console.error('Error updating visit:', error);
      return { success: false, error: error.message };
    }
  },

  // Convenience: update only status field
  async updateVisitStatus(visitId, status) {
    return this.updateVisit(visitId, { status });
  },

  // Add treatment to visit
  async addTreatmentToVisit(visitId, treatmentData) {
    try {
      const { data, error } = await supabase
        .from('visit_treatments')
        .insert([{
          visit_id: visitId,
          ...treatmentData,
          subtotal: treatmentData.quantity * treatmentData.harga_satuan,
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error adding treatment:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove treatment from visit
  async removeTreatmentFromVisit(visitTreatmentId) {
    try {
      const { error } = await supabase
        .from('visit_treatments')
        .delete()
        .eq('id', visitTreatmentId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error removing treatment:', error);
      return { success: false, error: error.message };
    }
  },

  // ─────────────────────────────────────────────────────────────────────
  // BUG-M1 FIX: replaceVisitTreatments — atomik delete-then-insert via RPC
  // ─────────────────────────────────────────────────────────────────────
  async replaceVisitTreatments(visitId, treatmentsArray) {
    try {
      const vtRows = (treatmentsArray || []).map((t) => ({
        treatment_id: t.treatment_id,
        tooth_number: t.tooth_number || null,
        quantity: t.quantity || 1,
        harga_satuan: parseFloat(t.harga_satuan) || 0,
        subtotal: parseFloat(t.subtotal) || 0,
        notes: t.notes || null,
      }));

      const { error } = await supabase.rpc('replace_visit_treatments', {
        p_visit_id: visitId,
        p_treatments: vtRows
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error replacing visit treatments:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete visit
  async deleteVisit(visitId) {
    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting visit:', error);
      return { success: false, error: error.message };
    }
  },

  // Get visit statistics
  async getVisitStatistics(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .gte('tanggal_kunjungan', startDate)
        .lte('tanggal_kunjungan', endDate);

      if (error) throw error;

      const stats = {
        total_visits: data.length,
        completed: data.filter(v => v.status === 'completed').length,
        ongoing: data.filter(v => v.status === 'ongoing').length,
        cancelled: data.filter(v => v.status === 'cancelled').length,
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching visit statistics:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all doctors (for filter dropdown)
  async getAllDoctors() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'dokter')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching doctors:', error);
      return { success: false, error: error.message };
    }
  },

  // Lock/Unlock visit (Phase 4 Finalization)
  async toggleLockVisit(visitId, lockStatus) {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase
        .from('visits')
        .update({
          is_locked: lockStatus,
          locked_at: lockStatus ? new Date().toISOString() : null,
          locked_by: lockStatus ? user?.id : null
        })
        .eq('id', visitId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error toggling visit lock:', error);
      return { success: false, error: error.message };
    }
  },
};
