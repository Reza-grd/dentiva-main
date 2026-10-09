/**
 * Tipe jawaban per aksi. Kunci harus sama persis dengan ACTIONS di actions.ts
 * (dipaksa oleh tipe `satisfies` di bawah).
 */
import type { ActionName } from "./actions.ts";
import type {
  Announcement,
  AuditEntry,
  ClinicDetail,
  ClinicListItem,
  ClinicNote,
  ClinicUser,
  DashboardSummary,
  Invoice,
  Operator,
  Paginated,
  Payment,
  Plan,
  ProvisionResult,
  SubscriptionListItem,
  UsageDay,
  Clinic,
} from "./types.ts";

export interface UsageOverviewItem {
  clinic_id: string;
  clinic_name: string;
  clinic_status: string;
  plan_name: string | null;
  max_patients: number | null;
  max_users: number | null;
  latest: UsageDay | null;
}

export type ClinicHealthLevel = "sehat" | "perhatian" | "berisiko";

export interface ClinicHealthItem {
  id: string;
  name: string;
  status: string;
  plan_name: string | null;
  score: number;
  level: ClinicHealthLevel;
  reasons: string[];
  metrics: {
    days_inactive: number | null;
    visits_30: number;
    visits_prev_30: number;
    payments_30: number;
    overdue_invoices: number;
    users: number;
    features_used: number;
  };
}

export interface ClinicHealthReport {
  generatedAt: string;
  summary: { total: number; sehat: number; perhatian: number; berisiko: number };
  adoption: { booking: number; whatsapp: number; satusehat: number; ai: number; expenses: number };
  clinics: ClinicHealthItem[];
}

export type ActionResults = {
  "operators.me": Operator;
  "dashboard.summary": DashboardSummary;
  "clinics.list": Paginated<ClinicListItem>;
  "clinics.get": ClinicDetail;
  "clinics.checkSlug": { available: boolean };
  "clinics.create": ProvisionResult;
  "clinics.update": Clinic;
  "clinics.approve": Clinic;
  "clinics.activate": Clinic;
  "clinics.suspend": Clinic;
  "clinics.close": Clinic;
  "clinics.extendTrial": Clinic;
  "clinics.changePlan": { subscriptionId: string };
  "clinics.notes.list": ClinicNote[];
  "clinics.notes.add": ClinicNote;
  "users.list": Paginated<ClinicUser>;
  "users.setStatus": ClinicUser;
  "users.resendInvite": { sent: true };
  "users.sendPasswordReset": { sent: true };
  "billing.plans.list": Plan[];
  "billing.plans.update": Plan;
  "billing.subscriptions.list": Paginated<SubscriptionListItem>;
  "billing.invoices.list": Paginated<Invoice>;
  "billing.invoices.create": Invoice;
  "billing.invoices.void": Invoice;
  "billing.payments.list": Paginated<Payment>;
  "billing.payments.confirmManual": { payment: Payment; invoice: Invoice };
  "usage.clinic": UsageDay[];
  "usage.overview": Paginated<UsageOverviewItem>;
  "insights.clinicHealth": ClinicHealthReport;
  "audit.list": Paginated<AuditEntry>;
  "operators.list": Operator[];
  "operators.invite": Operator;
  "operators.update": Operator;
  "announcements.list": Announcement[];
  "announcements.upsert": Announcement;
  "announcements.end": Announcement;
};

// Compile-time guard: every action has a result type and vice versa.
type _MissingResults = Exclude<ActionName, keyof ActionResults>;
type _ExtraResults = Exclude<keyof ActionResults, ActionName>;
const _check: [_MissingResults, _ExtraResults] extends [never, never] ? true : never = true;
void _check;
