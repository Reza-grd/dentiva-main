/**
 * Dentiva platform constants — SINGLE SOURCE OF TRUTH.
 *
 * Dipakai oleh:
 *   - supabase/functions/console-api (Deno)
 *   - packages/shared (di-re-export ke apps/console dan apps/clinic)
 *
 * Setiap daftar di sini dicerminkan oleh CHECK constraint di database
 * (lihat supabase/migrations/*_clinic_user_status.sql, *_platform_schema.sql,
 * *_billing_tables.sql). Jika menambah nilai, tambahkan juga migration baru
 * yang memperbarui constraint terkait.
 *
 * File ini harus tetap bebas dependensi (tanpa import) agar bisa dipakai
 * di Deno maupun Node/Vite.
 */

export const CLINIC_STATUSES = ["pending", "trial", "active", "suspended", "closed"] as const;
export type ClinicStatus = (typeof CLINIC_STATUSES)[number];

/** Status klinik yang boleh mengakses datanya (dicerminkan oleh public.get_user_clinic_id()). */
export const CLINIC_ACCESS_STATUSES = ["trial", "active"] as const satisfies readonly ClinicStatus[];

export const USER_STATUSES = ["invited", "active", "suspended", "deactivated"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Status user klinik yang boleh login dan mengakses data. */
export const USER_ACCESS_STATUSES = ["invited", "active"] as const satisfies readonly UserStatus[];

export const CLINIC_USER_ROLES = ["admin", "dokter", "resepsionis"] as const;
export type ClinicUserRole = (typeof CLINIC_USER_ROLES)[number];

export const OPERATOR_ROLES = ["owner", "support", "finance"] as const;
export type OperatorRole = (typeof OPERATOR_ROLES)[number];

export const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "canceled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const INVOICE_STATUSES = ["open", "paid", "overdue", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_PROVIDERS = ["midtrans", "manual"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_STATUSES = ["pending", "confirmed", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ANNOUNCEMENT_SEVERITIES = ["info", "warning", "critical"] as const;
export type AnnouncementSeverity = (typeof ANNOUNCEMENT_SEVERITIES)[number];

/** Target pengumuman: semua klinik, hanya klinik trial, hanya klinik aktif, atau hanya admin klinik. */
export const ANNOUNCEMENT_AUDIENCES = ["all", "trial", "active", "admins"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

/** UUID klinik default warisan era single-tenant (lihat migration 24). */
export const LEGACY_DEFAULT_CLINIC_ID = "d0000000-0000-0000-0000-000000000000";

/** Batas baris per halaman untuk semua daftar di Console. */
export const MAX_PAGE_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 25;

/** Durasi trial bawaan saat mendaftarkan klinik baru. */
export const DEFAULT_TRIAL_DAYS = 14;

/** Klinik dianggap berisiko berhenti jika tidak ada login selama N hari. */
export const CHURN_RISK_INACTIVE_DAYS = 14;

export const CLINIC_STATUS_LABELS: Record<ClinicStatus, string> = {
  pending: "Menunggu",
  trial: "Trial",
  active: "Aktif",
  suspended: "Ditangguhkan",
  closed: "Ditutup",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  invited: "Diundang",
  active: "Aktif",
  suspended: "Ditangguhkan",
  deactivated: "Nonaktif",
};

export const CLINIC_USER_ROLE_LABELS: Record<ClinicUserRole, string> = {
  admin: "Admin Klinik",
  dokter: "Dokter",
  resepsionis: "Resepsionis",
};

export const OPERATOR_ROLE_LABELS: Record<OperatorRole, string> = {
  owner: "Owner",
  support: "Support",
  finance: "Finance",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Trial",
  active: "Aktif",
  past_due: "Menunggak",
  canceled: "Dibatalkan",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  open: "Belum dibayar",
  paid: "Lunas",
  overdue: "Jatuh tempo",
  void: "Dibatalkan",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  failed: "Gagal",
  refunded: "Dikembalikan",
};

export const ANNOUNCEMENT_SEVERITY_LABELS: Record<AnnouncementSeverity, string> = {
  info: "Info",
  warning: "Peringatan",
  critical: "Kritis",
};

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: "Semua klinik",
  trial: "Klinik trial",
  active: "Klinik aktif",
  admins: "Admin klinik saja",
};
