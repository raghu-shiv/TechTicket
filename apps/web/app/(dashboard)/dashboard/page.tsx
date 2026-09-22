import { AlertTriangle, CheckCircle2, Clock3, Ticket } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

import { PageHeader, StatCard } from "@/components/shared";

const stats = [
  {
    title: "Open Tickets",
    value: "128",
    description: "Currently requiring attention",
    icon: Ticket,
    trend: {
      value: "+12.5% this week",
      positive: false,
    },
  },
  {
    title: "In Progress",
    value: "64",
    description: "Being actively worked on",
    icon: Clock3,
    trend: {
      value: "+4.2% this week",
      positive: false,
    },
  },
  {
    title: "Resolved",
    value: "342",
    description: "Successfully resolved",
    icon: CheckCircle2,
    trend: {
      value: "+18.7% this week",
      positive: true,
    },
  },
  {
    title: "SLA Breaches",
    value: "7",
    description: "Require immediate attention",
    icon: AlertTriangle,
    trend: {
      value: "-23.4% this week",
      positive: true,
    },
  },
];

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your support operations."
      />

      <section
        aria-label="Ticket statistics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Trends</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex h-72 items-center justify-center rounded-lg bg-muted/40">
              <p className="text-sm text-muted-foreground">
                Analytics chart will be connected to live data.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {[
                ["Critical", 12],
                ["High", 34],
                ["Medium", 56],
                ["Low", 26],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>

                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
