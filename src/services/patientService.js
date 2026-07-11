import { supabase } from './supabase';

export const patientService = {
  // VIEW FIX: gunakan v_patient_summary untuk mendapat total_visits, last_visit, total_spent dengan paginasi server-side
  async getAllPatients({ page = 1, limit = 20, searchTerm = '', gender = 'all', status = 'all' } = {}) {
    try {
      const offset = (page - 1) * limit;

      let query = supabase
        .from('v_patient_summary')
        .select('*', { count: 'exact' });

      // Apply search term if specified
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.trim();
        query = query.or(`nama_lengkap.ilike.%${term}%,no_rm.ilike.%${term}%,no_wa.ilike.%${term}%,alamat.ilike.%${term}%,alamat_detail.ilike.%${term}%`);
      }

      if (gender && gender !== 'all') {
        query = query.eq('jenis_kelamin', gender);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Add ordering, offset, and limit
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { success: true, data, count };
    } catch (error) {
      console.error('Error fetching paginated patients:', error);
      return { success: false, error: error.message };
    }
  },

  // Query counts for statistics using lightweight HEAD requests
  async getPatientStats() {
    try {
      const [totalRes, maleRes, femaleRes, activeRes] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('jenis_kelamin', 'Laki-laki'),
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('jenis_kelamin', 'Perempuan'),
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'active')
      ]);

      return {
        success: true,
        data: {
          total: totalRes.count || 0,
          male: maleRes.count || 0,
          female: femaleRes.count || 0,
          active: activeRes.count || 0
        }
      };
    } catch (error) {
      console.error('Error fetching patient statistics:', error);
      return { success: false, error: error.message };
    }
  },

  // Tetap query tabel patients langsung — butuh data lengkap
  async getPatientById(id) {
    try {
      const { data, error } = await supabase
        .from('patients').select('*').eq('id', id).single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Tetap query tabel patients langsung — butuh semua join detail
  async getPatientWithDetails(id) {
    try {
      // Resolusi ID: periksa apakah ini visit_id alih-alih patient_id
      const { data: visitCheck } = await supabase.from('visits').select('patient_id').eq('id', id).maybeSingle();
      if (visitCheck) {
        console.log('ID is a visit_id, resolving to patient_id:', visitCheck.patient_id);
      } else {
        console.log('ID is a patient_id:', id);
      }
      const actualPatientId = visitCheck ? visitCheck.patient_id : id;

      const { data: patient, error: patientError } = await supabase
        .from('patients').select('*').eq('id', actualPatientId).single();
      if (patientError) throw patientError;

      const [
        medHistRes,
        clinicalRes,
        visitRes,
        toothRes,
        perioRes,
        extraOralRes,
        treatPlanRes,
        intraOralRes,
        odontMetaRes,
      ] = await Promise.all([
        supabase.from('medical_history').select('*').eq('patient_id', actualPatientId).maybeSingle(),
        supabase.from('clinical_data').select('*').eq('patient_id', actualPatientId).maybeSingle(),
        supabase.from('visits').select('*').eq('patient_id', actualPatientId).order('tanggal_kunjungan', { ascending: false }),
        supabase.from('tooth_conditions').select('*').eq('patient_id', actualPatientId),
        supabase.from('periodontal_data').select('*').eq('patient_id', actualPatientId).maybeSingle(),
        supabase.from('extra_oral_data').select('*').eq('patient_id', actualPatientId).maybeSingle(),
        supabase.from('treatment_plans').select('*').eq('patient_id', actualPatientId).order('prioritas', { ascending: true }),
        supabase.from('intra_oral_data').select('*').eq('patient_id', actualPatientId).maybeSingle(),
        supabase.from('odontogram_meta').select('*').eq('patient_id', actualPatientId).maybeSingle(),
      ]);

      // Map DB columns → frontend state keys untuk medical_history
      const mh = medHistRes.data;
      const medicalHistory = mh ? {
        hipertensi: mh.hipertensi || false,
        jantung: mh.jantung || false,
        asma: mh.asma || false,
        diabetes: mh.diabetes || false,
        alergi: mh.alergi || false,
        alergi_detail: mh.alergi_detail || '',
        riwayat_lain: mh.riwayat_lain || ''
      } : null;

      // Map DB columns → frontend state keys untuk clinical_data
      const cd = clinicalRes.data;
      const clinicalData = cd ? {
        oklusi: cd.oklusi || '',
        torus_palatinus: cd.torus_palatinus || '',
        torus_mandibularis: cd.torus_mandibularis || '',
        palatum: cd.palatum || '',
        supernumery_teeth: cd.supernumery_teeth || '',
        diastema: cd.diastema || '',
        gigi_anomali: cd.gigi_anomali || '',
        lain_lain: cd.lain_lain || '',
        tanggal_pencatatan: cd.tanggal_pencatatan || new Date().toISOString().split('T')[0],
        diagnosis_list: cd.diagnosis_list || [],
        treatment_list: cd.treatment_list || [],
        total_treatment_cost: cd.total_treatment_cost || 0,
        diagnosis_additional_notes: cd.diagnosis_additional_notes || ''
      } : null;

      // Map periodontal_data
      const pd = perioRes.data;
      const periodontalData = pd ? {
        ohiS: pd.ohi_s || '',
        calculus: pd.calculus || '',
        plakIndeks: pd.plak_indeks || '',
        bop: pd.bop || '',
        mobility: pd.mobility || '',
        furkasi: pd.furkasi || '',
        pocketDepth: pd.pocket_depth || '',
        resesiGingiva: pd.resesi_gingiva || '',
        kondisiGingiva: pd.kondisi_gingiva || '',
        kondisiMukosa: pd.kondisi_mukosa || ''
      } : null;

      // Map extra_oral_data (termasuk kolom baru v3.0)
      const eo = extraOralRes.data;
      const ekstraOralData = eo ? {
        wajah: eo.wajah || '',
        bibir: eo.bibir || '',
        pipi: eo.pipi || '',
        kelenjarGetahBening: eo.kelenjar_getah_bening || '',
        temporomandibular: eo.temporomandibular || '',
        ototpengunyahan: eo.otot_pengunyahan || '',
        keterangan: eo.keterangan || '',
        riwayat_perawatan: eo.riwayat_perawatan || 'belum_dirawat',
        riwayat_perawatan_keterangan: eo.riwayat_perawatan_keterangan || '',
        kebiasaan_buruk: eo.kebiasaan_buruk || '',
        riwayat_sosial: eo.riwayat_sosial || '',
        bibir_keterangan: eo.bibir_keterangan || '',
        kgb_kanan: eo.kgb_kanan || 'tidak_teraba',
        kgb_kanan_sakit: eo.kgb_kanan_sakit || '',
        kgb_kiri: eo.kgb_kiri || 'tidak_teraba',
        kgb_kiri_sakit: eo.kgb_kiri_sakit || '',
        kelenjar_lainnya: eo.kelenjar_lainnya || '',
      } : null;

      // Map intra_oral_data (tabel baru v3.0) — pass-through
      const io = intraOralRes.data;
      const intraOralData = io ? { ...io } : null;

      // Map odontogram_meta (tabel baru v3.0)
      const om = odontMetaRes.data;
      const odontogramMeta = om ? {
        relasi_molar_kanan: om.relasi_molar_kanan || '',
        relasi_molar_kiri: om.relasi_molar_kiri || '',
        catatan_odontogram: om.catatan_odontogram || ''
      } : null;

      // Map tooth_conditions — support layer1 & layer3 dari kolom notes (v3.0)
      const toothConditionsRaw = toothRes.data || [];
      const toothConditions = {};
      toothConditionsRaw.forEach(row => {
        const num = row.tooth_number;
        if (!toothConditions[num]) {
          toothConditions[num] = { whole: null, surfaces: {}, layer1: {}, layer3: {} };
        }
        if (row.condition_type === 'whole') {
          toothConditions[num].whole = row.condition_code === 'LAYER_ONLY' ? null : row.condition_code;
          toothConditions[num].hasRCT = row.has_rct || false;
          if (row.notes) {
            try {
              const parsed = JSON.parse(row.notes);
              toothConditions[num].layer1 = parsed.layer1 || {};
              toothConditions[num].layer3 = parsed.layer3 || {};
            } catch (_) {}
          }
        } else if (row.condition_type === 'surface') {
          toothConditions[num].surfaces[row.surface] = row.condition_code;
        }
      });

      return {
        success: true,
        data: {
          patient,
          medicalHistory,
          clinicalData,
          visits: visitRes.data || [],
          toothConditions,
          periodontalData,
          ekstraOralData,
          intraOralData,
          odontogramMeta,
          rencanaPerawatan: treatPlanRes.data || []
        }
      };
    } catch (error) {
      console.error('Error fetching patient details:', error);
      return { success: false, error: error.message };
    }
  },

  async createPatient(patientData) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('patients')
        .insert([{ ...patientData, registered_by: authData.user?.id }])
        .select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updatePatient(id, patientData) {
    try {
      const { data, error } = await supabase
        .from('patients').update(patientData).eq('id', id).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // VIEW FIX: gunakan v_patient_summary — kolom filter (nama_lengkap, no_rm, no_wa) tersedia di view
  async searchPatients(searchTerm) {
    try {
      const { data, error } = await supabase
        .from('v_patient_summary')
        .select('*')
        .or(`nama_lengkap.ilike.%${searchTerm}%,no_rm.ilike.%${searchTerm}%,no_wa.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // SAVE MEDICAL HISTORY — map frontend keys → DB columns
  // =====================================================
  async saveMedicalHistory(patientId, historyData) {
    try {
      const dbData = {
        patient_id: patientId,
        hipertensi: historyData.hipertensi || false,
        jantung: historyData.jantung || false,
        asma: historyData.asma || false,
        diabetes: historyData.diabetes || false,
        alergi: historyData.alergi || false,
        stroke: historyData.stroke || false,
        ginjal: historyData.ginjal || false,
        hepatitis: historyData.hepatitis || false,
        tuberkulosis: historyData.tuberkulosis || false,
        hiv: historyData.hiv || false,
        thalassemia: historyData.thalassemia || false,
        hemofilia: historyData.hemofilia || false,
        osteoporosis: historyData.osteoporosis || false,
        tiroid: historyData.tiroid || false,
        epilepsi: historyData.epilepsi || false,
kanker: historyData.kanker || false,
asam_urat: historyData.asam_urat || false,
reumatik: historyData.reumatik || false,
glaukoma: historyData.glaukoma || false,
covid19: historyData.covid19 || false,
        alergi_detail: historyData.alergi_detail || '',
        konsumsi_obat: historyData.konsumsi_obat || '',
        riwayat_lain: historyData.riwayat_lain || ''
      };
      const { data, error } = await supabase
        .from('medical_history').upsert(dbData, { onConflict: 'patient_id' }).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving medical history:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // SAVE CLINICAL DATA — map frontend keys → DB columns
  // =====================================================
  async saveClinicalData(patientId, clinicalData) {
    try {
      const dbData = {
        patient_id: patientId,
        oklusi: clinicalData.oklusi || '',
        torus_palatinus: clinicalData.torus_palatinus || '',
        torus_mandibularis: clinicalData.torus_mandibularis || '',
        palatum: clinicalData.palatum || '',
        supernumery_teeth: clinicalData.supernumery_teeth || '',
        diastema: clinicalData.diastema || '',
        gigi_anomali: clinicalData.gigi_anomali || '',
        lain_lain: clinicalData.lain_lain || '',
        tanggal_pencatatan: clinicalData.tanggal_pencatatan || new Date().toISOString().split('T')[0],
        diagnosis_list: clinicalData.diagnosis_list || [],
        treatment_list: clinicalData.treatment_list || [],
        total_treatment_cost: clinicalData.total_treatment_cost || 0,
        diagnosis_additional_notes: clinicalData.diagnosis_additional_notes || ''
      };
      const { data, error } = await supabase
        .from('clinical_data').upsert(dbData, { onConflict: 'patient_id' }).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving clinical data:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // SAVE PERIODONTAL DATA
  // =====================================================
  async savePeriodontalData(patientId, perioData) {
    try {
      const dbData = {
        patient_id: patientId,
        ohi_s: perioData.ohiS || '',
        calculus: perioData.calculus || '',
        plak_indeks: perioData.plakIndeks || '',
        bop: perioData.bop || '',
        mobility: perioData.mobility || '',
        furkasi: perioData.furkasi || '',
        pocket_depth: perioData.pocketDepth || '',
        resesi_gingiva: perioData.resesiGingiva || '',
        kondisi_gingiva: perioData.kondisiGingiva || '',
        kondisi_mukosa: perioData.kondisiMukosa || ''
      };
      const { data, error } = await supabase
        .from('periodontal_data').upsert(dbData, { onConflict: 'patient_id' }).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving periodontal data:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // SAVE EXTRA ORAL DATA (update v3.0 — tambah field baru)
  // =====================================================
  async saveExtraOralData(patientId, eoData) {
    try {
      const dbData = {
        patient_id: patientId,
        wajah: eoData.wajah || '',
        bibir: eoData.bibir || '',
        pipi: eoData.pipi || '',
        kelenjar_getah_bening: eoData.kelenjarGetahBening || '',
        temporomandibular: eoData.temporomandibular || '',
        otot_pengunyahan: eoData.ototpengunyahan || '',
        keterangan: eoData.keterangan || '',
        riwayat_perawatan: eoData.riwayat_perawatan || 'belum_dirawat',
        riwayat_perawatan_keterangan: eoData.riwayat_perawatan_keterangan || '',
        kebiasaan_buruk: eoData.kebiasaan_buruk || '',
        riwayat_sosial: eoData.riwayat_sosial || '',
        bibir_keterangan: eoData.bibir_keterangan || '',
        kgb_kanan: eoData.kgb_kanan || 'tidak_teraba',
        kgb_kanan_sakit: eoData.kgb_kanan_sakit || '',
        kgb_kiri: eoData.kgb_kiri || 'tidak_teraba',
        kgb_kiri_sakit: eoData.kgb_kiri_sakit || '',
        kelenjar_lainnya: eoData.kelenjar_lainnya || '',
      };
      const { data, error } = await supabase
        .from('extra_oral_data').upsert(dbData, { onConflict: 'patient_id' }).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving extra oral data:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // SAVE INTRA ORAL DATA — BARU v3.0
  // =====================================================
  async saveIntraOralData(patientId, ioData) {
    try {
      const dbData = {
        patient_id: patientId,
        debri: ioData.debri || 'tidak_ada',
        debri_regio: ioData.debri_regio || '',
        plak: ioData.plak || 'tidak_ada',
        plak_regio: ioData.plak_regio || '',
        kalkulus: ioData.kalkulus || 'tidak_ada',
        kalkulus_regio: ioData.kalkulus_regio || '',
        perdarahan_papila: ioData.perdarahan_papila || 'tidak_ada',
        perdarahan_papila_regio: ioData.perdarahan_papila_regio || '',
        risiko_karies: ioData.risiko_karies || 'tidak_ada',
        ph_plak: ioData.ph_plak || '',
        ph_plak_tinggi: ioData.ph_plak_tinggi || false,
        ph_saliva: ioData.ph_saliva || '',
        ph_saliva_tinggi: ioData.ph_saliva_tinggi || false,
        gingiva: ioData.gingiva || 'sehat',
        gingiva_keterangan: ioData.gingiva_keterangan || '',
        mukosa: ioData.mukosa || 'sehat',
        mukosa_keterangan: ioData.mukosa_keterangan || '',
        palatum: ioData.palatum || 'sehat',
        palatum_keterangan: ioData.palatum_keterangan || '',
        lidah: ioData.lidah || 'sehat',
        lidah_keterangan: ioData.lidah_keterangan || '',
        dasar_mulut: ioData.dasar_mulut || 'sehat',
        dasar_mulut_keterangan: ioData.dasar_mulut_keterangan || '',
        hubungan_rahang: ioData.hubungan_rahang || 'ortognati',
        kelainan_gigi_geligi: ioData.kelainan_gigi_geligi || 'tidak_ada',
        kelainan_gigi_geligi_keterangan: ioData.kelainan_gigi_geligi_keterangan || '',
        lain_lain: ioData.lain_lain || '',
      };
      const { data, error } = await supabase
        .from('intra_oral_data')
        .upsert(dbData, { onConflict: 'patient_id' })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving intra oral data:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // SAVE ODONTOGRAM META — BARU v3.0
  // =====================================================
  async saveOdontogramMeta(patientId, metaData) {
    try {
      const dbData = {
        patient_id: patientId,
        relasi_molar_kanan: metaData.relasi_molar_kanan || '',
        relasi_molar_kiri: metaData.relasi_molar_kiri || '',
        catatan_odontogram: metaData.catatan_odontogram || '',
      };
      const { data, error } = await supabase
        .from('odontogram_meta')
        .upsert(dbData, { onConflict: 'patient_id' })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving odontogram meta:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // SAVE TREATMENT PLANS — use RPC for atomic replace
  // =====================================================
  async saveTreatmentPlans(patientId, plans) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      const dbData = plans.map((p, idx) => ({
        prioritas: idx + 1,
        tindakan: p.tindakan || '',
        gigi: p.gigi || '',
        keterangan: p.keterangan || '',
        status: p.status || 'planned',
        created_by: userId
      }));

      const { error } = await supabase.rpc('replace_treatment_plans', {
        p_patient_id: patientId,
        p_plans: dbData
      });

      if (error) throw error;
      return { success: true, data: dbData };
    } catch (error) {
      console.error('Error saving treatment plans:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // SAVE TOOTH CONDITIONS (update v3.0 — support layer1 & layer3)
  // =====================================================
  async saveToothConditions(patientId, conditions) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      const conditionsArray = Object.entries(conditions).flatMap(([toothNumber, condition]) => {
        const records = [];

        const hasWhole = !!condition.whole;
        const hasLayers = Object.keys(condition.layer1 || {}).length > 0 ||
                          Object.keys(condition.layer3 || {}).length > 0;

        if (hasWhole || hasLayers) {
          const notesPayload = {};
          if (Object.keys(condition.layer1 || {}).length > 0) notesPayload.layer1 = condition.layer1;
          if (Object.keys(condition.layer3 || {}).length > 0) notesPayload.layer3 = condition.layer3;

          const conditionCode = condition.whole || (hasLayers ? 'LAYER_ONLY' : '');

          records.push({
            tooth_number: parseInt(toothNumber),
            condition_type: 'whole',
            condition_code: conditionCode,
            has_rct: condition.hasRCT || false,
            notes: Object.keys(notesPayload).length > 0 ? JSON.stringify(notesPayload) : null,
            recorded_by: userId
          });
        }

        if (condition.surfaces) {
          Object.entries(condition.surfaces).forEach(([surface, code]) => {
            records.push({
              tooth_number: parseInt(toothNumber),
              condition_type: 'surface',
              condition_code: code,
              surface,
              has_rct: condition.hasRCT || false,
              recorded_by: userId
            });
          });
        }

        return records;
      });

      const { error } = await supabase.rpc('replace_tooth_conditions', {
        p_patient_id: patientId,
        p_conditions: conditionsArray
      });

      if (error) throw error;
      return { success: true, data: conditionsArray };
    } catch (error) {
      console.error('Error saving tooth conditions:', error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // SAVE REFERRAL LETTER
  // =====================================================
  async saveReferralLetter(referralData) {
    try {
      const { data, error } = await supabase
        .from('patient_referrals')
        .insert([referralData])
        .select()
        .single();
        
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving referral letter:', error);
      return { success: false, error: error.message };
    }
  },


  // =====================================================
  // DELETE PATIENT & STORAGE CLEANUP
  // =====================================================
  async deletePatient(patientId) {
    try {
      // 1. Fetch all media for this patient to prevent storage orphans
      const { data: mediaFiles, error: mediaError } = await supabase
        .from('patient_media')
        .select('*')
        .eq('patient_id', patientId);
        
      if (mediaError) throw mediaError;

      // 2. Delete physical files from buckets
      if (mediaFiles && mediaFiles.length > 0) {
        const radiologiFiles = [];
        const klinikFiles = [];
        
        mediaFiles.forEach(m => {
          const isRadiologi = ['panoramic', 'cephalometric', 'dental'].includes(m.category);
          const bucketName = isRadiologi ? 'radiologi' : 'klinik';
          const urlParts = m.file_url.split('/' + bucketName + '/');
          
          if (urlParts.length > 1) {
            const path = urlParts[1];
            if (isRadiologi) radiologiFiles.push(path);
            else klinikFiles.push(path);
          }
        });

        if (radiologiFiles.length > 0) {
          const { error: rErr } = await supabase.storage.from('radiologi').remove(radiologiFiles);
          if (rErr) throw new Error('Gagal menghapus file radiologi: ' + rErr.message);
        }
        if (klinikFiles.length > 0) {
          const { error: kErr } = await supabase.storage.from('klinik').remove(klinikFiles);
          if (kErr) throw new Error('Gagal menghapus file klinik: ' + kErr.message);
        }
      }

      // 3. Delete patient from database (cascades automatically to related tables)
      const { error: dbError } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (dbError) throw dbError;

      return { success: true };
    } catch (error) {
      console.error('Error deleting patient:', error);
      return { success: false, error: error.message };
    }
  },
};
