import type { TicketActivityType } from "@/types/tickets";

export function getSlaBreachActivityLabel(type: TicketActivityType): string {
  switch (type) {
    case "SLA_FIRST_RESPONSE_BREACHED":
      return "First response SLA breached";

    case "SLA_RESOLUTION_BREACHED":
      return "Resolution SLA breached";

    default:
      return "SLA breach";
  }
}

export function getSlaBreachActivityActorName(
  actor: { name: string } | null,
): string {
  return actor?.name ?? "System";
}
