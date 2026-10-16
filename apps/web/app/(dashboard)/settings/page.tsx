import Link from "next/link";
import {
  Bell,
  Building2,
  ChevronRight,
  Package,
  ShieldCheck,
  Users,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Badge } from "@/components/ui/badge";

interface WorkingSetting {
  href: string;
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
}

interface PlannedSetting {
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
}

const workingSettings: WorkingSetting[] = [
  {
    href: "/settings/sla-policies",
    title: "SLA Policies",
    description: "Configure and review service-level targets.",
    detail:
      "Review first-response and resolution targets by ticket priority. Only organization owners and admins can change policies.",
    icon: ShieldCheck,
  },
  {
    href: "/users",
    title: "Users & Memberships",
    description: "Manage organization membership and roles.",
    detail:
      "Owners and admins can add existing accounts, change eligible membership roles, and remove members. The API enforces these restrictions.",
    icon: Users,
  },
  {
    href: "/products",
    title: "Products",
    description: "Manage the organization's product catalog.",
    detail:
      "View products associated with tickets. Owners and admins can create, update, deactivate, and delete eligible products.",
    icon: Package,
  },
  {
    href: "/profile",
    title: "Your Profile",
    description: "Manage your personal account details.",
    detail:
      "Update your display name and profile-image URL. Your email address and verification status are shown separately.",
    icon: UserRound,
  },
];

const plannedSettings: PlannedSetting[] = [
  {
    title: "Organization Profile",
    description: "Organization identity and workspace details.",
    detail:
      "Organization name, slug, description, and logo are present in the data model, but an organization-profile update API and editing page are not available yet.",
    icon: Building2,
  },
  {
    title: "Team Management",
    description: "Configure teams and team membership.",
    detail:
      "Team-related models exist, but a dedicated team-management page and supporting management APIs have not been implemented.",
    icon: Users,
  },
  {
    title: "Notification Preferences",
    description: "Choose which notifications you receive.",
    detail:
      "The notification inbox is implemented, but persistent per-user notification preferences and their settings API are not available yet.",
    icon: Bell,
  },
];

function WorkingSettingCard({ setting }: { setting: WorkingSetting }) {
  const Icon = setting.icon;

  return (
    <Link href={setting.href} className="group block rounded-xl">
      <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-muted/20 group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <CardTitle>{setting.title}</CardTitle>
                <CardDescription className="mt-1">
                  {setting.description}
                </CardDescription>
              </div>
            </div>

            <ChevronRight
              className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{setting.detail}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function PlannedSettingCard({ setting }: { setting: PlannedSetting }) {
  const Icon = setting.icon;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-5" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <CardTitle>{setting.title}</CardTitle>
              <CardDescription className="mt-1">
                {setting.description}
              </CardDescription>
            </div>
          </div>

          <Badge variant="secondary">Planned</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">{setting.detail}</p>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage workspace configuration and your personal account."
      />

      <section className="space-y-4" aria-labelledby="working-settings-heading">
        <div>
          <h2 id="working-settings-heading" className="text-base font-semibold">
            Available settings
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a working page to view or manage the supported configuration.
            Administrative changes are authorized by the API.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {workingSettings.map((setting) => (
            <WorkingSettingCard key={setting.href} setting={setting} />
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="planned-settings-heading">
        <div>
          <h2 id="planned-settings-heading" className="text-base font-semibold">
            Planned configuration
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These capabilities need their supporting pages and APIs before they
            can be configured here.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plannedSettings.map((setting) => (
            <PlannedSettingCard key={setting.title} setting={setting} />
          ))}
        </div>
      </section>
    </div>
  );
}
