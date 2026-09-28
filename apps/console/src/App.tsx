import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { ActionName } from "@dentiva/shared";
import { AppShell } from "@/components/AppShell";
import { FullPageLoader, LoadingBlock } from "@/components/States";
import { useAuth } from "@/lib/auth";
import { DeniedPage } from "@/modules/auth/DeniedPage";
import { LoginPage } from "@/modules/auth/LoginPage";
import { MfaPage } from "@/modules/auth/MfaPage";
import { SetPasswordPage } from "@/modules/auth/SetPasswordPage";

const named = <K extends string>(loader: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(async () => ({ default: (await loader())[name] }));

const DashboardPage = named(() => import("@/modules/dashboard/DashboardPage"), "DashboardPage");
const ClinicsPage = named(() => import("@/modules/clinics/ClinicsPage"), "ClinicsPage");
const ClinicDetailPage = named(() => import("@/modules/clinics/ClinicDetailPage"), "ClinicDetailPage");
const NewClinicPage = named(() => import("@/modules/clinics/NewClinicPage"), "NewClinicPage");
const UsersPage = named(() => import("@/modules/users/UsersPage"), "UsersPage");
const BillingPage = named(() => import("@/modules/billing/BillingPage"), "BillingPage");
const UsagePage = named(() => import("@/modules/usage/UsagePage"), "UsagePage");
const AuditPage = named(() => import("@/modules/audit/AuditPage"), "AuditPage");
const OperatorsPage = named(() => import("@/modules/operators/OperatorsPage"), "OperatorsPage");
const AnnouncementsPage = named(() => import("@/modules/announcements/AnnouncementsPage"), "AnnouncementsPage");

/** Halaman yang butuh izin aksi tertentu; role lain diarahkan ke dashboard. */
function Guard({ action, children }: { action: ActionName; children: ReactNode }) {
  const { can } = useAuth();
  return can(action) ? <>{children}</> : <Navigate to="/" replace />;
}

export function App() {
  const { status } = useAuth();

  switch (status) {
    case "loading":
      return <FullPageLoader />;
    case "signed_out":
      return <LoginPage />;
    case "set_password":
      return <SetPasswordPage />;
    case "mfa_enroll":
      return <MfaPage mode="enroll" />;
    case "mfa_verify":
      return <MfaPage mode="verify" />;
    case "denied":
      return <DeniedPage />;
  }

  return (
    <Suspense fallback={<LoadingBlock />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="clinics" element={<ClinicsPage />} />
          <Route
            path="clinics/new"
            element={
              <Guard action="clinics.create">
                <NewClinicPage />
              </Guard>
            }
          />
          <Route path="clinics/:clinicId" element={<ClinicDetailPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="usage" element={<UsagePage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route
            path="operators"
            element={
              <Guard action="operators.list">
                <OperatorsPage />
              </Guard>
            }
          />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="set-password" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
