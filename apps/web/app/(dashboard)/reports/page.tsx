import { BarChart3, ChevronRight, Clock3, TicketCheck } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui";
import { PageHeader } from "@/components/shared";

const reports = [
  {
    title: "SLA Dashboard",
    description:
      "Monitor SLA performance, active and at-risk tickets, breaches, compliance, and resolution performance.",
    icon: Clock3,
    href: "/reports/sla",
    status: "Available",
  },
  {
    title: "Ticket Performance",
    description:
      "Analyze ticket volume, status distribution, priorities, and operational trends.",
    icon: BarChart3,
    href: "#",
    status: "Coming soon",
  },
  {
    title: "Resolution Performance",
    description:
      "Review resolution trends and identify patterns across teams and ticket priorities.",
    icon: TicketCheck,
    href: "#",
    status: "Coming soon",
  },
];

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Analyze your support operations and service performance."
      />

      <section
        aria-label="Available reports"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {reports.map((report) => {
          const Icon = report.icon;
          const available = report.status === "Available";

          const content = (
            <Card
              className={
                available
                  ? "h-full transition-colors hover:border-primary/40"
                  : "h-full opacity-70"
              }
            >
              <CardContent className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>

                  <span
                    className={
                      available
                        ? "rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                        : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {report.status}
                  </span>
                </div>

                <div className="mt-5 flex-1">
                  <h2 className="text-base font-semibold">{report.title}</h2>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {report.description}
                  </p>
                </div>

                {available && (
                  <div className="mt-6 flex items-center text-sm font-medium text-primary">
                    View report
                    <ChevronRight className="ml-1 size-4" />
                  </div>
                )}
              </CardContent>
            </Card>
          );

          if (!available) {
            return (
              <div key={report.title} aria-disabled="true">
                {content}
              </div>
            );
          }

          return (
            <Link
              key={report.title}
              href={report.href}
              className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {content}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
