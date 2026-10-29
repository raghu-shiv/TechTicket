import { PageHeader } from "@/components/shared";
import { UsageReport } from "@/components/reports/UsageReport";

export default function UsageReportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Usage Reports"
        description="Measure recorded ticket, activity, comment, attachment, and approval usage across your organization."
        className="mb-0"
      />
      <UsageReport />
    </div>
  );
}
