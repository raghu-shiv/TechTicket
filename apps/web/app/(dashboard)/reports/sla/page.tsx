import { PageHeader } from "@/components/shared";
import { SlaReport } from "@/components/reports/SlaReport";

export default function SlaReportPage() {
  return (
    <div>
      <PageHeader
        title="SLA Reports"
        description="Analyze SLA compliance, breaches, at-risk tickets, and performance."
      />

      <SlaReport />
    </div>
  );
}
