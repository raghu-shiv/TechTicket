import Link from "next/link";
import { ShieldCheck, ChevronRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { PageHeader } from "@/components/shared";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage workspace configuration."
      />

      <div className="grid gap-4">
        <Link href="/settings/sla-policies" className="group">
          <Card className="transition-colors group-hover:border-primary/40 group-hover:bg-muted/20">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="size-5" />
                  </div>

                  <div>
                    <CardTitle>SLA Policies</CardTitle>

                    <CardDescription className="mt-1">
                      Configure and review service-level targets for ticket
                      priorities.
                    </CardDescription>
                  </div>
                </div>

                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Review active and inactive policies and their priority targets.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
