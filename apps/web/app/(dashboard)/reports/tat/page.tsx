import { PageHeader } from "@/components/shared";
import { TatReport } from "@/components/reports/TatReport";

export default function TatReportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="TAT Reports"
        description="Analyze actual elapsed time to first response and resolution, independently of SLA targets and compliance."
      />
      <TatReport />
    </div>
  );
}
