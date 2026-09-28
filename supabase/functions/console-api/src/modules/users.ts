import type { ClinicUser } from "../../../_shared/contract/index.ts";
import { notFound, precondition } from "../errors.ts";
import { likePattern, pageWindow, type AnySql } from "../db.ts";
import { paginate, type H } from "./_util.ts";

async function loadUser(sql: AnySql, userId: string, lock = false): Promise<ClinicUser> {
  const rows = lock
    ? await sql<ClinicUser[]>`
        select u.id, u.clinic_id, c.name as clinic_name, u.email, u.full_name, u.role, u.status, u.last_login_at, u.created_at
        from public.users u left join public.clinics c on c.id = u.clinic_id
        where u.id = ${userId}
        for update of u`
    : await sql<ClinicUser[]>`
        select u.id, u.clinic_id, c.name as clinic_name, u.email, u.full_name, u.role, u.status, u.last_login_at, u.created_at
        from public.users u left join public.clinics c on c.id = u.clinic_id
        where u.id = ${userId}`;
  if (!rows[0]) throw notFound("User klinik");
  return rows[0];
}

export const list: H<"users.list"> = async (ctx, p) => {
  const { limit, offset } = pageWindow(p);
  const q = likePattern(p.search);
  const rows = await ctx.sql<(ClinicUser & { total_count: number })[]>`
    select u.id, u.clinic_id, c.name as clinic_name, u.email, u.full_name, u.role, u.status,
           u.last_login_at, u.created_at,
           count(*) over () as total_count
    from public.users u
    left join public.clinics c on c.id = u.clinic_id
    where (${p.clinicId ?? null}::uuid is null or u.clinic_id = ${p.clinicId ?? null}::uuid)
      and (${p.status ?? null}::text is null or u.status = ${p.status ?? null})
      and (${p.role ?? null}::text is null or u.role = ${p.role ?? null})
      and (${q}::text is null or u.full_name ilike ${q} or u.email ilike ${q} or c.name ilike ${q})
    order by u.created_at desc
    limit ${limit} offset ${offset}
  `;
  return paginate(rows, p.page, p.pageSize);
};

export const setStatus: H<"users.setStatus"> = async (ctx, p) => {
  const before = await loadUser(ctx.sql, p.userId, true);
  if (before.status === p.status) throw precondition(`User sudah berstatus ${p.status}`);

  await ctx.sql`update public.users set status = ${p.status} where id = ${p.userId}`;

  // Cabut sesi agar user langsung keluar di semua perangkat.
  let revokedSessions = 0;
  if (p.status !== "active") {
    const [r] = await ctx.sql<{ n: number }[]>`select platform.revoke_user_sessions(${p.userId}::uuid) as n`;
    revokedSessions = r?.n ?? 0;
  }

  const after = await loadUser(ctx.sql, p.userId);
  ctx.audit({
    targetType: "clinic_user",
    targetId: p.userId,
    clinicId: before.clinic_id,
    reason: p.reason,
    before: { status: before.status },
    after: { status: after.status, revokedSessions },
  });
  return after;
};

export const resendInvite: H<"users.resendInvite"> = async (ctx, p) => {
  const user = await loadUser(ctx.sql, p.userId);
  if (user.status !== "invited") {
    throw precondition("Undangan hanya bisa dikirim ulang untuk user berstatus 'Diundang'");
  }
  await ctx.auth.sendInvite(user.email, `${ctx.config.clinicAppUrl}/atur-password`);
  ctx.audit({ targetType: "clinic_user", targetId: p.userId, clinicId: user.clinic_id, after: { email: user.email } });
  return { sent: true as const };
};

export const sendPasswordReset: H<"users.sendPasswordReset"> = async (ctx, p) => {
  const user = await loadUser(ctx.sql, p.userId);
  if (!["active", "invited"].includes(user.status)) {
    throw precondition("Aktifkan user terlebih dahulu sebelum mengirim reset password");
  }
  await ctx.auth.sendPasswordReset(user.email, `${ctx.config.clinicAppUrl}/atur-password`);
  ctx.audit({ targetType: "clinic_user", targetId: p.userId, clinicId: user.clinic_id, reason: p.reason, after: { email: user.email } });
  return { sent: true as const };
};
