import {
  BarChart3,
  ChevronRight,
  Clock3,
  ListFilter,
  ShieldAlert,
  TicketCheck,
  Timer,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AnalyticsDashboard } from "@/components/reports/AnalyticsDashboard";
import { ProductDashboard } from "@/components/reports/ProductDashboard";
import { Card, CardContent } from "@/components/ui";

const reports = [
  {
    title: "SLA Dashboard",
    description:
      "Monitor active, at-risk, and breached SLA tickets, compliance, and operational performance.",
    icon: Clock3,
    href: "/reports/sla",
    status: "Available",
  },
  {
    title: "SLA Reports",
    description:
      "Analyze SLA trends, compliance, breach rates, at-risk tickets, and performance by priority, team, and assignee.",
    icon: ShieldAlert,
    href: "/reports/sla-reports",
    status: "Available",
  },
  {
    title: "TAT Reports",
    description:
      "Analyze actual first-response and resolution times, percentiles, trends, and performance by priority, team, assignee, and product.",
    icon: Timer,
    href: "/reports/tat",
    status: "Available",
  },
  {
    title: "Ticket Library Reports",
    description:
      "Explore tickets by status, priority, team, employee, date, unassigned state, and saved-filter criteria. Drill down into matching Ticket Library results.",
    icon: ListFilter,
    href: "/reports/ticket-library",
    status: "Available",
  },
  {
    title: "Employee Dashboard",
    description:
      "Review agent workload distribution, response and resolution performance, SLA compliance, reopen activity, and authorized team comparisons.",
    icon: Users,
    href: "/reports/employees",
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
    <div className="space-y-12">
      <section aria-labelledby="overall-analytics">
        <div className="mb-6">
          <h2 id="overall-analytics" className="text-xl font-semibold">
            Overall Analytics
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Organization-wide ticket and service performance.
          </p>
        </div>
        <AnalyticsDashboard />
      </section>

      <section aria-labelledby="product-analytics">
        <div className="mb-6">
          <h2 id="product-analytics" className="text-xl font-semibold">
            Product Analytics
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare support performance across products.
          </p>
        </div>
        <ProductDashboard />
      </section>

      <section aria-label="Available reports" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Additional Reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore specialized reports and operational views.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        </div>
      </section>
    </div>
  );
}
