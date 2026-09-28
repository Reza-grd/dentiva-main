import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dentiva/ui";
import { PageHeader } from "@/components/PageHeader";
import { useUrlState } from "@/lib/hooks";
import { InvoicesTab } from "./InvoicesTab";
import { PaymentsTab } from "./PaymentsTab";
import { PlansTab } from "./PlansTab";
import { SubscriptionsTab } from "./SubscriptionsTab";

const TABS = ["subscriptions", "invoices", "payments", "plans"] as const;
type Tab = (typeof TABS)[number];
const KEYS = ["tab"] as const;

export function BillingPage() {
  const { values, set } = useUrlState(KEYS);
  const tab: Tab = TABS.includes(values.tab as Tab) ? (values.tab as Tab) : "subscriptions";

  return (
    <>
      <PageHeader
        title="Langganan & keuangan"
        description="Pendapatan Dentiva dari langganan klinik. Omzet klinik dari pasien tidak ditampilkan."
      />
      <Tabs value={tab} onValueChange={(v) => set({ tab: v, q: undefined, status: undefined, clinicId: undefined, page: undefined } as never)}>
        <TabsList className="mb-4">
          <TabsTrigger value="subscriptions">Langganan</TabsTrigger>
          <TabsTrigger value="invoices">Invoice</TabsTrigger>
          <TabsTrigger value="payments">Pembayaran</TabsTrigger>
          <TabsTrigger value="plans">Paket</TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions">
          <SubscriptionsTab />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="plans">
          <PlansTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
