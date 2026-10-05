import { PageHeader } from "@/components/shared";
import { SlaDashboard } from "@/components/reports/SlaDashboard";

export default function SlaDashboardPage() {
  return (
    <div>
      <PageHeader
        title="SLA Dashboard"
        description="Monitor first-response and resolution SLA performance."
      />

      <SlaDashboard />
    </div>
  );
}
