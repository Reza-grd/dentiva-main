/**
 * Bentuk data yang dikembalikan console-api. Murni tipe (tanpa runtime),
 * dipakai oleh handler di Edge Function dan oleh apps/console.
 */
import type {
  AnnouncementAudience,
  AnnouncementSeverity,
  ClinicStatus,
  ClinicUserRole,
  InvoiceStatus,
  OperatorRole,
  PaymentProvider,
  PaymentStatus,
  SubscriptionStatus,
  UserStatus,
} from "./constants.ts";

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PlanRef {
  id: string;
  name: string;
}

export interface Plan extends PlanRef {
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_patients: number;
  features: Record<string, boolean>;
  is_active: boolean;
}

export interface SubscriptionRef {
  id: string;
  status: SubscriptionStatus;
  plan: PlanRef | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface ClinicListItem {
  id: string;
  name: string;
  slug: string;
  status: ClinicStatus;
  city: string | null;
  province: string | null;
  created_at: string;
  trial_ends_at: string | null;
  plan_name: string | null;
  subscription_status: SubscriptionStatus | null;
  users_count: number;
  patients_total: number;
  last_activity_at: string | null;
}

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  status: ClinicStatus;
  owner_user_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  created_at: string;
  updated_at: string | null;
  trial_ends_at: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
}

export interface ClinicUser {
  id: string;
  clinic_id: string;
  clinic_name: string | null;
  email: string;
  full_name: string;
  role: ClinicUserRole;
  status: UserStatus;
  last_login_at: string | null;
  created_at: string;
}

export interface UsageDay {
  date: string;
  patients_total: number;
  visits_count: number;
  active_users: number;
  storage_bytes: number;
  wa_sent: number;
  satusehat_errors: number;
}

export interface ClinicDetail {
  clinic: Clinic;
  subscription: SubscriptionRef | null;
  plan: Plan | null;
  users: ClinicUser[];
  latestUsage: UsageDay | null;
  openInvoices: Invoice[];
}

export interface ClinicNote {
  id: string;
  clinic_id: string;
  operator_id: string;
  operator_name: string | null;
  body: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  clinic_id: string;
  clinic_name: string | null;
  number: string;
  period_start: string;
  period_end: string;
  amount_idr: number;
  tax_idr: number;
  status: InvoiceStatus;
  due_date: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string | null;
  invoice_number: string | null;
  clinic_id: string;
  clinic_name: string | null;
  provider: PaymentProvider;
  provider_ref: string | null;
  amount_idr: number;
  status: PaymentStatus;
  confirmed_by: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface SubscriptionListItem extends SubscriptionRef {
  clinic_id: string;
  clinic_name: string | null;
  clinic_status: ClinicStatus | null;
  price_monthly: number | null;
}

export interface AuditEntry {
  id: string;
  operator_id: string | null;
  operator_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  clinic_id: string | null;
  clinic_name: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  created_at: string;
}

export interface Operator {
  user_id: string;
  email: string | null;
  full_name: string;
  role: OperatorRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  audience: AnnouncementAudience;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

export interface DashboardSummary {
  clinicsByStatus: Record<ClinicStatus, number>;
  newClinicsThisMonth: number;
  mrrIdr: number;
  activeSubscriptions: number;
  invoicesDue: { count: number; amountIdr: number };
  invoicesOverdue: { count: number; amountIdr: number };
  trialsEndingSoon: Array<{ id: string; name: string; trial_ends_at: string }>;
  churnRisk: Array<{ id: string; name: string; last_activity_at: string | null }>;
  generatedAt: string;
}

export interface ProvisionResult {
  clinicId: string;
  ownerUserId: string;
  inviteSent: boolean;
}
