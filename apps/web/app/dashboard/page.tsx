import { getDashboardData, getLinkBuilderConfig } from "../../lib/api";
import { LiveDashboard } from "./live-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const builderConfig = getLinkBuilderConfig();
  return <LiveDashboard initialData={data} builderConfig={builderConfig} />;
}
