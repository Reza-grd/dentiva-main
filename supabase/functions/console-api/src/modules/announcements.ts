import type { Announcement } from "../../../_shared/contract/index.ts";
import { notFound, precondition } from "../errors.ts";
import type { AnySql } from "../db.ts";
import type { H } from "./_util.ts";

const COLUMNS = `id, title, body, severity, audience, starts_at, ends_at, created_at`;

async function load(sql: AnySql, id: string): Promise<Announcement> {
  const [row] = await sql<Announcement[]>`
    select ${sql.unsafe(COLUMNS)} from platform.announcements where id = ${id}
  `;
  if (!row) throw notFound("Pengumuman");
  return row;
}

export const list: H<"announcements.list"> = async (ctx, p) => {
  return await ctx.sql<Announcement[]>`
    select ${ctx.sql.unsafe(COLUMNS)} from platform.announcements
    where ${p.includeExpired} or ends_at is null or ends_at > now()
    order by starts_at desc
    limit 100
  `;
};

export const upsert: H<"announcements.upsert"> = async (ctx, p) => {
  if (p.id) {
    const before = await load(ctx.sql, p.id);
    await ctx.sql`
      update platform.announcements set
        title = ${p.title}, body = ${p.body}, severity = ${p.severity}, audience = ${p.audience},
        starts_at = ${p.startsAt}::timestamptz, ends_at = ${p.endsAt ?? null}::timestamptz
      where id = ${p.id}
    `;
    const after = await load(ctx.sql, p.id);
    ctx.audit({ action: "announcements.update", targetType: "announcement", targetId: p.id, before, after });
    return after;
  }

  const [{ id }] = await ctx.sql<{ id: string }[]>`
    insert into platform.announcements (title, body, severity, audience, starts_at, ends_at, created_by)
    values (${p.title}, ${p.body}, ${p.severity}, ${p.audience},
            ${p.startsAt}::timestamptz, ${p.endsAt ?? null}::timestamptz, ${ctx.operator.user_id})
    returning id
  `;
  const after = await load(ctx.sql, id);
  ctx.audit({ action: "announcements.create", targetType: "announcement", targetId: id, after });
  return after;
};

export const end: H<"announcements.end"> = async (ctx, p) => {
  const before = await load(ctx.sql, p.id);
  if (before.ends_at && new Date(before.ends_at) <= new Date()) {
    throw precondition("Pengumuman sudah berakhir");
  }
  await ctx.sql`
    update platform.announcements
    set ends_at = greatest(now(), starts_at + interval '1 second')
    where id = ${p.id}
  `;
  const after = await load(ctx.sql, p.id);
  ctx.audit({ targetType: "announcement", targetId: p.id, before, after });
  return after;
};
