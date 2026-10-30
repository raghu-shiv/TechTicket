import { expect, test, type Page, type TestInfo } from "@playwright/test";

const routes = [
  { key: "dashboard", path: "/dashboard" },
  { key: "tickets", path: "/tickets" },
  { key: "ticket-create", path: "/tickets/create" },
  { key: "approvals", path: "/approvals" },
  { key: "ticket-library", path: "/ticket-library" },
  { key: "products", path: "/products" },
  { key: "users", path: "/users" },
  { key: "settings", path: "/settings" },
  { key: "sla-policies", path: "/settings/sla-policies" },
  { key: "profile", path: "/profile" },
  { key: "reports", path: "/reports" },
  { key: "sla-dashboard", path: "/reports/sla" },
  { key: "sla-reports", path: "/reports/sla-reports" },
  { key: "tat-reports", path: "/reports/tat" },
  { key: "ticket-library-reports", path: "/reports/ticket-library" },
  { key: "usage-reports", path: "/reports/usage" },
  { key: "employee-reports", path: "/reports/employees" },
];

async function signInAsAdmin(page: Page) {
  const email = process.env.TECHTICKET_E2E_EMAIL;
  const password = process.env.TECHTICKET_E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set TECHTICKET_E2E_EMAIL and TECHTICKET_E2E_PASSWORD before running browser tests.",
    );
  }

  await page.goto("/login");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard\/?$/, {
    timeout: 30_000,
  });

  await expect(page.locator("#main-content")).toBeVisible();
}

async function verifySkipLink(page: Page) {
  await page.goto("/dashboard");

  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", {
    name: "Skip to main content",
  });

  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Enter");

  await expect(page.locator("#main-content")).toBeFocused();
}

async function verifyNavigation(page: Page, isMobile: boolean) {
  if (isMobile) {
    const trigger = page.getByRole("button", {
      name: "Open navigation",
    });

    await expect(trigger).toBeVisible();
    await trigger.click();

    const drawer = page.getByRole("dialog", {
      name: "Mobile navigation",
    });

    await expect(drawer).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(drawer).toBeHidden();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Verify an actual navigation item works inside the mobile drawer.
    await trigger.click();

    await drawer
      .getByRole("link", {
        name: "Ticket Library",
      })
      .click();

    await expect(page).toHaveURL(/\/ticket-library(?:\?.*)?$/);
    await expect(drawer).toBeHidden();
  } else {
    const navigation = page.getByRole("navigation", {
      name: "Primary navigation",
    });

    const libraryLink = navigation.getByRole("link", {
      name: "Ticket Library",
    });

    await expect(libraryLink).toBeVisible();
    await libraryLink.click();

    await expect(page).toHaveURL(/\/ticket-library(?:\?.*)?$/);
  }

  await page.goto("/dashboard");
}

async function verifyHeaderMenus(page: Page) {
  // Global search
  const searchTrigger = page
    .getByRole("button", {
      name: "Search tickets and knowledge articles",
    })
    .first();

  await expect(searchTrigger).toBeVisible();
  await searchTrigger.click();

  const searchDialog = page.locator('[role="dialog"]:visible').last();

  await expect(searchDialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(searchDialog).toBeHidden();

  // Account menu
  const accountTrigger = page.getByRole("button", {
    name: "Account menu",
  });

  await accountTrigger.click();

  const profileLink = page.getByRole("link", {
    name: "Profile",
    exact: true,
  });

  await expect(profileLink).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(profileLink).toBeHidden();
  await expect(accountTrigger).toBeFocused();

  // Notifications
  const notificationTrigger = page.getByRole("button", {
    name: /^Notifications/,
  });

  await notificationTrigger.click();

  const notificationDialog = page.getByRole("dialog", {
    name: "Notification center",
  });

  await expect(notificationDialog).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(notificationDialog).toBeHidden();
  await expect(notificationTrigger).toHaveAttribute("aria-expanded", "false");
}

async function verifyResponsiveLayout(page: Page, route: string) {
  const dimensions = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;

    return {
      viewportWidth: window.innerWidth,
      documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
    };
  });

  expect(
    dimensions.documentWidth,
    `Unexpected page-level horizontal overflow on ${route}: ${dimensions.documentWidth}px document width versus ${dimensions.viewportWidth}px viewport width.`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}

async function captureRoute(
  page: Page,
  route: { key: string; path: string },
  testInfo: TestInfo,
) {
  await page.goto(route.path, {
    waitUntil: "domcontentloaded",
  });

  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);

  const main = page.locator("#main-content");

  await expect(main).toBeVisible();

  await expect(main.locator("h1, h2, h3").first()).toBeVisible();

  // Wait briefly for API-backed UI and web fonts to settle.
  await page
    .waitForLoadState("networkidle", {
      timeout: 5_000,
    })
    .catch(() => undefined);

  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  await verifyResponsiveLayout(page, route.path);

  const screenshotPath = testInfo.outputPath(`${route.key}.png`);

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
  });

  await testInfo.attach(`visual-${route.key}`, {
    path: screenshotPath,
    contentType: "image/png",
  });
}

test("Phase 8 responsive, theme, navigation and console regression", async ({
  page,
}, testInfo) => {
  test.skip(
    !process.env.TECHTICKET_E2E_EMAIL || !process.env.TECHTICKET_E2E_PASSWORD,
    "Browser regression requires a dedicated TechTicket OWNER or ADMIN test account.",
  );

  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    const record = `[${page.url()}] ${message.text()}`;

    if (message.type() === "error") {
      consoleErrors.push(record);
    }

    if (message.type() === "warning") {
      consoleWarnings.push(record);
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(`[${page.url()}] ${error.message}`);
  });

  await signInAsAdmin(page);

  await verifySkipLink(page);

  const isMobile = testInfo.project.name.startsWith("mobile");

  await verifyNavigation(page, isMobile);
  await verifyHeaderMenus(page);

  let ticketDetailPath: string | null = null;

  for (const route of routes) {
    await captureRoute(page, route, testInfo);

    // Capture a real ticket detail page when the test workspace contains one.
    if (route.path === "/tickets") {
      ticketDetailPath = await page
        .locator('#main-content a[href^="/tickets/"]')
        .evaluateAll((elements) => {
          const href = elements
            .map((element) =>
              (element as HTMLAnchorElement).getAttribute("href"),
            )
            .find(
              (value): value is string =>
                value !== null &&
                value.length > 0 &&
                value !== "/tickets/create" &&
                /^\/tickets\/[^/?#]+/.test(value),
            );

          return href ?? null;
        });
    }
  }

  if (ticketDetailPath) {
    await captureRoute(
      page,
      {
        key: "ticket-detail",
        path: ticketDetailPath,
      },
      testInfo,
    );
  }

  // Safe interaction checks: these do not create or modify server records.

  // Ticket-list filters remain operable.
  await page.goto("/tickets");

  const ticketSearch = page.getByRole("searchbox", {
    name: "Search tickets",
  });

  await ticketSearch.fill("phase8-regression-probe");
  await expect(ticketSearch).toHaveValue("phase8-regression-probe");

  const statusFilter = page.getByLabel("Status").first();

  await statusFilter.selectOption("OPEN");
  await expect(statusFilter).toHaveValue("OPEN");

  // Ticket creation client validation must still prevent an empty submission.
  await page.goto("/tickets/create");

  await page
    .getByRole("button", {
      name: "Create Ticket",
    })
    .click();

  await expect(page.locator("#ticket-title")).toHaveAttribute(
    "aria-invalid",
    "true",
  );

  await expect(page.locator("#ticket-description")).toHaveAttribute(
    "aria-invalid",
    "true",
  );

  // Export format selection is safe to exercise; no download is triggered.
  await page.goto("/reports");

  const exportFormat = page.getByLabel("Export format").first();

  await exportFormat.selectOption("json");
  await expect(exportFormat).toHaveValue("json");

  if (consoleWarnings.length > 0) {
    await testInfo.attach("browser-console-warnings.txt", {
      body: consoleWarnings.join("\n\n"),
      contentType: "text/plain",
    });
  }

  expect(pageErrors, "Uncaught browser page errors were recorded.").toEqual([]);

  expect(consoleErrors, "Browser console errors were recorded.").toEqual([]);
});
