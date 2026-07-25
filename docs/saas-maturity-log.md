# SaaS Maturity Program — Remediation Log

**Repo:** `Reza-grd/dentiva-main`
**Started:** 2026-07-25

---

## Phase 0 — RLS Fix on Billing Tables

**Status:** Complete

**Migration file:** `supabase/migrations/51_billing_rls_and_fk.sql`

**What was done:**
- `subscription_plans`: Enabled RLS. Added `Plans_Public_SELECT` policy (`USING (auth.role() = 'authenticated')`) — any authenticated user can read the plan catalog. No client-facing write policies; only `service_role` can modify plans.
- `clinic_subscriptions`: Added missing FK constraint (`clinic_id → public.clinics(id) ON DELETE CASCADE`). Enabled RLS. Added `Subscriptions_Clinic_SELECT` for all staff roles scoped to `get_user_clinic_id()`. Added `Subscriptions_Admin_UPDATE` for admin-only client-side updates. No INSERT/DELETE client policies — Midtrans webhook writes via `service_role`.

**Pattern used:** Established codebase pattern from migrations 43, 46, 48 using `public.get_user_clinic_id()` + `public.get_user_role()`.

**Verification:** Grep confirmed ZERO references to `subscription_plans` or `clinic_subscriptions` in `src/` — no existing client code is affected by new RLS. `public.clinics` table confirmed present (migration 24) with UUID primary key — FK constraint is valid.

> [!NOTE]
> Migration must be applied via Supabase Dashboard SQL Editor before Phase 2 frontend code goes live. The FK `ADD CONSTRAINT` will fail if any existing rows in `clinic_subscriptions` have a `clinic_id` that doesn't exist in `public.clinics`.

---

## Phase 1 — Design System Foundation

**Status:** In Progress

**Components added:**
- `Dialog` (wrapping `@radix-ui/react-dialog` — already installed)
- `Select`
- `Table` (with responsive card-list below `md`)
- `Tabs`
- `Toast` + `ToastProvider`
- `Skeleton`
- `Tooltip`

**Token changes:** Extending `src/styles/theme.css` with missing semantic tokens (`--color-success`, `--color-warning`, `--color-info`, `color-scheme`).

**Storybook:** Being configured (Storybook 8.x + `@storybook/react-vite` + `@storybook/addon-a11y`). Dev server only — build output not committed.

---

## Phase 2 — Subscription & Billing

**Status:** Pending Phase 1

**Midtrans integration verified against:** Web search returning midtrans.com-sourced content
- Snap sandbox endpoint: `POST https://app.sandbox.midtrans.com/snap/v1/transactions` ✅ confirmed
- Snap production endpoint: `POST https://app.midtrans.com/snap/v1/transactions` ✅ confirmed
- Auth: `Authorization: Basic base64(ServerKey + ":")` ✅ confirmed
- Request body minimum: `{ "transaction_details": { "order_id": string, "gross_amount": integer } }` ✅ confirmed
- Response: `{ "token": string, "redirect_url": string }` on HTTP 201 ✅ confirmed
- Webhook signature: `SHA512(order_id + status_code + gross_amount + ServerKey)` ✅ confirmed

> NEEDS-HUMAN-VERIFICATION: Exact field names in webhook notification payload beyond confirmed fields (`order_id`, `status_code`, `gross_amount`, `signature_key`, `transaction_status`). docs.midtrans.com returned HTTP 404 from this environment.
> NEEDS-HUMAN-VERIFICATION: `MIDTRANS_SERVER_KEY` secret must be added to Supabase Edge Function secrets before going live.

**Edge functions planned:**
- `midtrans-create-transaction`
- `midtrans-webhook`

**Features to gate:**
- `whatsapp_reminders` — in `PaymentForm.jsx` (send-whatsapp invocation)
- `custom_reports` — wherever report generation is triggered
- `max_users` enforcement — in `admin-create-user` edge function
- `max_patients` enforcement — in patient creation flow

---

## Phase 3 — Accessibility

**Status:** Pending Phase 1

**Lighthouse scores before:** Not yet measured (will run after Phase 1 is complete)
**Known gaps identified from research:**
- `#3B82F6` blue on white = 3.15:1 contrast ratio — FAILS WCAG AA for normal text
- `framer-motion` used in 3 files without `prefers-reduced-motion` guard
- No skip-to-content link in `MainLayout.jsx`
- No `aria-label` audit done yet for icon-only buttons
- Odontogram keyboard operability: not yet assessed

---

## Phase 4 — Mobile-First

**Status:** Pending Phase 1 (depends on new Table component)

**Views to convert:**
- Sidebar → bottom nav/drawer below `md`
- 24 `<table>` instances across 17 files → responsive Table component
- All form pages → sticky bottom action bar on mobile
- Safe-area insets for notched devices

**Known remaining gaps:** None identified yet (pending implementation)
