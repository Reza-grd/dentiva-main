import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const AXE_SCRIPT_PATH = require.resolve('axe-core/axe.min.js');

export const SYNTHETIC_CLINIC = {
  id: '00000000-0000-4000-8000-000000000101',
  name: 'Klinik Gigi Senyum Sintetis',
  phone: '081234567800',
  address: 'Jl. Uji Otomatis No. 10, Jakarta Selatan',
  email: 'halo@senyum-sintetis.test',
};

export const SYNTHETIC_USERS = {
  admin: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'admin@klinik-sintetis.test',
    password: 'PasswordSintetis123!',
    role: 'admin',
    full_name: 'Admin Sintetis Dentiva',
    clinic_id: SYNTHETIC_CLINIC.id,
    no_telepon: '081200000001',
    spesialisasi: null,
    nomor_str: null,
    is_active: true,
  },
  dokter: {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'dokter@klinik-sintetis.test',
    password: 'PasswordSintetis123!',
    role: 'dokter',
    full_name: 'drg. Sinta Maharani',
    clinic_id: SYNTHETIC_CLINIC.id,
    no_telepon: '081200000002',
    spesialisasi: 'Konservasi Gigi',
    nomor_str: 'STR-DRG-2026-0002',
    is_active: true,
  },
  resepsionis: {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'resepsionis@klinik-sintetis.test',
    password: 'PasswordSintetis123!',
    role: 'resepsionis',
    full_name: 'Rina Puspita',
    clinic_id: SYNTHETIC_CLINIC.id,
    no_telepon: '081200000003',
    spesialisasi: null,
    nomor_str: null,
    is_active: true,
  },
};

function buildAuthUser(profile, mfaEnabled = false) {
  return {
    id: profile.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: profile.email,
    email_confirmed_at: '2026-01-01T00:00:00.000Z',
    phone: '',
    confirmed_at: '2026-01-01T00:00:00.000Z',
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {
      provider: 'email',
      providers: ['email'],
      clinic_id: profile.clinic_id,
      role: profile.role,
    },
    user_metadata: {
      full_name: profile.full_name,
      role: profile.role,
    },
    identities: [],
    factors: mfaEnabled
      ? [
          {
            id: 'factor-totp-sintetis-001',
            friendly_name: 'Authenticator Klinik Sintetis',
            factor_type: 'totp',
            status: 'verified',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ]
      : [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: new Date().toISOString(),
  };
}

function buildSession(profile, aal = 'aal1', mfaEnabled = false) {
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = nowSec + 3600;
  return {
    access_token: `synthetic-jwt-${profile.role}-${aal}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: `synthetic-refresh-${profile.role}`,
    user: buildAuthUser(profile, mfaEnabled),
  };
}

function createInitialState(todayStr) {
  const patients = [
    {
      id: '11111111-1111-4111-8111-111111111101',
      clinic_id: SYNTHETIC_CLINIC.id,
      no_rm: 'RM-2026-0001',
      nama_lengkap: 'Budi Santoso',
      jenis_kelamin: 'Laki-laki',
      tanggal_lahir: '1990-04-12',
      umur: 36,
      no_wa: '081299990001',
      alamat: 'Jl. Melati No. 12, Jakarta',
      alamat_detail: 'Jl. Melati No. 12',
      nik: '3174011204900001',
      nik_ibu: '',
      golongan_darah: 'O',
      alergi_obat: 'Tidak ada',
      riwayat_penyakit: 'Tidak ada',
      status: 'active',
      total_visits: 3,
      last_visit: todayStr,
      total_spent: 850000,
      created_at: '2026-01-10T08:00:00.000Z',
    },
    {
      id: '11111111-1111-4111-8111-111111111102',
      clinic_id: SYNTHETIC_CLINIC.id,
      no_rm: 'RM-2026-0002',
      nama_lengkap: 'Siti Rahmawati',
      jenis_kelamin: 'Perempuan',
      tanggal_lahir: '1995-08-21',
      umur: 30,
      no_wa: '081299990002',
      alamat: 'Jl. Anggrek No. 5, Depok',
      alamat_detail: 'Jl. Anggrek No. 5',
      nik: '3276026108950002',
      nik_ibu: '',
      golongan_darah: 'A',
      alergi_obat: 'Penisilin',
      riwayat_penyakit: 'Asma ringan',
      status: 'active',
      total_visits: 2,
      last_visit: todayStr,
      total_spent: 500000,
      created_at: '2026-01-12T09:30:00.000Z',
    },
  ];

  const treatments = [
    {
      id: '22222222-2222-4222-8222-222222222201',
      clinic_id: SYNTHETIC_CLINIC.id,
      kode_treatment: 'TRT-001',
      nama_treatment: 'Scaling & Polishing',
      kategori: 'Preventif',
      harga_dasar: 350000,
      harga: 350000,
      durasi_menit: 45,
      deskripsi: 'Pembersihan karang gigi rahang atas dan bawah',
      is_active: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222202',
      clinic_id: SYNTHETIC_CLINIC.id,
      kode_treatment: 'TRT-002',
      nama_treatment: 'Tambal Komposit Kelas I',
      kategori: 'Konservasi',
      harga_dasar: 450000,
      harga: 450000,
      durasi_menit: 60,
      deskripsi: 'Restorasi resin komposit sinar tampak',
      is_active: true,
    },
  ];

  const visits = [
    {
      id: '33333333-3333-4333-8333-333333333301',
      clinic_id: SYNTHETIC_CLINIC.id,
      patient_id: patients[0].id,
      dokter_id: SYNTHETIC_USERS.dokter.id,
      tanggal_kunjungan: todayStr,
      jam_kunjungan: '09:00:00',
      keluhan: 'Karang gigi terasa kasar dan gusi mudah berdarah',
      diagnosa: 'Gingivitis marginalis kronis (K05.1)',
      kode_icd10: 'K05.1',
      pemeriksaan_fisik: 'Kalkulus supragingiva regio anterior bawah',
      terapi: 'Scaling & Polishing RA/RB',
      catatan_dokter: 'Kontrol 6 bulan lagi',
      status: 'completed',
      queue_number: 1,
      patient: {
        id: patients[0].id,
        nama_lengkap: patients[0].nama_lengkap,
        no_rm: patients[0].no_rm,
        no_wa: patients[0].no_wa,
        alamat: patients[0].alamat,
      },
      dokter: {
        id: SYNTHETIC_USERS.dokter.id,
        full_name: SYNTHETIC_USERS.dokter.full_name,
        spesialisasi: SYNTHETIC_USERS.dokter.spesialisasi,
      },
      treatments: [
        {
          id: 'vt-001',
          treatment_id: treatments[0].id,
          tooth_number: 'All',
          quantity: 1,
          harga_satuan: 350000,
          subtotal: 350000,
          treatment: treatments[0],
        },
      ],
      created_at: `${todayStr}T08:30:00.000Z`,
    },
    {
      id: '33333333-3333-4333-8333-333333333302',
      clinic_id: SYNTHETIC_CLINIC.id,
      patient_id: patients[1].id,
      dokter_id: SYNTHETIC_USERS.dokter.id,
      tanggal_kunjungan: todayStr,
      jam_kunjungan: '10:00:00',
      keluhan: 'Gigi geraham bawah kanan ngilu saat minum dingin',
      diagnosa: 'Pulpitis reversibel (K04.0)',
      kode_icd10: 'K04.0',
      pemeriksaan_fisik: 'Karies dentin gigi 46',
      terapi: 'Tambal komposit gigi 46',
      catatan_dokter: 'Hindari makanan keras 24 jam',
      status: 'scheduled',
      queue_number: 2,
      patient: {
        id: patients[1].id,
        nama_lengkap: patients[1].nama_lengkap,
        no_rm: patients[1].no_rm,
        no_wa: patients[1].no_wa,
        alamat: patients[1].alamat,
      },
      dokter: {
        id: SYNTHETIC_USERS.dokter.id,
        full_name: SYNTHETIC_USERS.dokter.full_name,
        spesialisasi: SYNTHETIC_USERS.dokter.spesialisasi,
      },
      treatments: [],
      created_at: `${todayStr}T09:00:00.000Z`,
    },
  ];

  const payments = [
    {
      id: '44444444-4444-4444-8444-444444444401',
      clinic_id: SYNTHETIC_CLINIC.id,
      visit_id: visits[0].id,
      patient_id: patients[0].id,
      invoice_number: 'INV-20261017-001',
      subtotal_treatments: 350000,
      biaya_tambahan: 0,
      diskon: 0,
      total_bayar: 350000,
      jumlah_bayar: 350000,
      kembalian: 0,
      metode_pembayaran: 'cash',
      status_pembayaran: 'paid',
      tanggal_pembayaran: todayStr,
      processed_by: SYNTHETIC_USERS.resepsionis.id,
      patient: {
        id: patients[0].id,
        nama_lengkap: patients[0].nama_lengkap,
        no_rm: patients[0].no_rm,
      },
      visit: {
        id: visits[0].id,
        tanggal_kunjungan: todayStr,
      },
      processed_by_user: {
        full_name: SYNTHETIC_USERS.resepsionis.full_name,
      },
      created_at: `${todayStr}T09:45:00.000Z`,
    },
    {
      id: '44444444-4444-4444-8444-444444444402',
      clinic_id: SYNTHETIC_CLINIC.id,
      visit_id: visits[1].id,
      patient_id: patients[1].id,
      invoice_number: 'INV-20261017-002',
      subtotal_treatments: 450000,
      biaya_tambahan: 0,
      diskon: 0,
      total_bayar: 450000,
      jumlah_bayar: 0,
      kembalian: 0,
      metode_pembayaran: 'qris',
      status_pembayaran: 'pending',
      tanggal_pembayaran: todayStr,
      processed_by: SYNTHETIC_USERS.resepsionis.id,
      patient: {
        id: patients[1].id,
        nama_lengkap: patients[1].nama_lengkap,
        no_rm: patients[1].no_rm,
      },
      visit: {
        id: visits[1].id,
        tanggal_kunjungan: todayStr,
      },
      processed_by_user: {
        full_name: SYNTHETIC_USERS.resepsionis.full_name,
      },
      created_at: `${todayStr}T10:15:00.000Z`,
    },
  ];

  // Buat jadwal dokter aktif untuk semua hari (0..6) agar hari apa pun tes dijalankan selalu ada slot tersedia
  const doctorSchedules = [0, 1, 2, 3, 4, 5, 6].map((hari) => ({
    id: `sched-day-${hari}`,
    clinic_id: SYNTHETIC_CLINIC.id,
    dokter_id: SYNTHETIC_USERS.dokter.id,
    hari,
    jam_mulai: '08:00:00',
    jam_selesai: '16:00:00',
    kapasitas_pasien_per_hari: 8,
    is_active: true,
    keterangan: 'Praktek Reguler',
    dokter: {
      id: SYNTHETIC_USERS.dokter.id,
      full_name: SYNTHETIC_USERS.dokter.full_name,
      spesialisasi: SYNTHETIC_USERS.dokter.spesialisasi,
    },
  }));

  const settings = {
    clinic_name: SYNTHETIC_CLINIC.name,
    clinic_phone: SYNTHETIC_CLINIC.phone,
    clinic_address: SYNTHETIC_CLINIC.address,
    clinic_email: SYNTHETIC_CLINIC.email,
    wa_payment_confirmation_enabled: 'true',
    wa_reminder_h1_day_enabled: 'true',
    wa_reminder_h1_hour_enabled: 'true',
    wa_post_treatment_education_enabled: 'false',
    onboarding_dismissed: 'true',
  };

  const queueLinks = [
    {
      id: 'qlink-001',
      clinic_id: SYNTHETIC_CLINIC.id,
      label: 'TV Ruang Tunggu Utama',
      token_hint: '7a9f',
      created_at: '2026-01-15T08:00:00.000Z',
      last_seen_at: `${todayStr}T08:00:00.000Z`,
      revoked_at: null,
    },
  ];

  const proposals = [
    {
      id: 'act-approve-001',
      jenis: 'pengeluaran_catat',
      pratinjau: {
        judul: 'Catat pengeluaran listrik Rp 1.250.000',
        risiko: 'rendah',
        rincian: ['Kategori: Utilitas & Listrik', 'Nominal: Rp 1.250.000'],
        peringatan: [],
      },
      bisa_batal: true,
    },
    {
      id: 'act-reject-002',
      jenis: 'tindakan_ubah_harga',
      pratinjau: {
        judul: 'Naikkan tarif Scaling & Polishing menjadi Rp 385.000',
        risiko: 'sedang',
        rincian: ['Tarif lama: Rp 350.000', 'Tarif baru: Rp 385.000 (+10%)'],
        peringatan: ['Perubahan tarif berlaku untuk transaksi baru.'],
      },
      bisa_batal: true,
    },
  ];

  return {
    patients,
    treatments,
    visits,
    payments,
    doctorSchedules,
    settings,
    queueLinks,
    proposals,
  };
}

/**
 * Pasang pencegat jaringan penuh untuk Supabase sintetis.
 * Tidak ada satu pun request yang keluar ke server produksi.
 */
export async function setupSyntheticClinic(page, options = {}) {
  const todayStr = new Date().toISOString().split('T')[0];

  const ctrl = page._syntheticCtrl || {
    state: createInitialState(todayStr),
    currentRole: null,
    mfaEnabled: false,
    currentAal: 'aal1',
    routed: false,
  };
  ctrl.state = createInitialState(todayStr);
  ctrl.currentRole = options.role || null;
  ctrl.mfaEnabled = Boolean(options.mfaEnabled);
  ctrl.currentAal = options.initialAal || 'aal1';
  page._syntheticCtrl = ctrl;

  const state = ctrl.state;
  const theme = options.theme || 'light';
  const initialSession = ctrl.currentRole
    ? buildSession(SYNTHETIC_USERS[ctrl.currentRole], ctrl.currentAal, ctrl.mfaEnabled)
    : null;

  const respondJson = (route, data, status = 200, extraHeaders = {}) =>
    route.fulfill({
      status,
      contentType: 'application/json; charset=utf-8',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Range, Range-Unit',
        ...extraHeaders,
      },
      body: JSON.stringify(data),
    });

  const respondPostgrest = (route, request, rows, totalCount = null) => {
    const accept = request.headers()['accept'] || '';
    const isSingleObject = accept.includes('application/vnd.pgrst.object+json');
    const method = request.method();
    const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
    const count = totalCount !== null ? totalCount : list.length;
    const rangeHeader = list.length > 0 ? `0-${list.length - 1}/${count}` : `*/${count}`;

    if (method === 'HEAD') {
      return route.fulfill({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Range, Range-Unit',
          'Content-Range': rangeHeader,
        },
        body: '',
      });
    }

    if (isSingleObject) {
      return respondJson(route, list[0] ?? null, 200, { 'Content-Range': rangeHeader });
    }

    return respondJson(route, list, 200, { 'Content-Range': rangeHeader });
  };

  const resolveActiveProfile = (request) => {
    const authHeader = request.headers()['authorization'] || '';
    for (const r of ['admin', 'dokter', 'resepsionis']) {
      if (authHeader.includes(`synthetic-jwt-${r}`)) {
        return SYNTHETIC_USERS[r];
      }
    }
    if (ctrl.currentRole && SYNTHETIC_USERS[ctrl.currentRole]) {
      return SYNTHETIC_USERS[ctrl.currentRole];
    }
    return SYNTHETIC_USERS.admin;
  };

  if (!ctrl.routed) {
    ctrl.routed = true;

    // Cegat Google Fonts eksternal agar event window.load tidak pernah tertahan koneksi internet
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '/* synthetic fonts */' })
    );
    await page.route('https://fonts.gstatic.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'font/woff2', body: '' })
    );

    // Cegat seluruh request ke server Supabase sintetis (127.0.0.1:54321)
    await page.route('http://127.0.0.1:54321/**', async (route, request) => {
      const url = new URL(request.url());
      const pathname = url.pathname;
      const method = request.method();

      if (method === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Expose-Headers': 'Content-Range, Range-Unit',
          },
        });
      }

      let body = {};
      if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
        try {
          body = request.postDataJSON() || {};
        } catch {
          body = {};
        }
      }

      // ─── 1. AUTH ENDPOINTS ──────────────────────────────────────────────────
      if (pathname.startsWith('/auth/v1/token')) {
        const grantType = url.searchParams.get('grant_type');
        if (grantType === 'password') {
          const email = String(body.email || '').trim().toLowerCase();
          const password = String(body.password || '');
          const matched = Object.values(SYNTHETIC_USERS).find(
            (u) => u.email.toLowerCase() === email && u.password === password
          );

          if (!matched) {
            return respondJson(
              route,
              {
                error: 'invalid_grant',
                error_code: 'invalid_credentials',
                error_description: 'Invalid login credentials',
                msg: 'Invalid login credentials',
              },
              400
            );
          }

          ctrl.currentRole = matched.role;
          ctrl.currentAal = 'aal1';
          return respondJson(route, buildSession(matched, ctrl.currentAal, ctrl.mfaEnabled));
        }

        // Refresh token grant
        const profile = resolveActiveProfile(request);
        return respondJson(route, buildSession(profile, ctrl.currentAal, ctrl.mfaEnabled));
      }

      if (pathname === '/auth/v1/user') {
        const profile = resolveActiveProfile(request);
        return respondJson(route, buildAuthUser(profile, ctrl.mfaEnabled));
      }

      if (pathname === '/auth/v1/logout') {
        ctrl.currentRole = null;
        return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
      }

      if (pathname.startsWith('/auth/v1/factors')) {
        const profile = resolveActiveProfile(request);
        if (pathname.endsWith('/challenge')) {
          return respondJson(route, {
            id: 'challenge-totp-001',
            factor_type: 'totp',
            expires_at: Math.floor(Date.now() / 1000) + 300,
          });
        }
        if (pathname.endsWith('/verify') || pathname.endsWith('/challenge-and-verify')) {
          if (body.code === '123456') {
            ctrl.currentAal = 'aal2';
            return respondJson(route, buildSession(profile, 'aal2', true));
          }
          return respondJson(
            route,
            { error: 'invalid_totp', message: 'Kode OTP tidak valid' },
            422
          );
        }
      }

    // ─── 2. EDGE FUNCTIONS (/functions/v1/ai-assistant) ─────────────────────
    if (pathname.startsWith('/functions/v1/ai-assistant')) {
      const mode = body.mode || 'ask';

      if (mode === 'info') {
        return respondJson(route, {
          configured: true,
          provider: 'anthropic',
          label: 'Claude 3.5 Sonnet (Sintetis)',
          model: 'claude-sonnet-4-5',
          free_tier: false,
        });
      }

      if (mode === 'brief' || mode === 'staff_brief') {
        return respondJson(route, {
          brief: {
            ringkasan: 'Operasional klinik hari ini berjalan lancar dengan 2 pasien terjadwal.',
            poin: [
              {
                tingkat: 'baik',
                judul: 'Kehadiran Pasien Stabil',
                isi: 'Pasien pagi (Budi Santoso) telah selesai perawatan tepat waktu.',
                aksi: 'jadwal',
              },
              {
                tingkat: 'perhatian',
                judul: '1 Tagihan Menunggu Pembayaran',
                isi: 'Tagihan INV-20261017-002 atas nama Siti Rahmawati siap diproses di kasir.',
                aksi: 'pembayaran',
              },
            ],
            saran: 'Tinjau daftar pengingat H-1 untuk jadwal besok.',
          },
          generated_at: new Date().toISOString(),
          cached: true,
          stale: false,
        });
      }

      if (mode === 'agent_apply') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        return respondJson(route, {
          ok: true,
          dijalankan: ids.length,
          tindakan: ids.map((id) => {
            const found = state.proposals.find((p) => p.id === id);
            return {
              id,
              judul: found?.pratinjau?.judul || 'Tindakan Agen',
              hasil: 'Berhasil dijalankan di lingkungan sintetis',
              bisa_batal: true,
            };
          }),
        });
      }

      if (mode === 'agent_reject') {
        return respondJson(route, { ok: true });
      }

      if (mode === 'agent_undo') {
        return respondJson(route, { ok: true, id: body.id });
      }

      // Default: aiService.ask({ question, history })
      const question = String(body.question || '').trim();
      const replyText =
        `Berdasarkan data klinik sintetis hari ini, berikut analisis untuk: **"${question}"**.\n\n` +
        `- **Pendapatan Hari Ini:** Rp 1.850.000 dari 4 transaksi.\n` +
        `- **Usulan Denti Agen:** Saya telah menyiapkan 2 kartu tindakan di bawah yang menunggu keputusan Anda.`;

      return respondJson(route, {
        answer: replyText,
        tools: ['pengeluaran_dan_laba', 'cari_tindakan'],
        usage_id: 'usage-sintetis-001',
        cached: false,
        references: 2,
        status: {
          paket: 'Enterprise',
          tersedia_di_paket: true,
          aktif: true,
          kuota_bulanan: 500,
          terpakai_bulan_ini: 13,
        },
        actions: state.proposals,
      });
    }

    // ─── 3. RPC ENDPOINTS (/rest/v1/rpc/*) ──────────────────────────────────
    if (pathname.startsWith('/rest/v1/rpc/')) {
      const rpcName = pathname.replace('/rest/v1/rpc/', '');
      const profile = resolveActiveProfile(request);

      switch (rpcName) {
        case 'get_my_account_status':
          return respondJson(route, {
            has_access: true,
            clinic_status: 'active',
            user_is_active: true,
            role: profile.role,
          });

        case 'record_login':
          return respondJson(route, { ok: true });

        case 'get_my_permissions':
          return respondJson(route, [
            { permission_name: 'manage_users' },
            { permission_name: 'manage_finance' },
            { permission_name: 'manage_settings' },
          ]);

        case 'get_onboarding_status':
          return respondJson(route, {
            dismissed: true,
            profile: true,
            treatments: true,
            doctors: true,
            schedules: true,
            staff: true,
            satusehat: true,
          });

        case 'encrypt_batch':
          return respondJson(route, Array.isArray(body.p_payloads) ? body.p_payloads : []);

        case 'decrypt_batch':
          return respondJson(
            route,
            Array.isArray(body.p_payloads)
              ? body.p_payloads.map((v) =>
                  typeof v === 'string' ? v.replace(/^PGPM?:/, '') : v
                )
              : []
          );

        case 'report_revenue_daily':
          return respondJson(route, [
            {
              tanggal: todayStr,
              total_revenue: 1850000,
              total_transactions: 4,
            },
          ]);

        case 'report_counts':
          return respondJson(route, [
            {
              patients_total: state.patients.length,
              patients_new: state.patients.length,
              visits_in_range: state.visits.length,
            },
          ]);

        case 'report_visit_counts':
          return respondJson(route, [
            {
              tanggal: todayStr,
              jumlah: state.visits.length,
            },
          ]);

        case 'report_popular_treatments':
          return respondJson(route, [
            {
              nama_treatment: 'Scaling & Polishing',
              kategori: 'Preventif',
              usage_count: 14,
              total_revenue: 4900000,
            },
            {
              nama_treatment: 'Tambal Komposit Kelas I',
              kategori: 'Konservasi',
              usage_count: 9,
              total_revenue: 4050000,
            },
          ]);

        case 'queue_today':
          return respondJson(
            route,
            state.visits.map((v, idx) => ({
              id: v.id,
              queue_number: v.queue_number || idx + 1,
              jam_kunjungan: v.jam_kunjungan,
              dokter_name: v.dokter?.full_name || SYNTHETIC_USERS.dokter.full_name,
              status: v.status,
            }))
          );

        case 'get_queue_display': {
          const token = body.p_token || '';
          if (token === 'token-tidak-valid') {
            return respondJson(route, { ok: false, reason: 'invalid', visits: [] });
          }
          return respondJson(route, {
            ok: true,
            clinic_name: state.settings.clinic_name,
            hours: { open: '08:00', close: '21:00' },
            visits: [
              {
                no: 1,
                status: 'ongoing',
                initials: 'B. S.',
                doctor: SYNTHETIC_USERS.dokter.full_name,
                time: '09:00',
                kid: false,
              },
              {
                no: 2,
                status: 'waiting',
                initials: 'S. R.',
                doctor: SYNTHETIC_USERS.dokter.full_name,
                time: '10:00',
                kid: false,
              },
            ],
          });
        }

        case 'create_queue_display_link': {
          const label = body.p_label || 'TV Ruang Tunggu Baru';
          const newLink = {
            id: `qlink-${Date.now()}`,
            clinic_id: SYNTHETIC_CLINIC.id,
            label,
            token: 'token-tv-sintetis-baru-777',
            token_hint: 'b777',
            created_at: new Date().toISOString(),
            last_seen_at: null,
            revoked_at: null,
          };
          state.queueLinks.unshift(newLink);
          return respondJson(route, newLink);
        }

        case 'revoke_queue_display_link': {
          const linkId = body.p_id;
          state.queueLinks = state.queueLinks.filter((l) => l.id !== linkId);
          return respondJson(route, { ok: true });
        }

        case 'ai_status':
          return respondJson(route, {
            paket: 'Enterprise',
            tersedia_di_paket: true,
            aktif: true,
            kuota_bulanan: 500,
            terpakai_bulan_ini: 12,
          });

        case 'ai_set_enabled':
          return respondJson(route, { ok: true, aktif: Boolean(body.p_enabled) });

        case 'ai_answer_feedback':
          return respondJson(route, { ok: true });

        case 'save_visit_payment': {
          const visitId = body.p_visit_id;
          const paymentPayload = body.p_payment || {};
          const visitObj = state.visits.find((v) => v.id === visitId) || state.visits[0];
          const newPayment = {
            id: `pay-${Date.now()}`,
            clinic_id: SYNTHETIC_CLINIC.id,
            visit_id: visitId,
            patient_id: visitObj.patient_id,
            invoice_number: `INV-${todayStr.replace(/-/g, '')}-009`,
            subtotal_treatments: paymentPayload.subtotal_treatments || 350000,
            biaya_tambahan: paymentPayload.biaya_tambahan || 0,
            diskon: paymentPayload.diskon || 0,
            total_bayar: paymentPayload.total_bayar || 350000,
            jumlah_bayar: paymentPayload.jumlah_bayar || 350000,
            kembalian: paymentPayload.kembalian || 0,
            metode_pembayaran: paymentPayload.metode_pembayaran || 'cash',
            status_pembayaran: paymentPayload.status_pembayaran || 'paid',
            tanggal_pembayaran: todayStr,
            processed_by: profile.id,
            patient: visitObj.patient,
            visit: { id: visitObj.id, tanggal_kunjungan: visitObj.tanggal_kunjungan },
            processed_by_user: { full_name: profile.full_name },
            created_at: new Date().toISOString(),
          };
          const existingIdx = state.payments.findIndex((p) => p.visit_id === visitId);
          if (existingIdx >= 0) {
            state.payments[existingIdx] = { ...state.payments[existingIdx], ...newPayment };
          } else {
            state.payments.unshift(newPayment);
          }
          return respondJson(route, newPayment);
        }

        case 'get_audit_logs':
          return respondJson(route, [
            {
              id: 'audit-001',
              action: 'LOGIN',
              table_name: 'users',
              user_name: profile.full_name,
              created_at: new Date().toISOString(),
            },
          ]);

        default:
          return respondJson(route, {});
      }
    }

    // ─── 4. REST TABLES (/rest/v1/*) ────────────────────────────────────────
    if (pathname.startsWith('/rest/v1/')) {
      const table = pathname.replace('/rest/v1/', '');
      const profile = resolveActiveProfile(request);

      if (table === 'users') {
        const idParam = url.searchParams.get('id');
        const roleParam = url.searchParams.get('role');
        if (idParam && idParam.startsWith('eq.')) {
          const targetId = idParam.replace('eq.', '');
          const found =
            Object.values(SYNTHETIC_USERS).find((u) => u.id === targetId) || profile;
          return respondPostgrest(route, request, [found]);
        }
        if (roleParam === 'eq.dokter') {
          return respondPostgrest(route, request, [SYNTHETIC_USERS.dokter]);
        }
        return respondPostgrest(route, request, Object.values(SYNTHETIC_USERS));
      }

      if (table === 'clinic_settings') {
        if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
          const rows = Array.isArray(body) ? body : [body];
          rows.forEach((r) => {
            if (r && r.key) {
              state.settings[r.key] = String(r.value ?? '');
            }
          });
          const updatedRows = Object.entries(state.settings).map(([key, value]) => ({
            clinic_id: SYNTHETIC_CLINIC.id,
            key,
            value,
          }));
          return respondPostgrest(route, request, updatedRows);
        }
        const rows = Object.entries(state.settings).map(([key, value]) => ({
          clinic_id: SYNTHETIC_CLINIC.id,
          key,
          value,
        }));
        return respondPostgrest(route, request, rows);
      }

      if (table === 'clinic_subscriptions') {
        return respondPostgrest(route, request, [
          {
            id: 'sub-sintetis-001',
            clinic_id: SYNTHETIC_CLINIC.id,
            status: 'active',
            current_period_end: '2027-12-31T23:59:59.000Z',
            plan: {
              id: 'plan-enterprise',
              name: 'Enterprise',
              price_monthly: 499000,
              features: {
                whatsapp_reminders: true,
                custom_reports: true,
                ai_assistant: true,
                satusehat_sync: true,
                multi_doctor: true,
              },
            },
          },
        ]);
      }

      if (table === 'subscription_plans') {
        return respondPostgrest(route, request, [
          {
            id: 'plan-enterprise',
            name: 'Enterprise',
            price_monthly: 499000,
            features: {
              whatsapp_reminders: true,
              custom_reports: true,
              ai_assistant: true,
            },
          },
        ]);
      }

      if (table === 'v_patient_summary' || table === 'patients') {
        if (method === 'POST') {
          const payload = Array.isArray(body) ? body[0] : body;
          const newPatient = {
            id: `pat-${Date.now()}`,
            clinic_id: SYNTHETIC_CLINIC.id,
            no_rm: payload.no_rm || `RM-2026-000${state.patients.length + 1}`,
            nama_lengkap: payload.nama_lengkap || 'Pasien Baru Sintetis',
            jenis_kelamin: payload.jenis_kelamin || 'Laki-laki',
            tanggal_lahir: payload.tanggal_lahir || '1992-05-10',
            umur: payload.umur || 34,
            no_wa: payload.no_wa || '081277778888',
            alamat: payload.alamat || 'Jl. Baru Sintetis No. 1',
            alamat_detail: payload.alamat_detail || 'Jl. Baru Sintetis No. 1',
            status: 'active',
            total_visits: 0,
            last_visit: null,
            total_spent: 0,
            created_at: new Date().toISOString(),
          };
          state.patients.unshift(newPatient);
          return respondPostgrest(route, request, [newPatient]);
        }

        let filtered = [...state.patients];
        const genderParam = url.searchParams.get('jenis_kelamin');
        if (genderParam && genderParam.startsWith('eq.')) {
          const g = genderParam.replace('eq.', '');
          filtered = filtered.filter((p) => p.jenis_kelamin === g);
        }
        const idParam = url.searchParams.get('id');
        if (idParam && idParam.startsWith('eq.')) {
          const targetId = idParam.replace('eq.', '');
          filtered = filtered.filter((p) => p.id === targetId);
        }
        const orParam = url.searchParams.get('or');
        if (orParam) {
          const match = orParam.match(/ilike\.%([^%]+)%/i);
          if (match && match[1]) {
            const term = match[1].toLowerCase();
            filtered = filtered.filter(
              (p) =>
                p.nama_lengkap.toLowerCase().includes(term) ||
                p.no_rm.toLowerCase().includes(term) ||
                p.no_wa.toLowerCase().includes(term)
            );
          }
        }
        return respondPostgrest(route, request, filtered, filtered.length);
      }

      if (table === 'visits') {
        if (method === 'POST') {
          const payload = Array.isArray(body) ? body[0] : body;
          const patient =
            state.patients.find((p) => p.id === payload.patient_id) || state.patients[0];
          const newVisit = {
            id: `visit-${Date.now()}`,
            clinic_id: SYNTHETIC_CLINIC.id,
            patient_id: patient.id,
            dokter_id: payload.dokter_id || SYNTHETIC_USERS.dokter.id,
            tanggal_kunjungan: payload.tanggal_kunjungan || todayStr,
            jam_kunjungan: payload.jam_kunjungan || '11:00:00',
            keluhan: payload.keluhan || 'Pemeriksaan berkala gigi',
            diagnosa: payload.diagnosa || '',
            status: payload.status || 'scheduled',
            queue_number: state.visits.length + 1,
            patient: {
              id: patient.id,
              nama_lengkap: patient.nama_lengkap,
              no_rm: patient.no_rm,
              no_wa: patient.no_wa,
              alamat: patient.alamat,
            },
            dokter: {
              id: SYNTHETIC_USERS.dokter.id,
              full_name: SYNTHETIC_USERS.dokter.full_name,
              spesialisasi: SYNTHETIC_USERS.dokter.spesialisasi,
            },
            treatments: [],
            created_at: new Date().toISOString(),
          };
          state.visits.push(newVisit);
          return respondPostgrest(route, request, [newVisit]);
        }

        if (method === 'PATCH') {
          const idParam = url.searchParams.get('id');
          const targetId = idParam ? idParam.replace('eq.', '') : null;
          const idx = state.visits.findIndex((v) => v.id === targetId);
          if (idx !== -1) {
            state.visits[idx] = { ...state.visits[idx], ...body };
            return respondPostgrest(route, request, [state.visits[idx]]);
          }
          return respondPostgrest(route, request, []);
        }

        let filtered = [...state.visits];
        const idParam = url.searchParams.get('id');
        if (idParam && idParam.startsWith('eq.')) {
          const targetId = idParam.replace('eq.', '');
          filtered = filtered.filter((v) => v.id === targetId);
        }
        return respondPostgrest(route, request, filtered, filtered.length);
      }

      if (table === 'payments') {
        if (method === 'POST') {
          const payload = Array.isArray(body) ? body[0] : body;
          const patient =
            state.patients.find((p) => p.id === payload.patient_id) || state.patients[0];
          const newPay = {
            id: `pay-${Date.now()}`,
            clinic_id: SYNTHETIC_CLINIC.id,
            ...payload,
            invoice_number: payload.invoice_number || 'INV-20261017-099',
            patient: {
              id: patient.id,
              nama_lengkap: patient.nama_lengkap,
              no_rm: patient.no_rm,
            },
            visit: { tanggal_kunjungan: todayStr },
            processed_by_user: { full_name: profile.full_name },
            created_at: new Date().toISOString(),
          };
          state.payments.unshift(newPay);
          return respondPostgrest(route, request, [newPay]);
        }

        let filtered = [...state.payments];
        const visitIdParam = url.searchParams.get('visit_id');
        if (visitIdParam && visitIdParam.startsWith('eq.')) {
          const vId = visitIdParam.replace('eq.', '');
          filtered = filtered.filter((p) => p.visit_id === vId);
        }
        const statusParam = url.searchParams.get('status_pembayaran');
        if (statusParam && statusParam.startsWith('eq.')) {
          const st = statusParam.replace('eq.', '');
          filtered = filtered.filter((p) => p.status_pembayaran === st);
        }
        return respondPostgrest(route, request, filtered, filtered.length);
      }

      if (table === 'doctor_schedules') {
        return respondPostgrest(route, request, state.doctorSchedules);
      }

      if (table === 'treatments') {
        return respondPostgrest(route, request, state.treatments);
      }

      if (table === 'queue_display_links') {
        return respondPostgrest(route, request, state.queueLinks);
      }

      if (table === 'ai_conversations') {
        if (method === 'DELETE') {
          return respondPostgrest(route, request, []);
        }
        return respondPostgrest(route, request, state.conversations);
      }

      if (table === 'ai_messages') {
        const convParam = url.searchParams.get('conversation_id');
        const convId = convParam ? convParam.replace('eq.', '') : 'conv-sintetis-001';
        return respondPostgrest(route, request, state.messages[convId] || []);
      }

      if (table === 'ai_action_proposals') {
        const convParam = url.searchParams.get('conversation_id');
        const convId = convParam ? convParam.replace('eq.', '') : 'conv-sintetis-001';
        return respondPostgrest(
          route,
          request,
          state.proposals.filter((p) => p.conversation_id === convId)
        );
      }

      // Tabel lain (expenses, master_bahan, visit_obat, satusehat_*, dll.) → array kosong
      return respondPostgrest(route, request, []);
    }

    return respondJson(route, {});
  });
  }

  // Suntikkan localStorage sebelum halaman dimuat bila role atau tema ditentukan
  await page.addInitScript(
    ({ role, users, sessionData, themeMode, mfaFlag }) => {
      try {
        if (role && users[role] && sessionData) {
          window.localStorage.setItem('sb-127-auth-token', JSON.stringify(sessionData));
          window.localStorage.setItem(`theme:${users[role].id}`, themeMode);
        } else if (!role) {
          window.localStorage.removeItem('sb-127-auth-token');
        }
        if (mfaFlag) {
          window.localStorage.setItem('dentiva_mfa_required', 'true');
        } else {
          window.localStorage.removeItem('dentiva_mfa_required');
        }
      } catch {
        // abaikan pada about:blank
      }
    },
    {
      role: ctrl.currentRole,
      users: SYNTHETIC_USERS,
      sessionData: initialSession,
      themeMode: theme,
      mfaFlag: ctrl.mfaEnabled,
    }
  );

  // Bila halaman sudah berada di origin aplikasi, perbarui localStorage secara langsung juga
  if (page.url().startsWith('http')) {
    await page.evaluate(
      ({ role, users, sessionData, themeMode, mfaFlag }) => {
        if (role && users[role] && sessionData) {
          window.localStorage.setItem('sb-127-auth-token', JSON.stringify(sessionData));
          window.localStorage.setItem(`theme:${users[role].id}`, themeMode);
        } else if (!role) {
          window.localStorage.removeItem('sb-127-auth-token');
        }
        if (mfaFlag) {
          window.localStorage.setItem('dentiva_mfa_required', 'true');
        } else {
          window.localStorage.removeItem('dentiva_mfa_required');
        }
      },
      {
        role: ctrl.currentRole,
        users: SYNTHETIC_USERS,
        sessionData: initialSession,
        themeMode: theme,
        mfaFlag: ctrl.mfaEnabled,
      }
    );
  }

  return {
    state,
    users: SYNTHETIC_USERS,
    clinic: SYNTHETIC_CLINIC,
    setRole(newRole) {
      ctrl.currentRole = newRole;
    },
  };
}

/**
 * Jalankan audit aksesibilitas axe-core secara lokal dari paket node_modules/axe-core.
 * Mengembalikan seluruh pelanggaran dan daftar pelanggaran serious/critical.
 */
export async function runAxeAudit(page, options = {}) {
  const hasAxe = await page.evaluate(() => typeof window.axe !== 'undefined');
  if (!hasAxe) {
    await page.addScriptTag({ path: AXE_SCRIPT_PATH });
  }

  const results = await page.evaluate(async (excludeSelectors) => {
    const context = excludeSelectors?.length
      ? { include: [['body']], exclude: excludeSelectors.map((s) => [s]) }
      : document;
    return await window.axe.run(context, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
    });
  }, options.exclude || []);

  const seriousOrCritical = (results.violations || []).filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );

  return {
    violations: results.violations || [],
    seriousOrCritical,
    passesCount: (results.passes || []).length,
  };
}
