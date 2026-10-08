import { PageHeader } from "@/components/shared";
import { SlaDashboard } from "@/components/reports/SlaDashboard";

export default function SlaTicketsPage() {
  return (
    <div>
      <PageHeader
        title="SLA Tickets"
        description="Monitor and investigate individual SLA tickets."
      />

      <SlaDashboard />
    </div>
  );
}
