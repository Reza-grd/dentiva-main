import { CHURN_RISK_INACTIVE_DAYS, type DashboardSummary } from "../../../_shared/contract/index.ts";
import type { H } from "./_util.ts";

export const summary: H<"dashboard.summary"> = async (ctx) => {
  const [row] = await ctx.sql<{ summary: DashboardSummary }[]>`
    select platform.dashboard_summary(${CHURN_RISK_INACTIVE_DAYS}) as summary
  `;
  return row.summary;
};
