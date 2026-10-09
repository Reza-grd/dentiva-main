import type { ClinicHealthReport } from "../../../_shared/contract/index.ts";
import type { H } from "./_util.ts";

export const clinicHealth: H<"insights.clinicHealth"> = async (ctx, p) => {
  const [row] = await ctx.sql<{ report: ClinicHealthReport }[]>`
    select platform.clinic_health(${p.limit}::int) as report
  `;
  return row.report;
};
