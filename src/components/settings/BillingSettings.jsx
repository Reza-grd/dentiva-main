import React from "react";
import { useNavigate } from "react-router-dom";
import { usePermission } from "../../contexts/PermissionsContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { CreditCard, Calendar, Users, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

export default function BillingSettings() {
  const navigate = useNavigate();
  const { plan, subscription, loadingSubscription } = usePermission();

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Aktif</Badge>;
      case "past_due":
        return <Badge variant="danger">Tunggakan (Past Due)</Badge>;
      case "canceled":
        return <Badge variant="secondary">Dibatalkan</Badge>;
      default:
        return <Badge variant="warning">Trial / Gratis</Badge>;
    }
  };

  if (loadingSubscription) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-gray-500">
          Memuat status langganan...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[var(--color-accent)]" />
                Langganan Dentiva SaaS
              </CardTitle>
              <CardDescription className="mt-1">
                Informasi paket langganan aktif dan batas penggunaan klinik Anda.
              </CardDescription>
            </div>
            {getStatusBadge(subscription?.status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Active Plan details grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Paket Langganan</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {plan?.name || "Starter (Default)"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Berakhir Pada
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                {formatDate(subscription?.current_period_end)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Kuota Pengguna
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                Maks. {plan?.max_users || 3} User / {plan?.max_patients || 1000} Pasien
              </div>
            </div>
          </div>

          {/* Feature highlights */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Fitur Termasuk Dalam Paket:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Integrasi SATUSEHAT Kemenkes RI</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-4 h-4 ${
                    plan?.features?.whatsapp_reminders ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"
                  }`}
                />
                <span className={!plan?.features?.whatsapp_reminders ? "line-through text-gray-400" : ""}>
                  Otomatisasi WhatsApp Reminder
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-4 h-4 ${
                    plan?.features?.custom_reports ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"
                  }`}
                />
                <span className={!plan?.features?.custom_reports ? "line-through text-gray-400" : ""}>
                  Laporan Laba/Rugi & Costing
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Rekam Medis Odontogram Digital</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
          <div className="text-xs text-gray-500">
            Dikelola via Midtrans Snap Payment Gateway
          </div>
          <Button variant="primary" onClick={() => navigate("/pricing")}>
            <Sparkles className="w-4 h-4 mr-2" /> Upgrade / Ubah Paket
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
