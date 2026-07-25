import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { usePermission } from "../contexts/PermissionsContext";
import { useToast } from "../components/ui/Toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { SkeletonCard } from "../components/ui/Skeleton";
import { Check, ShieldCheck, Zap, Sparkles, HelpCircle } from "lucide-react";

export default function PricingPage() {
  const { userProfile } = useAuth();
  const { plan: currentPlan, subscription } = usePermission();
  const { toast } = useToast();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [processingPlanId, setProcessingPlanId] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error("Failed to load subscription plans:", err);
      toast({
        title: "Gagal Memuat Paket",
        description: err.message,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (userProfile?.role !== "admin") {
      toast({
        title: "Akses Dibatasi",
        description: "Hanya Manajer Klinik (Admin) yang dapat mengubah paket langganan.",
        variant: "warning",
      });
      return;
    }

    try {
      setProcessingPlanId(planId);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke(
        "midtrans-create-transaction",
        {
          body: { plan_id: planId, billing_cycle: billingCycle },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Gagal membuat transaksi");
      }

      if (data.redirect_url) {
        toast({
          title: "Mengarahkan ke Pembayaran...",
          description: "Membuka gerbang pembayaran Midtrans Snap.",
          variant: "info",
        });
        window.location.href = data.redirect_url;
      }
    } catch (err) {
      console.error("Payment initiation error:", err);
      toast({
        title: "Gagal Memulai Pembayaran",
        description: err.message,
        variant: "error",
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const formatIDR = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Header section */}
      <div className="text-center space-y-3">
        <Badge variant="accent" className="px-3 py-1">
          <Sparkles className="w-3.5 h-3.5 mr-1 inline" /> Dentiva SaaS Subscription
        </Badge>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
          Pilih Paket Terbaik untuk Klinik Anda
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Tingkatkan operasional klinik gigi Anda dengan AI Copilot, otomatisasi WhatsApp, dan laporan keuangan komprehensif.
        </p>

        {/* Billing cycle toggle */}
        <div className="pt-4 flex justify-center">
          <Tabs value={billingCycle} onValueChange={setBillingCycle}>
            <TabsList className="bg-gray-100 dark:bg-gray-800/80 p-1">
              <TabsTrigger value="monthly" className="px-6">
                Bulanan
              </TabsTrigger>
              <TabsTrigger value="yearly" className="px-6">
                Tahunan <span className="ml-1 text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">Hemat 16%</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Cards section */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((p) => {
            const isPopular = p.name === "Pro";
            const isCurrent = currentPlan?.id === p.id;
            const price = billingCycle === "yearly" ? p.price_yearly : p.price_monthly;

            return (
              <Card
                key={p.id}
                className={`relative flex flex-col justify-between transition-all duration-200 ${
                  isPopular
                    ? "border-2 border-[var(--color-accent)] shadow-xl scale-105 bg-white dark:bg-[#14171F]"
                    : ""
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-secondary)] text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                    Paling Populer
                  </div>
                )}

                <div>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-xl font-bold">{p.name}</CardTitle>
                      {isCurrent && <Badge variant="success">Paket Aktif</Badge>}
                    </div>
                    <CardDescription className="mt-2">
                      {p.name === "Starter" && "Cocok untuk praktik mandiri / 1 dokter."}
                      {p.name === "Pro" && "Ideal untuk klinik tumbuh dengan tim dokter."}
                      {p.name === "Enterprise" && "Solusi tanpa batas untuk jaringan klinik besar."}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Price */}
                    <div>
                      <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                        {formatIDR(price)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        per klinik / {billingCycle === "yearly" ? "tahun" : "bulan"}
                      </div>
                    </div>

                    {/* Features checklist */}
                    <div className="space-y-2.5 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>Maksimal <strong>{p.max_users} Pengguna</strong> (Dokter/Staff)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>Hingga <strong>{p.max_patients.toLocaleString()} Pasien</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>Integrasi SATUSEHAT Kemenkes RI</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check
                          className={`w-4 h-4 flex-shrink-0 ${
                            p.features?.whatsapp_reminders ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"
                          }`}
                        />
                        <span className={!p.features?.whatsapp_reminders ? "text-gray-400 dark:text-gray-500 line-through" : ""}>
                          Otomatisasi WhatsApp Reminder (H-1 & Jam)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check
                          className={`w-4 h-4 flex-shrink-0 ${
                            p.features?.custom_reports ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"
                          }`}
                        />
                        <span className={!p.features?.custom_reports ? "text-gray-400 dark:text-gray-500 line-through" : ""}>
                          Laporan Laba/Rugi & Costing Treatment
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="pt-6">
                  <Button
                    variant={isPopular ? "primary" : "outline"}
                    className="w-full"
                    disabled={isCurrent || processingPlanId === p.id}
                    isLoading={processingPlanId === p.id}
                    onClick={() => handleSubscribe(p.id)}
                  >
                    {isCurrent ? "Paket Saat Ini" : `Pilih Paket ${p.name}`}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Trust badge & FAQ footer */}
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-[var(--color-accent)] flex-shrink-0" />
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-200">Pembayaran Aman via Midtrans Snap</div>
            <div>Mendukung QRIS, Transfer Bank BCA/Mandiri/BRI, E-Wallet, & Kartu Kredit.</div>
          </div>
        </div>
        <div className="flex items-center gap-2 font-medium">
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span>Butuh bantuan? Hubungi Support Dentiva</span>
        </div>
      </div>
    </div>
  );
}
