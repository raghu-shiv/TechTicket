import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { NAVIGATION_ITEMS } from "@/components/layout/navigation";

const webRoot = process.cwd();

function readWebFile(...parts: string[]): string {
  return readFileSync(path.join(webRoot, ...parts), "utf8");
}

function dashboardPageExists(...routeParts: string[]): boolean {
  return existsSync(
    path.join(webRoot, "app", "(dashboard)", ...routeParts, "page.tsx"),
  );
}

describe("UI-7 navigation and interaction consistency", () => {
  it("keeps every primary navigation link connected to an existing route", () => {
    for (const item of NAVIGATION_ITEMS) {
      const routeParts = item.href
        .replace(/^\//, "")
        .split("/")
        .filter(Boolean);

      expect(
        existsSync(
          path.join(webRoot, "app", "(dashboard)", ...routeParts, "page.tsx"),
        ),
        `${item.label} points to missing route ${item.href}`,
      ).toBe(true);
    }
  });

  it("uses Ticket Library as the canonical operational library label", () => {
    const library = readWebFile(
      "app",
      "(dashboard)",
      "ticket-library",
      "page.tsx",
    );
    const navigation = readWebFile("components", "layout", "navigation.ts");
    const sidebar = readWebFile("components", "layout", "sidebar.tsx");
    const mobile = readWebFile("components", "layout", "mobile-nav.tsx");
    const commandMenu = readWebFile("components", "shared", "command-menu.tsx");

    expect(NAVIGATION_ITEMS).toContainEqual(
      expect.objectContaining({
        label: "Ticket Library",
        href: "/ticket-library",
      }),
    );

    expect(navigation).toContain('"Ticket Library"');
    expect(sidebar).toContain("NAVIGATION_ITEMS");
    expect(mobile).toContain("NAVIGATION_ITEMS");
    expect(library).toContain('title="Ticket Library"');
    expect(commandMenu).toContain("Ticket Library");

    expect(
      NAVIGATION_ITEMS.some(
        (item) =>
          item.label === "Tasks" ||
          item.href === "/tasks" ||
          item.href === "/case-library",
      ),
    ).toBe(false);

    // The analytics report remains a separate supported destination.
    expect(dashboardPageExists("reports", "ticket-library")).toBe(true);
  });

  it("keeps all top-bar actions wired to their supported behaviors", () => {
    const topbar = readWebFile("components", "layout", "topbar.tsx");

    expect(topbar).toContain("onClick={openMobileSidebar}");
    expect(topbar).toContain("onClick={openCommandMenu}");
    expect(topbar).toContain('href="/settings"');
    expect(topbar).toContain("<NotificationBell");
    expect(topbar).toContain("<UserMenu");
    expect(topbar).toContain("aria-expanded={isMobileSidebarOpen}");
  });

  it("provides an accessible mobile navigation drawer", () => {
    const mobile = readWebFile("components", "layout", "mobile-nav.tsx");

    expect(mobile).toContain('role="dialog"');
    expect(mobile).toContain('aria-modal="true"');
    expect(mobile).toContain('id="mobile-navigation"');
    expect(mobile).toContain('event.key === "Escape"');
    expect(mobile).toContain("previouslyFocused.focus()");
    expect(mobile).toContain('event.key !== "Tab"');
    expect(mobile).toContain('aria-current={isActive ? "page" : undefined}');
  });

  it("keeps the desktop sidebar free of a nonfunctional collapse control", () => {
    const sidebar = readWebFile("components", "layout", "sidebar.tsx");

    expect(sidebar).not.toMatch(
      /Collapse sidebar|Expand sidebar|Toggle sidebar/i,
    );
  });

  it("exposes the supported ticket-detail workflows", () => {
    const detailPage = readWebFile(
      "app",
      "(dashboard)",
      "tickets",
      "[id]",
      "page.tsx",
    );
    const workflow = readWebFile(
      "components",
      "tickets",
      "TicketWorkflowPanel.tsx",
    );
    const attachments = readWebFile(
      "components",
      "tickets",
      "TicketAttachmentsPanel.tsx",
    );
    const relations = readWebFile(
      "components",
      "tickets",
      "TicketRelationsPanel.tsx",
    );
    const relationHook = readWebFile("hooks", "use-ticket-relations.ts");

    const ticketApi = readWebFile("lib", "api", "tickets.ts");
    const sla = readWebFile("components", "tickets", "TicketSlaPanel.tsx");
    const breachHistory = readWebFile(
      "components",
      "tickets",
      "SlaBreachHistory.tsx",
    );

    expect(detailPage).toContain("<TicketWorkflowPanel");
    expect(detailPage).toContain("<TicketRelationsPanel");
    expect(detailPage).toContain("<TicketAttachmentsPanel");
    expect(detailPage).toContain("<TicketSlaPanel");
    expect(detailPage).toContain("<SlaBreachHistory");

    expect(workflow).toContain("createTicketComment");
    expect(workflow).toContain("updateTicketAssignment");
    expect(workflow).toContain("updateTicketStatus");
    expect(workflow).toContain("requestTicketApproval");
    expect(workflow).toContain("useTicketActivity");
    expect(workflow).toContain("activityQuery.data.meta.totalPages");

    expect(attachments).toContain("uploadTicketAttachment");
    expect(attachments).toContain("downloadTicketAttachment");
    expect(attachments).toContain("deleteTicketAttachment");

    // The component uses the query hook and mutation API methods.
    expect(relations).toContain("useTicketRelations");
    expect(relations).toContain("createTicketRelation");
    expect(relations).toContain("deleteTicketRelation");

    // The hook delegates relationship loading to the API client.
    expect(relationHook).toContain("getTicketRelations");

    // All three relationship operations exist in the shared API client.
    expect(ticketApi).toContain("export async function getTicketRelations");
    expect(ticketApi).toContain("export async function createTicketRelation");
    expect(ticketApi).toContain("export async function deleteTicketRelation");

    expect(sla).toContain("Service Level Agreement");
    expect(breachHistory).toContain("SLA breach history");
  });

  it("uses shared compact feedback states for embedded workflow panels", () => {
    const workflow = readWebFile(
      "components",
      "tickets",
      "TicketWorkflowPanel.tsx",
    );
    const attachments = readWebFile(
      "components",
      "tickets",
      "TicketAttachmentsPanel.tsx",
    );
    const relations = readWebFile(
      "components",
      "tickets",
      "TicketRelationsPanel.tsx",
    );

    for (const source of [workflow, attachments, relations]) {
      expect(source).toContain("LoadingState");
      expect(source).toContain("ErrorState");
      expect(source).toContain("EmptyState");
      expect(source).toContain('role="status"');
    }
  });
});
