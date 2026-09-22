import { Badge } from "@/components/ui/badge";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "pending"
  | "resolved"
  | "closed"
  | "cancelled";

const statusConfig: Record<
  TicketStatus,
  {
    label: string;
    variant:
      | "default"
      | "secondary"
      | "success"
      | "warning"
      | "danger"
      | "info"
      | "outline";
  }
> = {
  open: {
    label: "Open",
    variant: "info",
  },
  in_progress: {
    label: "In Progress",
    variant: "warning",
  },
  pending: {
    label: "Pending",
    variant: "secondary",
  },
  resolved: {
    label: "Resolved",
    variant: "success",
  },
  closed: {
    label: "Closed",
    variant: "outline",
  },
  cancelled: {
    label: "Cancelled",
    variant: "danger",
  },
};

interface StatusBadgeProps {
  status: TicketStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
