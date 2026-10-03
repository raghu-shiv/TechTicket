import { PageHeader } from "@/components/shared";
import { SlaPolicyList } from "@/components/settings/SlaPolicyList";

export default function SlaPoliciesPage() {
  return (
    <div>
      <PageHeader
        title="SLA Policies"
        description="View the service-level policies configured for your workspace."
      />

      <SlaPolicyList />
    </div>
  );
}
