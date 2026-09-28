import type { Invoice, Payment, Plan, SubscriptionListItem } from "../../../_shared/contract/index.ts";
import { notFound, precondition } from "../errors.ts";
import { likePattern, pageWindow, type AnySql } from "../db.ts";
import { paginate, type H } from "./_util.ts";

const PLAN_COLUMNS = `
  id, name, price_monthly, price_yearly, max_users, max_patients,
  coalesce(features, '{}'::jsonb) as features, coalesce(is_active, true) as is_active
`;

const INVOICE_SELECT = `
  select i.id, i.clinic_id, c.name as clinic_name, i.number, i.period_start, i.period_end,
         i.amount_idr, i.tax_idr, i.status, i.due_date, i.paid_at, i.notes, i.created_at
  from platform.invoices i
  left join public.clinics c on c.id = i.clinic_id
`;

const PAYMENT_SELECT = `
  select p.id, p.invoice_id, i.number as invoice_number, p.clinic_id, c.name as clinic_name,
         p.provider, p.provider_ref, p.amount_idr, p.status, p.confirmed_by, p.paid_at, p.created_at
  from platform.payments p
  left join platform.invoices i on i.id = p.invoice_id
  left join public.clinics c on c.id = p.clinic_id
`;

async function loadInvoice(sql: AnySql, id: string, lock = false): Promise<Invoice> {
  const rows = lock
    ? await sql<Invoice[]>`${sql.unsafe(INVOICE_SELECT)} where i.id = ${id} for update of i`
    : await sql<Invoice[]>`${sql.unsafe(INVOICE_SELECT)} where i.id = ${id}`;
  if (!rows[0]) throw notFound("Invoice");
  return rows[0];
}

// ─── Paket ──────────────────────────────────────────────────────────────────

export const plansList: H<"billing.plans.list"> = async (ctx, p) => {
  return await ctx.sql<Plan[]>`
    select ${ctx.sql.unsafe(PLAN_COLUMNS)} from public.subscription_plans
    where ${p.includeInactive} or coalesce(is_active, true)
    order by price_monthly
  `;
};

export const plansUpdate: H<"billing.plans.update"> = async (ctx, p) => {
  const [before] = await ctx.sql<Plan[]>`
    select ${ctx.sql.unsafe(PLAN_COLUMNS)} from public.subscription_plans where id = ${p.planId} for update
  `;
  if (!before) throw notFound("Paket");
  const x = p.patch;
  if (Object.keys(x).length === 0) throw precondition("Tidak ada perubahan");

  await ctx.sql`
    update public.subscription_plans set
      price_monthly = coalesce(${x.price_monthly ?? null}::numeric, price_monthly),
      price_yearly  = coalesce(${x.price_yearly ?? null}::numeric, price_yearly),
      max_users     = coalesce(${x.max_users ?? null}::int, max_users),
      max_patients  = coalesce(${x.max_patients ?? null}::int, max_patients),
      features      = coalesce(${x.features ? ctx.sql.json(x.features) : null}::jsonb, features),
      is_active     = coalesce(${x.is_active ?? null}::boolean, is_active),
      updated_at    = now()
    where id = ${p.planId}
  `;

  const [after] = await ctx.sql<Plan[]>`
    select ${ctx.sql.unsafe(PLAN_COLUMNS)} from public.subscription_plans where id = ${p.planId}
  `;
  ctx.audit({ targetType: "plan", targetId: p.planId, reason: p.reason, before, after });
  return after;
};

// ─── Langganan ──────────────────────────────────────────────────────────────

export const subscriptionsList: H<"billing.subscriptions.list"> = async (ctx, p) => {
  const { limit, offset } = pageWindow(p);
  const q = likePattern(p.search);
  const rows = await ctx.sql<(SubscriptionListItem & { total_count: number })[]>`
    select cs.id, cs.status, cs.current_period_start, cs.current_period_end,
           coalesce(cs.cancel_at_period_end, false) as cancel_at_period_end,
           case when sp.id is null then null else json_build_object('id', sp.id, 'name', sp.name) end as plan,
           cs.clinic_id, c.name as clinic_name, c.status as clinic_status,
           case when cs.billing_cycle = 'yearly' then round(sp.price_yearly / 12.0) else sp.price_monthly end as price_monthly,
           count(*) over () as total_count
    from public.clinic_subscriptions cs
    join public.clinics c on c.id = cs.clinic_id
    left join public.subscription_plans sp on sp.id = cs.plan_id
    where (${p.status ?? null}::text is null or cs.status = ${p.status ?? null})
      and (${q}::text is null or c.name ilike ${q} or c.slug ilike ${q})
    order by cs.current_period_end asc
    limit ${limit} offset ${offset}
  `;
  return paginate(rows, p.page, p.pageSize);
};

// ─── Invoice ────────────────────────────────────────────────────────────────

export const invoicesList: H<"billing.invoices.list"> = async (ctx, p) => {
  const { limit, offset } = pageWindow(p);
  const q = likePattern(p.search);
  const rows = await ctx.sql<(Invoice & { total_count: number })[]>`
    select i.id, i.clinic_id, c.name as clinic_name, i.number, i.period_start, i.period_end,
           i.amount_idr, i.tax_idr, i.status, i.due_date, i.paid_at, i.notes, i.created_at,
           count(*) over () as total_count
    from platform.invoices i
    left join public.clinics c on c.id = i.clinic_id
    where (${p.clinicId ?? null}::uuid is null or i.clinic_id = ${p.clinicId ?? null}::uuid)
      and (${p.status ?? null}::text is null or i.status = ${p.status ?? null})
      and (${q}::text is null or i.number ilike ${q} or c.name ilike ${q})
    order by i.created_at desc
    limit ${limit} offset ${offset}
  `;
  return paginate(rows, p.page, p.pageSize);
};

export const invoicesCreate: H<"billing.invoices.create"> = async (ctx, p) => {
  const [{ id }] = await ctx.sql<{ id: string }[]>`
    select (platform.create_invoice(
      ${p.clinicId}::uuid, ${p.periodStart}::date, ${p.periodEnd}::date,
      ${p.amountIdr}::bigint, ${p.taxIdr}::bigint, ${p.dueDate}::date,
      ${p.notes ?? null}, ${ctx.operator.user_id}::uuid, 'console'
    )).id as id
  `;
  const invoice = await loadInvoice(ctx.sql, id);
  ctx.audit({ targetType: "invoice", targetId: id, clinicId: p.clinicId, after: invoice });
  return invoice;
};

export const invoicesVoid: H<"billing.invoices.void"> = async (ctx, p) => {
  const before = await loadInvoice(ctx.sql, p.invoiceId, true);
  if (!["open", "overdue"].includes(before.status)) {
    throw precondition(`Invoice berstatus ${before.status} tidak bisa dibatalkan`);
  }
  const [confirmed] = await ctx.sql<{ n: number }[]>`
    select count(*) as n from platform.payments where invoice_id = ${p.invoiceId} and status = 'confirmed'
  `;
  if (confirmed.n > 0) {
    throw precondition("Invoice sudah memiliki pembayaran terkonfirmasi; lakukan refund terlebih dahulu");
  }

  await ctx.sql`
    update platform.invoices
    set status = 'void', voided_at = now(), void_reason = ${p.reason}
    where id = ${p.invoiceId}
  `;
  const after = await loadInvoice(ctx.sql, p.invoiceId);
  ctx.audit({ targetType: "invoice", targetId: p.invoiceId, clinicId: before.clinic_id, reason: p.reason, before, after });
  return after;
};

// ─── Pembayaran ─────────────────────────────────────────────────────────────

export const paymentsList: H<"billing.payments.list"> = async (ctx, p) => {
  const { limit, offset } = pageWindow(p);
  const rows = await ctx.sql<(Payment & { total_count: number })[]>`
    select p.id, p.invoice_id, i.number as invoice_number, p.clinic_id, c.name as clinic_name,
           p.provider, p.provider_ref, p.amount_idr, p.status, p.confirmed_by, p.paid_at, p.created_at,
           count(*) over () as total_count
    from platform.payments p
    left join platform.invoices i on i.id = p.invoice_id
    left join public.clinics c on c.id = p.clinic_id
    where (${p.clinicId ?? null}::uuid is null or p.clinic_id = ${p.clinicId ?? null}::uuid)
      and (${p.invoiceId ?? null}::uuid is null or p.invoice_id = ${p.invoiceId ?? null}::uuid)
      and (${p.provider ?? null}::text is null or p.provider = ${p.provider ?? null})
    order by p.created_at desc
    limit ${limit} offset ${offset}
  `;
  return paginate(rows, p.page, p.pageSize);
};

export const paymentsConfirmManual: H<"billing.payments.confirmManual"> = async (ctx, p) => {
  const before = await loadInvoice(ctx.sql, p.invoiceId);

  const [res] = await ctx.sql<{ payment_id: string; invoice_status: string }[]>`
    select * from platform.confirm_manual_payment(
      ${p.invoiceId}::uuid, ${p.amountIdr}::bigint, ${p.paidAt}::timestamptz,
      ${p.reference}, ${p.notes ?? null}, ${ctx.operator.user_id}::uuid
    )
  `;

  const [payment] = await ctx.sql<Payment[]>`${ctx.sql.unsafe(PAYMENT_SELECT)} where p.id = ${res.payment_id}`;
  const invoice = await loadInvoice(ctx.sql, p.invoiceId);

  ctx.audit({
    targetType: "payment",
    targetId: payment.id,
    clinicId: invoice.clinic_id,
    before: { invoice_status: before.status },
    after: { payment, invoice_status: invoice.status },
  });
  return { payment, invoice };
};
