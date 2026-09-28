import type { UsageDay, UsageOverviewItem } from "../../../_shared/contract/index.ts";
import { likePattern, pageWindow } from "../db.ts";
import { paginate, type H } from "./_util.ts";

export const clinic: H<"usage.clinic"> = async (ctx, p) => {
  return await ctx.sql<UsageDay[]>`
    select date, patients_total, visits_count, active_users, storage_bytes, wa_sent, satusehat_errors
    from platform.usage_daily
    where clinic_id = ${p.clinicId}
      and date > (now() at time zone 'Asia/Jakarta')::date - ${p.days}::int
    order by date
  `;
};

export const overview: H<"usage.overview"> = async (ctx, p) => {
  const { limit, offset } = pageWindow(p);
  const q = likePattern(p.search);
  const rows = await ctx.sql<(UsageOverviewItem & { total_count: number })[]>`
    select
      o.id as clinic_id, o.name as clinic_name, o.status as clinic_status, o.plan_name,
      o.max_patients, o.max_users,
      case when o.usage_date is null then null else json_build_object(
        'date', o.usage_date, 'patients_total', o.patients_total, 'visits_count', o.visits_count,
        'active_users', o.active_users, 'storage_bytes', o.storage_bytes, 'wa_sent', o.wa_sent,
        'satusehat_errors', o.satusehat_errors
      ) end as latest,
      count(*) over () as total_count
    from platform.clinic_overview o
    where o.status in ('trial', 'active', 'suspended')
      and (${q}::text is null or o.name ilike ${q} or o.slug ilike ${q})
    order by
      case when o.max_patients > 0 then o.patients_total::numeric / o.max_patients else 0 end desc,
      o.name
    limit ${limit} offset ${offset}
  `;
  return paginate(rows, p.page, p.pageSize);
};
