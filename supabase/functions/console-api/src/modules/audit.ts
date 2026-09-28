import type { AuditEntry } from "../../../_shared/contract/index.ts";
import { likePattern, pageWindow } from "../db.ts";
import { paginate, type H } from "./_util.ts";

export const list: H<"audit.list"> = async (ctx, p) => {
  const { limit, offset } = pageWindow(p);
  const actionLike = p.action ? likePattern(p.action) : null;
  const rows = await ctx.sql<(AuditEntry & { total_count: number })[]>`
    select a.id, a.operator_id, o.full_name as operator_name, a.action, a.target_type, a.target_id,
           a.clinic_id, c.name as clinic_name, a.reason, a.before, a.after, host(a.ip) as ip, a.created_at,
           count(*) over () as total_count
    from platform.audit_logs a
    left join platform.operators o on o.user_id = a.operator_id
    left join public.clinics c on c.id = a.clinic_id
    where (${p.operatorId ?? null}::uuid is null or a.operator_id = ${p.operatorId ?? null}::uuid)
      and (${p.clinicId ?? null}::uuid is null or a.clinic_id = ${p.clinicId ?? null}::uuid)
      and (${actionLike}::text is null or a.action ilike ${actionLike})
      and (${p.from ?? null}::date is null
           or a.created_at >= (${p.from ?? null}::date::timestamp at time zone 'Asia/Jakarta'))
      and (${p.to ?? null}::date is null
           or a.created_at < ((${p.to ?? null}::date + 1)::timestamp at time zone 'Asia/Jakarta'))
    order by a.created_at desc
    limit ${limit} offset ${offset}
  `;
  return paginate(rows, p.page, p.pageSize);
};
