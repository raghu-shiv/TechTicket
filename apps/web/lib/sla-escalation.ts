import type { SlaEscalationType, TicketSlaEscalation } from "@/types/tickets";

export function getSlaEscalationLabel(type: SlaEscalationType): string {
  switch (type) {
    case "FIRST_RESPONSE_BREACH":
      return "First response escalation";

    case "RESOLUTION_BREACH":
      return "Resolution escalation";
  }
}

export function getSlaEscalationBreachLabel(type: SlaEscalationType): string {
  switch (type) {
    case "FIRST_RESPONSE_BREACH":
      return "First response SLA breached";

    case "RESOLUTION_BREACH":
      return "Resolution SLA breached";
  }
}

export function sortSlaEscalations(
  escalations: TicketSlaEscalation[],
): TicketSlaEscalation[] {
  return [...escalations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
