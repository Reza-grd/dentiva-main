import { Badge, type BadgeVariant } from "@dentiva/ui";
import {
  CLINIC_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  USER_STATUS_LABELS,
  OPERATOR_ROLE_LABELS,
  CLINIC_USER_ROLE_LABELS,
  ANNOUNCEMENT_SEVERITY_LABELS,
} from "@dentiva/shared";

type Kind = "clinic" | "user" | "invoice" | "payment" | "subscription" | "operatorRole" | "clinicRole" | "severity";

const LABELS: Record<Kind, Record<string, string>> = {
  clinic: CLINIC_STATUS_LABELS,
  user: USER_STATUS_LABELS,
  invoice: INVOICE_STATUS_LABELS,
  payment: PAYMENT_STATUS_LABELS,
  subscription: SUBSCRIPTION_STATUS_LABELS,
  operatorRole: OPERATOR_ROLE_LABELS,
  clinicRole: CLINIC_USER_ROLE_LABELS,
  severity: ANNOUNCEMENT_SEVERITY_LABELS,
};

const VARIANTS: Record<string, BadgeVariant> = {
  // klinik
  pending: "default",
  trial: "primary",
  active: "success",
  suspended: "warning",
  closed: "outline",
  // user
  invited: "primary",
  deactivated: "outline",
  // invoice
  open: "primary",
  paid: "success",
  overdue: "danger",
  void: "outline",
  // payment
  confirmed: "success",
  failed: "danger",
  refunded: "outline",
  // subscription
  trialing: "primary",
  past_due: "danger",
  canceled: "outline",
  // role
  owner: "secondary",
  support: "primary",
  finance: "warning",
  admin: "secondary",
  dokter: "primary",
  resepsionis: "default",
  // severity
  info: "primary",
  warning: "warning",
  critical: "danger",
};

export function StatusBadge({ kind, value }: { kind: Kind; value: string | null | undefined }) {
  if (!value) return <span className="text-text-muted">—</span>;
  return (
    <Badge variant={VARIANTS[value] ?? "default"} className="whitespace-nowrap font-medium">
      {LABELS[kind][value] ?? value}
    </Badge>
  );
}
