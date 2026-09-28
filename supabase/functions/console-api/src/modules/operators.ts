import type { Operator } from "../../../_shared/contract/index.ts";
import { conflict, notFound, precondition } from "../errors.ts";
import type { H } from "./_util.ts";

const OPERATOR_COLUMNS = `o.user_id, au.email, o.full_name, o.role, o.is_active, o.last_login_at, o.created_at`;

export const me: H<"operators.me"> = async (ctx) => {
  // Catat waktu akses terakhir (maks. sekali per 10 menit agar tidak menulis di setiap klik).
  await ctx.sql`
    update platform.operators
    set last_login_at = now()
    where user_id = ${ctx.operator.user_id}
      and (last_login_at is null or last_login_at < now() - interval '10 minutes')
  `;
  const [row] = await ctx.sql<Operator[]>`
    select ${ctx.sql.unsafe(OPERATOR_COLUMNS)}
    from platform.operators o join auth.users au on au.id = o.user_id
    where o.user_id = ${ctx.operator.user_id}
  `;
  return row;
};

export const list: H<"operators.list"> = async (ctx) => {
  return await ctx.sql<Operator[]>`
    select ${ctx.sql.unsafe(OPERATOR_COLUMNS)}
    from platform.operators o join auth.users au on au.id = o.user_id
    order by o.is_active desc, o.role, o.full_name
  `;
};

export const invite: H<"operators.invite"> = async (ctx, p) => {
  const email = p.email.toLowerCase();

  const [existing] = await ctx.sql<{ id: string; is_clinic_user: boolean; is_operator: boolean }[]>`
    select au.id,
           exists (select 1 from public.users u where u.id = au.id) as is_clinic_user,
           exists (select 1 from platform.operators o where o.user_id = au.id) as is_operator
    from auth.users au
    where lower(au.email) = ${email}
  `;
  if (existing?.is_clinic_user) throw conflict("Email ini dipakai akun klinik. Operator wajib memakai email terpisah.");
  if (existing?.is_operator) throw conflict("Email ini sudah terdaftar sebagai operator.");

  let userId = existing?.id;
  if (!userId) {
    const created = await ctx.auth.createUser({
      email,
      fullName: p.fullName,
      appMetadata: { dentiva_operator: true },
    });
    userId = created.id;
    ctx.onRollback(() => ctx.auth.deleteUser(created.id));
  }

  await ctx.sql`
    insert into platform.operators (user_id, full_name, role, invited_by)
    values (${userId}, ${p.fullName}, ${p.role}, ${ctx.operator.user_id})
  `;

  const [row] = await ctx.sql<Operator[]>`
    select ${ctx.sql.unsafe(OPERATOR_COLUMNS)}
    from platform.operators o join auth.users au on au.id = o.user_id
    where o.user_id = ${userId}
  `;

  ctx.audit({ targetType: "operator", targetId: userId, after: row });
  ctx.afterCommit(() => ctx.auth.sendInvite(email, `${ctx.config.consoleUrl}/set-password`));
  return row;
};

export const update: H<"operators.update"> = async (ctx, p) => {
  if (p.role === undefined && p.isActive === undefined) {
    throw precondition("Tidak ada perubahan");
  }

  const [before] = await ctx.sql<Operator[]>`
    select ${ctx.sql.unsafe(OPERATOR_COLUMNS)}
    from platform.operators o join auth.users au on au.id = o.user_id
    where o.user_id = ${p.operatorId}
    for update of o
  `;
  if (!before) throw notFound("Operator");

  await ctx.sql`
    update platform.operators
    set role = coalesce(${p.role ?? null}, role),
        is_active = coalesce(${p.isActive ?? null}::boolean, is_active)
    where user_id = ${p.operatorId}
  `;

  if (p.isActive === false) {
    await ctx.sql`select platform.revoke_user_sessions(${p.operatorId}::uuid)`;
  }

  const [after] = await ctx.sql<Operator[]>`
    select ${ctx.sql.unsafe(OPERATOR_COLUMNS)}
    from platform.operators o join auth.users au on au.id = o.user_id
    where o.user_id = ${p.operatorId}
  `;

  ctx.audit({ targetType: "operator", targetId: p.operatorId, reason: p.reason, before, after });
  return after;
};
