import { PageHeader } from "@/components/shared";
import { EmployeeDashboard } from "@/components/reports/EmployeeDashboard";

export default function EmployeeDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Dashboard"
        description="Review agent workload, response and resolution performance, SLA compliance, reopen activity, and authorized team comparisons."
      />
      <EmployeeDashboard />
    </div>
  );
}
