import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { NAVIGATION_ITEMS } from "@/components/layout/navigation";

describe("primary navigation route coverage", () => {
  it("links only to existing dashboard route page files", () => {
    for (const item of NAVIGATION_ITEMS) {
      const routeParts = item.href
        .replace(/^\//, "")
        .split("/")
        .filter(Boolean);
      const pageFile = path.join(
        process.cwd(),
        "app",
        "(dashboard)",
        ...routeParts,
        "page.tsx",
      );
      expect(
        existsSync(pageFile),
        `${item.label} points to missing route ${item.href}`,
      ).toBe(true);
    }
  });

  it("uses the canonical Ticket Library label and never reintroduces Tasks", () => {
    expect(
      NAVIGATION_ITEMS.some(
        (item) =>
          item.href === "/ticket-library" && item.label === "Ticket Library",
      ),
    ).toBe(true);
    expect(
      NAVIGATION_ITEMS.some(
        (item) =>
          item.href === "/case-library" ||
          item.href === "/tasks" ||
          item.label === "Tasks",
      ),
    ).toBe(false);
  });

  it("keeps the knowledge library separate from the analytics report route", () => {
    expect(
      existsSync(
        path.join(
          process.cwd(),
          "app",
          "(dashboard)",
          "ticket-library",
          "page.tsx",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        path.join(
          process.cwd(),
          "app",
          "(dashboard)",
          "reports",
          "ticket-library",
          "page.tsx",
        ),
      ),
    ).toBe(true);
  });

  it("uses the same navigation definition on desktop and mobile", () => {
    const sidebar = readFileSync(
      path.join(process.cwd(), "components/layout/sidebar.tsx"),
      "utf8",
    );
    const mobile = readFileSync(
      path.join(process.cwd(), "components/layout/mobile-nav.tsx"),
      "utf8",
    );
    expect(sidebar).toContain("NAVIGATION_ITEMS");
    expect(mobile).toContain("NAVIGATION_ITEMS");
  });
});
