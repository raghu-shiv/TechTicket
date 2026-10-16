import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = process.cwd();

function readWebFile(...parts: string[]): string {
  return readFileSync(path.join(webRoot, ...parts), "utf8");
}

function dashboardPageExists(...routeParts: string[]): boolean {
  return existsSync(
    path.join(webRoot, "app", "(dashboard)", ...routeParts, "page.tsx"),
  );
}

describe("UI-6 Settings and Profile", () => {
  it("keeps the topbar Settings action linked to /settings", () => {
    const topbar = readWebFile("components", "layout", "topbar.tsx");

    expect(topbar).toContain('href="/settings"');
    expect(topbar).toContain('aria-label="Settings"');
    expect(topbar).toContain("<Settings");
  });

  it("provides Settings, SLA Policies, and Profile routes", () => {
    expect(dashboardPageExists("settings")).toBe(true);
    expect(dashboardPageExists("settings", "sla-policies")).toBe(true);
    expect(dashboardPageExists("profile")).toBe(true);
  });

  it("links Settings only to working configuration pages", () => {
    const settings = readWebFile("app", "(dashboard)", "settings", "page.tsx");

    expect(settings).toContain('href: "/settings/sla-policies"');
    expect(settings).toContain('href: "/users"');
    expect(settings).toContain('href: "/products"');
    expect(settings).toContain('href: "/profile"');

    expect(settings).toContain("Planned");
    expect(settings).toContain("Organization Profile");
    expect(settings).toContain("Team Management");
    expect(settings).toContain("Notification Preferences");

    // Unsupported configuration is informational, not an empty route link.
    expect(settings).not.toContain('href: "/teams"');
    expect(settings).not.toContain('href: "/settings/organization"');
    expect(settings).not.toContain('href: "/settings/notifications"');
  });

  it("provides a Profile link in the account menu", () => {
    const userMenu = readWebFile("components", "shared", "user-menu.tsx");

    expect(userMenu).toContain('href="/profile"');
    expect(userMenu).toContain("Profile");
  });

  it("updates the signed-in user's profile through Better Auth", () => {
    const profilePage = readWebFile(
      "app",
      "(dashboard)",
      "profile",
      "page.tsx",
    );

    expect(profilePage).toContain("useSession()");
    expect(profilePage).toContain("authClient.updateUser");
    expect(profilePage).toContain("name: normalizedName");
    expect(profilePage).toContain("image: normalizedImage || null");
    expect(profilePage).toContain("user.emailVerified");
    expect(profilePage).toContain("user.createdAt");
  });
});
