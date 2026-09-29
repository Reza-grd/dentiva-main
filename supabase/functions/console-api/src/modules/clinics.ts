import type {
  Clinic,
  ClinicDetail,
  ClinicListItem,
  ClinicNote,
  ClinicUser,
  Invoice,
  Plan,
  SubscriptionRef,
  UsageDay,
} from "../../../_shared/contract/index.ts";
import { conflict, notFound, precondition } from "../errors.ts";
import { likePattern, pageWindow, type AnySql } from "../db.ts";
import { paginate, type H } from "./_util.ts";

const CLINIC_COLUMNS = `
  c.id, c.name, c.slug, c.status, c.owner_user_id, c.phone, c.email, c.address, c.city, c.province,
  c.created_at, c.updated_at, c.trial_ends_at, c.activated_at, c.suspended_at, c.suspended_reason
`;

async function loadClinic(sql: AnySql, clinicId: string, lock = false): Promise<Clinic> {
  const rows = lock
    ? await sql<Clinic[]>`select ${sql.unsafe(CLINIC_COLUMNS)} from public.clinics c where c.id = ${clinicId} for update`
    : await sql<Clinic[]>`select ${sql.unsafe(CLINIC_COLUMNS)} from public.clinics c where c.id = ${clinicId}`;
  if (!rows[0]) throw notFound("Klinik");
  return rows[0];
}

// ─── Baca ───────────────────────────────────────────────────────────────────

export const list: H<"clinics.list"> = async (ctx, p) => {
  const { limit, offset } = pageWindow(p);
  const q = likePattern(p.search);
  const rows = await ctx.sql<(ClinicListItem & { total_count: number })[]>`
    select
      o.id, o.name, o.slug, o.status, o.city, o.province, o.created_at, o.trial_ends_at,
      o.plan_name, o.subscription_status, o.users_count, o.patients_total, o.last_activity_at,
      count(*) over () as total_count
    from platform.clinic_overview o
    where (${p.status ?? null}::text is null or o.status = ${p.status ?? null})
      and (${q}::text is null
           or o.name ilike ${q} or o.slug ilike ${q} or o.city ilike ${q} or o.email ilike ${q})
    order by o.created_at desc
    limit ${limit} offset ${offset}
  `;
  return paginate(rows, p.page, p.pageSize);
};

export const get: H<"clinics.get"> = async (ctx, p) => {
  const clinic = await loadClinic(ctx.sql, p.clinicId);

  const [sub] = await ctx.sql<(SubscriptionRef & { plan_id: string | null })[]>`
    select cs.id, cs.status, cs.current_period_start, cs.current_period_end,
           coalesce(cs.cancel_at_period_end, false) as cancel_at_period_end,
           cs.plan_id,
           case when sp.id is null then null else json_build_object('id', sp.id, 'name', sp.name) end as plan
    from public.clinic_subscriptions cs
    left join public.subscription_plans sp on sp.id = cs.plan_id
    where cs.clinic_id = ${p.clinicId}
    order by (cs.status in ('trialing', 'active', 'past_due')) desc, cs.current_period_end desc
    limit 1
  `;

  const [plan] = sub?.plan_id
    ? await ctx.sql<Plan[]>`
        select id, name, price_monthly, price_yearly, max_users, max_patients,
               coalesce(features, '{}'::jsonb) as features, coalesce(is_active, true) as is_active
        from public.subscription_plans where id = ${sub.plan_id}`
    : [];

  const users = await ctx.sql<ClinicUser[]>`
    select u.id, u.clinic_id, ${clinic.name}::text as clinic_name, u.email, u.full_name, u.role, u.status,
           u.last_login_at, u.created_at
    from public.users u
    where u.clinic_id = ${p.clinicId}
    order by (u.role = 'admin') desc, u.full_name
  `;

  const [latestUsage] = await ctx.sql<UsageDay[]>`
    select date, patients_total, visits_count, active_users, storage_bytes, wa_sent, satusehat_errors
    from platform.usage_daily where clinic_id = ${p.clinicId}
    order by date desc limit 1
  `;

  const openInvoices = await ctx.sql<Invoice[]>`
    select i.id, i.clinic_id, ${clinic.name}::text as clinic_name, i.number, i.period_start, i.period_end,
           i.amount_idr, i.tax_idr, i.status, i.due_date, i.paid_at, i.notes, i.created_at
    from platform.invoices i
    where i.clinic_id = ${p.clinicId} and i.status in ('open', 'overdue')
    order by i.due_date
  `;

  let subscription: SubscriptionRef | null = null;
  if (sub) {
    const { plan_id: _planId, ...rest } = sub;
    subscription = rest;
  }

  const detail: ClinicDetail = {
    clinic,
    subscription,
    plan: plan ?? null,
    users,
    latestUsage: latestUsage ?? null,
    openInvoices,
  };
  return detail;
};

export const checkSlug: H<"clinics.checkSlug"> = async (ctx, p) => {
  const rows = await ctx.sql`select 1 from public.clinics where slug = ${p.slug.toLowerCase()} limit 1`;
  return { available: rows.length === 0 };
};

export const notesList: H<"clinics.notes.list"> = async (ctx, p) => {
  await loadClinic(ctx.sql, p.clinicId);
  return await ctx.sql<ClinicNote[]>`
    select n.id, n.clinic_id, n.operator_id, o.full_name as operator_name, n.body, n.created_at
    from platform.clinic_notes n
    left join platform.operators o on o.user_id = n.operator_id
    where n.clinic_id = ${p.clinicId}
    order by n.created_at desc
    limit 200
  `;
};

// ─── Tulis ──────────────────────────────────────────────────────────────────

export const create: H<"clinics.create"> = async (ctx, p) => {
  const email = p.owner.email.toLowerCase();
  const slug = p.clinic.slug.toLowerCase();

  const [slugTaken] = await ctx.sql`select 1 from public.clinics where slug = ${slug}`;
  if (slugTaken) throw conflict(`Slug "${slug}" sudah dipakai klinik lain`);

  const [existingAuth] = await ctx.sql<{ id: string }[]>`select id from auth.users where lower(email) = ${email}`;
  if (existingAuth) {
    throw conflict("Email pemilik sudah terdaftar. Gunakan email lain untuk akun pemilik klinik baru.");
  }

  // 1. Akun Auth pemilik (tanpa email dulu). Dihapus lagi jika transaksi gagal.
  const owner = await ctx.auth.createUser({ email, fullName: p.owner.fullName });
  ctx.onRollback(() => ctx.auth.deleteUser(owner.id));

  // 2. Klinik + langganan + profil pemilik + pengaturan awal, dalam transaksi yang sama.
  const [{ clinic_id: clinicId }] = await ctx.sql<{ clinic_id: string }[]>`
    select platform.provision_clinic(
      ${owner.id}::uuid, ${email}, ${p.owner.fullName}, ${p.owner.phone ?? null},
      ${p.clinic.name}, ${slug}, ${p.clinic.phone ?? null}, ${p.clinic.email ?? null},
      ${p.clinic.address ?? null}, ${p.clinic.city ?? null}, ${p.clinic.province ?? null},
      ${p.planId}::uuid, ${p.trialDays}::int, ${ctx.operator.user_id}::uuid
    ) as clinic_id
  `;

  const clinic = await loadClinic(ctx.sql, clinicId);
  ctx.audit({
    targetType: "clinic",
    targetId: clinicId,
    clinicId,
    after: { clinic, owner: { id: owner.id, email, full_name: p.owner.fullName }, planId: p.planId, trialDays: p.trialDays },
  });

  // 3. Undangan dikirim SETELAH commit, supaya tidak ada email untuk klinik yang batal dibuat.
  let inviteSent = false;
  ctx.afterCommit(async () => {
    await ctx.auth.sendInvite(email, `${ctx.config.clinicAppUrl}/atur-password`);
    inviteSent = true;
  });

  return {
    clinicId,
    ownerUserId: owner.id,
    get inviteSent() {
      return inviteSent;
    },
  };
};

export const update: H<"clinics.update"> = async (ctx, p) => {
  const before = await loadClinic(ctx.sql, p.clinicId, true);
  const patch = p.patch;
  if (Object.keys(patch).length === 0) throw precondition("Tidak ada perubahan");

  await ctx.sql`
    update public.clinics set
      name     = coalesce(${patch.name ?? null}, name),
      phone    = case when ${"phone" in patch} then ${patch.phone ?? null} else phone end,
      email    = case when ${"email" in patch} then ${patch.email ?? null} else email end,
      address  = case when ${"address" in patch} then ${patch.address ?? null} else address end,
      city     = case when ${"city" in patch} then ${patch.city ?? null} else city end,
      province = case when ${"province" in patch} then ${patch.province ?? null} else province end
    where id = ${p.clinicId}
  `;

  if (patch.name && patch.name !== before.name) {
    await ctx.sql`
      update public.clinic_settings set value = ${patch.name}
      where clinic_id = ${p.clinicId} and key = 'clinic_name'
    `;
  }

  const after = await loadClinic(ctx.sql, p.clinicId);
  ctx.audit({ targetType: "clinic", targetId: p.clinicId, clinicId: p.clinicId, before, after });
  return after;
};

/** Pendaftaran mandiri (register_clinic) → trial mulai saat disetujui. */
export const approve: H<"clinics.approve"> = async (ctx, p) => {
  const before = await loadClinic(ctx.sql, p.clinicId, true);
  if (before.status !== "pending") throw precondition(`Hanya klinik berstatus pending yang bisa disetujui (saat ini: ${before.status})`);

  await ctx.sql`
    update public.clinics
    set status = 'trial', trial_ends_at = now() + make_interval(days => ${p.trialDays}::int)
    where id = ${p.clinicId}
  `;
  await ctx.sql`
    update public.clinic_subscriptions cs
    set status = 'trialing', current_period_start = now(), current_period_end = c.trial_ends_at, updated_at = now()
    from public.clinics c
    where c.id = cs.clinic_id and cs.clinic_id = ${p.clinicId}
  `;

  const after = await loadClinic(ctx.sql, p.clinicId);
  ctx.audit({ targetType: "clinic", targetId: p.clinicId, clinicId: p.clinicId, reason: p.reason ?? null, before, after });
  return after;
};

export const activate: H<"clinics.activate"> = async (ctx, p) => {
  const before = await loadClinic(ctx.sql, p.clinicId, true);
  if (before.status === "active") throw precondition("Klinik sudah aktif");
  if (before.status === "closed") throw precondition("Klinik yang sudah ditutup tidak bisa diaktifkan kembali");

  await ctx.sql`update public.clinics set status = 'active' where id = ${p.clinicId}`;

  // Trial yang diaktifkan manual (mis. sudah bayar transfer) → langganan aktif 1 bulan.
  await ctx.sql`
    update public.clinic_subscriptions
    set status = 'active',
        current_period_start = now(),
        current_period_end = greatest(current_period_end, now() + interval '1 month'),
        updated_at = now()
    where clinic_id = ${p.clinicId} and status = 'trialing'
  `;

  const after = await loadClinic(ctx.sql, p.clinicId);
  ctx.audit({ targetType: "clinic", targetId: p.clinicId, clinicId: p.clinicId, reason: p.reason ?? null, before, after });
  return after;
};

export const suspend: H<"clinics.suspend"> = async (ctx, p) => {
  const before = await loadClinic(ctx.sql, p.clinicId, true);
  if (!["trial", "active", "pending"].includes(before.status)) {
    throw precondition(`Klinik berstatus ${before.status} tidak bisa ditangguhkan`);
  }

  await ctx.sql`
    update public.clinics set status = 'suspended', suspended_reason = ${p.reason}
    where id = ${p.clinicId}
  `;

  const after = await loadClinic(ctx.sql, p.clinicId);
  ctx.audit({ targetType: "clinic", targetId: p.clinicId, clinicId: p.clinicId, reason: p.reason, before, after });
  return after;
};

export const close: H<"clinics.close"> = async (ctx, p) => {
  const before = await loadClinic(ctx.sql, p.clinicId, true);
  if (before.status === "closed") throw precondition("Klinik sudah ditutup");
  if (p.confirmSlug !== before.slug) {
    throw precondition(`Ketik slug klinik (${before.slug}) untuk konfirmasi penutupan`);
  }

  await ctx.sql`update public.clinics set status = 'closed' where id = ${p.clinicId}`;
  await ctx.sql`
    update public.clinic_subscriptions
    set status = 'canceled', cancel_at_period_end = true, updated_at = now()
    where clinic_id = ${p.clinicId} and status in ('trialing', 'active', 'past_due')
  `;

  const after = await loadClinic(ctx.sql, p.clinicId);
  ctx.audit({ targetType: "clinic", targetId: p.clinicId, clinicId: p.clinicId, reason: p.reason, before, after });
  return after;
};

export const extendTrial: H<"clinics.extendTrial"> = async (ctx, p) => {
  const before = await loadClinic(ctx.sql, p.clinicId, true);
  if (before.status !== "trial") throw precondition("Hanya klinik berstatus trial yang bisa diperpanjang");

  await ctx.sql`
    update public.clinics
    set trial_ends_at = greatest(coalesce(trial_ends_at, now()), now()) + make_interval(days => ${p.days}::int)
    where id = ${p.clinicId}
  `;
  await ctx.sql`
    update public.clinic_subscriptions cs
    set current_period_end = c.trial_ends_at, updated_at = now()
    from public.clinics c
    where c.id = cs.clinic_id and cs.clinic_id = ${p.clinicId} and cs.status = 'trialing'
  `;

  const after = await loadClinic(ctx.sql, p.clinicId);
  ctx.audit({ targetType: "clinic", targetId: p.clinicId, clinicId: p.clinicId, reason: p.reason, before, after });
  return after;
};

export const changePlan: H<"clinics.changePlan"> = async (ctx, p) => {
  const clinic = await loadClinic(ctx.sql, p.clinicId, true);
  if (clinic.status === "closed") throw precondition("Klinik sudah ditutup");

  const [plan] = await ctx.sql<{ id: string; name: string }[]>`
    select id, name from public.subscription_plans where id = ${p.planId} and coalesce(is_active, true)
  `;
  if (!plan) throw notFound("Paket aktif");

  const [current] = await ctx.sql<{ id: string; plan_id: string; status: string }[]>`
    select id, plan_id, status from public.clinic_subscriptions
    where clinic_id = ${p.clinicId} and status in ('trialing', 'active', 'past_due')
    order by current_period_end desc limit 1
    for update
  `;

  let subscriptionId: string;
  if (current) {
    if (current.plan_id === p.planId) throw precondition("Klinik sudah memakai paket ini");
    await ctx.sql`
      update public.clinic_subscriptions set plan_id = ${p.planId}, updated_at = now() where id = ${current.id}
    `;
    subscriptionId = current.id;
  } else {
    const [row] = await ctx.sql<{ id: string }[]>`
      insert into public.clinic_subscriptions (clinic_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
      values (${p.clinicId}, ${p.planId},
              case when ${clinic.status} = 'trial' then 'trialing' else 'active' end,
              'monthly', now(), coalesce(${clinic.trial_ends_at}::timestamptz, now() + interval '1 month'))
      returning id
    `;
    subscriptionId = row.id;
  }

  ctx.audit({
    targetType: "subscription",
    targetId: subscriptionId,
    clinicId: p.clinicId,
    reason: p.reason,
    before: current ? { plan_id: current.plan_id } : null,
    after: { plan_id: plan.id, plan_name: plan.name },
  });
  return { subscriptionId };
};

export const notesAdd: H<"clinics.notes.add"> = async (ctx, p) => {
  await loadClinic(ctx.sql, p.clinicId);
  const [note] = await ctx.sql<ClinicNote[]>`
    with ins as (
      insert into platform.clinic_notes (clinic_id, operator_id, body)
      values (${p.clinicId}, ${ctx.operator.user_id}, ${p.body})
      returning *
    )
    select ins.id, ins.clinic_id, ins.operator_id, ${ctx.operator.full_name}::text as operator_name, ins.body, ins.created_at
    from ins
  `;
  ctx.audit({ targetType: "clinic_note", targetId: note.id, clinicId: p.clinicId, after: { length: p.body.length } });
  return note;
};
