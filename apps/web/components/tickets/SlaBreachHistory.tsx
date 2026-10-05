"use client";

import {
  AlertTriangle,
  Clock3,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { useTicketActivity } from "@/hooks/use-ticket-activity";
import {
  getSlaBreachActivityActorName,
  getSlaBreachActivityLabel,
} from "@/lib/sla-history";

interface SlaBreachHistoryProps {
  organizationId: string;
  ticketId: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getBreachIcon(type: string) {
  switch (type) {
    case "SLA_FIRST_RESPONSE_BREACHED":
      return Clock3;

    case "SLA_RESOLUTION_BREACHED":
      return XCircle;

    default:
      return AlertTriangle;
  }
}

export function SlaBreachHistory({
  organizationId,
  ticketId,
}: SlaBreachHistoryProps) {
  const activityQuery = useTicketActivity(organizationId, ticketId, {
    category: "SLA",
    limit: 100,
  });

  if (activityQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading SLA breach history...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activityQuery.isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <h2 className="text-sm font-medium">SLA breach history</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {activityQuery.error instanceof Error
                  ? activityQuery.error.message
                  : "Unable to load SLA breach history."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activities = activityQuery.data?.data ?? [];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold">SLA breach history</h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Recorded SLA breach events for this ticket.
          </p>
        </div>

        {activities.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No SLA breaches have been recorded.
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getBreachIcon(activity.type);

              return (
                <div
                  key={activity.id}
                  className="flex gap-3 rounded-md border p-4"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <Icon className="size-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">
                        {getSlaBreachActivityLabel(activity.type)}
                      </p>

                      <Badge variant="danger">SLA breach</Badge>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(activity.createdAt)}
                    </p>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {activity.description}
                    </p>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Recorded by{" "}
                      <span className="font-medium text-foreground">
                        {getSlaBreachActivityActorName(activity.actor)}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
