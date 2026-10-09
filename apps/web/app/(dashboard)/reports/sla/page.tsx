import { PageHeader } from "@/components/shared";
import { SlaDashboard } from "@/components/reports/SlaDashboard";

export default function SlaDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="SLA Dashboard"
        description="Monitor active, at-risk, and breached SLA tickets, compliance, and operational performance."
      />

      <SlaDashboard />
    </div>
  );
}
