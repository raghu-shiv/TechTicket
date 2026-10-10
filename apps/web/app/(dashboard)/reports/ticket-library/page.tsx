import { PageHeader } from "@/components/shared";
import { TicketLibraryReport } from "@/components/reports/TicketLibraryReport";

export default function TicketLibraryReportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ticket Library Reports"
        description="Explore tickets by status, priority, team, employee, date, unassigned state, and saved-filter criteria. Open any count to view its matching tickets."
      />
      <TicketLibraryReport />
    </div>
  );
}
