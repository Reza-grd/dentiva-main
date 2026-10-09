/**
 * Kontrak console-api v1.
 *
 * Satu entri = satu aksi. Setiap entri menentukan:
 *   - roles   : role operator yang diizinkan (tabel "Keamanan dan hak akses operator")
 *   - mutates : true jika aksi mengubah data → router wajib menulis platform.audit_logs
 *   - params  : skema zod untuk validasi input
 *
 * Aturan evolusi (lihat docs/dentiva-console.md → "Aturan agar mudah dikembangkan"):
 *   - Aksi baru boleh ditambah kapan saja.
 *   - Arti aksi lama TIDAK diubah. Jika perlu perilaku berbeda, buat aksi baru
 *     (mis. "clinics.suspend.v2") dan tandai yang lama `deprecated: true`.
 */
import { z } from "zod";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_SEVERITIES,
  CLINIC_STATUSES,
  CLINIC_USER_ROLES,
  DEFAULT_PAGE_SIZE,
  DEFAULT_TRIAL_DAYS,
  INVOICE_STATUSES,
  MAX_PAGE_SIZE,
  OPERATOR_ROLES,
  PAYMENT_PROVIDERS,
  SUBSCRIPTION_STATUSES,
  USER_STATUSES,
  type OperatorRole,
} from "./constants.ts";

export const API_VERSION = 1 as const;

// ─── Primitif ────────────────────────────────────────────────────────────────
// z.guid() (bukan z.uuid()) karena klinik default warisan memakai
// 'd0000000-0000-...' yang bukan UUID RFC 4122 yang valid.
const id = z.guid({ message: "ID tidak valid" });
const reason = z.string().trim().min(5, "Alasan minimal 5 karakter").max(500);
const optionalReason = z.string().trim().max(500).optional();
const isoDate = z.iso.date({ message: "Format tanggal harus YYYY-MM-DD" });
const isoDateTime = z.iso.datetime({ offset: true, message: "Format waktu tidak valid" });
const rupiah = z.number().int("Nominal harus bilangan bulat").nonnegative().max(1_000_000_000_000);
const search = z.string().trim().max(100).optional();
const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{6,20}$/, "Nomor telepon tidak valid")
  .optional()
  .or(z.literal("").transform(() => undefined));
const pagination = {
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};
const empty = z.object({}).strict();

const ALL: readonly OperatorRole[] = OPERATOR_ROLES;
const OWNER_SUPPORT: readonly OperatorRole[] = ["owner", "support"];
const OWNER_FINANCE: readonly OperatorRole[] = ["owner", "finance"];
const OWNER: readonly OperatorRole[] = ["owner"];

const clinicProfile = z.object({
  name: z.string().trim().min(3, "Nama klinik minimal 3 karakter").max(120),
  phone,
  email: z.email("Email tidak valid").optional().or(z.literal("").transform(() => undefined)),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(80).optional(),
  province: z.string().trim().max(80).optional(),
});

export interface ActionSpec {
  roles: readonly OperatorRole[];
  mutates: boolean;
  params: z.ZodType;
  deprecated?: boolean;
  description: string;
}

export const ACTIONS = {
  // ─── Operator (diri sendiri) ───────────────────────────────────────────────
  "operators.me": {
    roles: ALL,
    mutates: false,
    params: empty,
    description: "Profil operator yang sedang login.",
  },

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  "dashboard.summary": {
    roles: ALL,
    mutates: false,
    params: empty,
    description: "Ringkasan klinik per status, MRR, tagihan jatuh tempo, trial berakhir, risiko churn.",
  },

  // ─── Klinik ────────────────────────────────────────────────────────────────
  "clinics.list": {
    roles: ALL,
    mutates: false,
    params: z.object({
      search,
      status: z.enum(CLINIC_STATUSES).optional(),
      ...pagination,
    }),
    description: "Daftar klinik dengan pencarian (nama/slug/kota) dan filter status.",
  },
  "clinics.get": {
    roles: ALL,
    mutates: false,
    params: z.object({ clinicId: id }),
    description: "Detail klinik: profil, langganan, user, pemakaian terakhir, tagihan terbuka.",
  },
  "clinics.checkSlug": {
    roles: OWNER_SUPPORT,
    mutates: false,
    params: z.object({ slug: z.string().trim().min(3).max(60) }),
    description: "Cek ketersediaan slug klinik.",
  },
  "clinics.create": {
    roles: OWNER_SUPPORT,
    mutates: true,
    params: z.object({
      clinic: clinicProfile.extend({
        slug: z
          .string()
          .trim()
          .min(3)
          .max(60)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya huruf kecil, angka, dan tanda hubung"),
      }),
      owner: z.object({
        fullName: z.string().trim().min(3).max(120),
        email: z.email("Email pemilik tidak valid"),
        phone,
      }),
      planId: id,
      trialDays: z.number().int().min(0).max(90).default(DEFAULT_TRIAL_DAYS),
    }),
    description: "Daftarkan klinik baru + akun pemilik (admin klinik) dalam status trial.",
  },
  "clinics.update": {
    roles: OWNER_SUPPORT,
    mutates: true,
    params: z.object({ clinicId: id, patch: clinicProfile.partial() }),
    description: "Ubah profil klinik (nama, kontak, alamat).",
  },
  "clinics.approve": {
    roles: OWNER_SUPPORT,
    mutates: true,
    params: z.object({ clinicId: id, trialDays: z.number().int().min(1).max(90).default(14), reason: optionalReason }),
    description: "Setujui pendaftaran mandiri: klinik 'pending' menjadi trial.",
  },
  "clinics.activate": {
    roles: OWNER_SUPPORT,
    mutates: true,
    params: z.object({ clinicId: id, reason: optionalReason }),
    description: "Aktifkan klinik (dari pending/trial/suspended).",
  },
  "clinics.suspend": {
    roles: OWNER_SUPPORT,
    mutates: true,
    params: z.object({ clinicId: id, reason }),
    description: "Tangguhkan klinik. Seluruh staf langsung kehilangan akses data.",
  },
  "clinics.close": {
    roles: OWNER_SUPPORT,
    mutates: true,
    params: z.object({ clinicId: id, reason, confirmSlug: z.string().trim() }),
    description: "Tutup klinik permanen (data tetap disimpan sesuai kewajiban retensi rekam medis).",
  },
  "clinics.extendTrial": {
    roles: OWNER_SUPPORT,
    mutates: true,
    params: z.object({ clinicId: id, days: z.number().int().min(1).max(90), reason }),
    description: "Perpanjang masa trial klinik.",
  },
  "clinics.changePlan": {
    roles: OWNER,
    mutates: true,
    params: z.object({ clinicId: id, planId: id, reason }),
    description: "Ganti paket langganan klinik.",
  },
  "clinics.notes.list": {
    roles: ALL,
    mutates: false,
    params: z.object({ clinicId: id }),
    description: "Catatan internal tim untuk klinik.",
  },
  "clinics.notes.add": {
    roles: ALL,
    mutates: true,
    params: z.object({ clinicId: id, body: z.string().trim().min(2).max(4000) }),
    description: "Tambah catatan internal tim.",
  },

  // ─── Pengguna klinik ───────────────────────────────────────────────────────
  "users.list": {
    roles: ALL,
    mutates: false,
    params: z.object({
      search,
      clinicId: id.optional(),
      status: z.enum(USER_STATUSES).optional(),
      role: z.enum(CLINIC_USER_ROLES).optional(),
      ...pagination,
    }),
    description: "Semua user lintas klinik.",
  },
  "users.setStatus": {
    roles: OWNER_SUPPORT,
    mutates: true,
    params: z.object({
      userId: id,
      status: z.enum(["active", "suspended", "deactivated"]),
      reason,
    }),
    description: "Aktifkan / tangguhkan / nonaktifkan user klinik. Sesi aktif user ikut dicabut.",
  },
  "users.resendInvite": {
    roles: OWNER_SUPPORT,
    mutates: true,
    params: z.object({ userId: id }),
    description: "Kirim ulang email undangan ke user berstatus 'invited'.",
  },
  "users.sendPasswordReset": {
    roles: OWNER_SUPPORT,
    mutates: true,
    params: z.object({ userId: id, reason }),
    description: "Kirim email reset password ke user klinik.",
  },

  // ─── Langganan & keuangan ──────────────────────────────────────────────────
  "billing.plans.list": {
    roles: ALL,
    mutates: false,
    params: z.object({ includeInactive: z.boolean().default(false) }),
    description: "Katalog paket.",
  },
  "billing.plans.update": {
    roles: OWNER,
    mutates: true,
    params: z.object({
      planId: id,
      patch: z
        .object({
          price_monthly: rupiah,
          price_yearly: rupiah,
          max_users: z.number().int().min(1).max(100_000),
          max_patients: z.number().int().min(1).max(10_000_000),
          features: z.record(z.string().regex(/^[a-z0-9_]+$/), z.boolean()),
          is_active: z.boolean(),
        })
        .partial(),
      reason,
    }),
    description: "Ubah harga, batas, atau fitur paket.",
  },
  "billing.subscriptions.list": {
    roles: ALL,
    mutates: false,
    params: z.object({ search, status: z.enum(SUBSCRIPTION_STATUSES).optional(), ...pagination }),
    description: "Daftar langganan klinik.",
  },
  "billing.invoices.list": {
    roles: ALL,
    mutates: false,
    params: z.object({
      search,
      clinicId: id.optional(),
      status: z.enum(INVOICE_STATUSES).optional(),
      ...pagination,
    }),
    description: "Daftar invoice.",
  },
  "billing.invoices.create": {
    roles: OWNER_FINANCE,
    mutates: true,
    params: z
      .object({
        clinicId: id,
        periodStart: isoDate,
        periodEnd: isoDate,
        amountIdr: rupiah.min(1, "Nominal harus lebih dari 0"),
        taxIdr: rupiah.default(0),
        dueDate: isoDate,
        notes: z.string().trim().max(500).optional(),
      })
      .refine((v) => v.periodEnd >= v.periodStart, {
        message: "Akhir periode harus setelah awal periode",
        path: ["periodEnd"],
      }),
    description: "Buat invoice langganan untuk klinik.",
  },
  "billing.invoices.void": {
    roles: OWNER_FINANCE,
    mutates: true,
    params: z.object({ invoiceId: id, reason }),
    description: "Batalkan invoice (invoice tidak pernah dihapus).",
  },
  "billing.payments.list": {
    roles: ALL,
    mutates: false,
    params: z.object({
      clinicId: id.optional(),
      invoiceId: id.optional(),
      provider: z.enum(PAYMENT_PROVIDERS).optional(),
      ...pagination,
    }),
    description: "Daftar pembayaran (Midtrans & transfer manual).",
  },
  "billing.payments.confirmManual": {
    roles: OWNER_FINANCE,
    mutates: true,
    params: z.object({
      invoiceId: id,
      amountIdr: rupiah.min(1),
      paidAt: isoDateTime,
      reference: z.string().trim().min(3, "Isi nomor referensi transfer").max(120),
      notes: z.string().trim().max(500).optional(),
    }),
    description: "Konfirmasi transfer manual; invoice menjadi lunas jika nominal mencukupi.",
  },

  // ─── Pemakaian ─────────────────────────────────────────────────────────────
  "usage.clinic": {
    roles: ALL,
    mutates: false,
    params: z.object({ clinicId: id, days: z.number().int().min(7).max(365).default(30) }),
    description: "Deret harian pemakaian klinik (tanpa data pasien).",
  },
  "usage.overview": {
    roles: ALL,
    mutates: false,
    params: z.object({ search, ...pagination }),
    description: "Pemakaian terakhir semua klinik vs batas paket.",
  },

  // ─── Wawasan ───────────────────────────────────────────────────────────────
  "insights.clinicHealth": {
    roles: ALL,
    mutates: false,
    params: z.object({ limit: z.number().int().min(1).max(500).default(50) }),
    description: "Skor kesehatan klinik 0–100 (aturan tetap) beserta alasan dan adopsi fitur; tanpa data pasien.",
  },

  // ─── Audit ─────────────────────────────────────────────────────────────────
  "audit.list": {
    roles: ALL,
    mutates: false,
    params: z.object({
      operatorId: id.optional(),
      clinicId: id.optional(),
      action: z.string().trim().max(80).optional(),
      from: isoDate.optional(),
      to: isoDate.optional(),
      ...pagination,
    }),
    description: "Log aksi operator.",
  },

  // ─── Operator (kelola) ─────────────────────────────────────────────────────
  "operators.list": {
    roles: OWNER,
    mutates: false,
    params: empty,
    description: "Daftar operator Console.",
  },
  "operators.invite": {
    roles: OWNER,
    mutates: true,
    params: z.object({
      email: z.email("Email tidak valid"),
      fullName: z.string().trim().min(3).max(120),
      role: z.enum(OPERATOR_ROLES),
    }),
    description: "Undang operator baru (wajib aktifkan MFA saat login pertama).",
  },
  "operators.update": {
    roles: OWNER,
    mutates: true,
    params: z.object({
      operatorId: id,
      role: z.enum(OPERATOR_ROLES).optional(),
      isActive: z.boolean().optional(),
      reason,
    }),
    description: "Ubah role atau nonaktifkan operator.",
  },

  // ─── Pengumuman ────────────────────────────────────────────────────────────
  "announcements.list": {
    roles: ALL,
    mutates: false,
    params: z.object({ includeExpired: z.boolean().default(false) }),
    description: "Pengumuman yang tampil di aplikasi klinik.",
  },
  "announcements.upsert": {
    roles: OWNER_SUPPORT,
    mutates: true,
    params: z
      .object({
        id: id.optional(),
        title: z.string().trim().min(3).max(120),
        body: z.string().trim().min(3).max(2000),
        severity: z.enum(ANNOUNCEMENT_SEVERITIES).default("info"),
        audience: z.enum(ANNOUNCEMENT_AUDIENCES).default("all"),
        startsAt: isoDateTime,
        endsAt: isoDateTime.nullable().optional(),
      })
      .refine((v) => !v.endsAt || v.endsAt > v.startsAt, {
        message: "Waktu selesai harus setelah waktu mulai",
        path: ["endsAt"],
      }),
    description: "Buat atau ubah pengumuman.",
  },
  "announcements.end": {
    roles: OWNER_SUPPORT,
    mutates: true,
    params: z.object({ id }),
    description: "Akhiri pengumuman sekarang.",
  },
} as const satisfies Record<string, ActionSpec>;

export type ActionName = keyof typeof ACTIONS;
export type ActionParams<A extends ActionName> = z.input<(typeof ACTIONS)[A]["params"]>;
export type ParsedActionParams<A extends ActionName> = z.output<(typeof ACTIONS)[A]["params"]>;

export const ACTION_NAMES = Object.keys(ACTIONS) as ActionName[];

export function isActionName(value: unknown): value is ActionName {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ACTIONS, value);
}

/** Apakah role operator boleh menjalankan aksi ini. Dipakai router dan UI (menyembunyikan tombol). */
export function canPerform(role: OperatorRole | null | undefined, action: ActionName): boolean {
  if (!role) return false;
  return (ACTIONS[action].roles as readonly OperatorRole[]).includes(role);
}

// ─── Envelope permintaan & jawaban ───────────────────────────────────────────

export const requestEnvelope = z.object({
  v: z.literal(API_VERSION),
  action: z.string().min(1).max(80),
  params: z.unknown().optional(),
});

export const ERROR_CODES = [
  "unauthenticated",
  "mfa_required",
  "not_operator",
  "forbidden",
  "invalid_request",
  "invalid_params",
  "unknown_action",
  "unsupported_version",
  "not_found",
  "conflict",
  "precondition_failed",
  "audit_failed",
  "internal",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiError {
  code: ErrorCode;
  message: string;
  /** Detail validasi per field (untuk invalid_params). */
  fields?: Record<string, string>;
  requestId?: string;
}

export type ApiResponse<T> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; error: ApiError };
