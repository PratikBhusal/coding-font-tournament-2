import { test, expect } from "@playwright/test";

test.describe("browse mobile (/browse)", () => {
  test("gear toggles the full-width sidebar open by default", async ({
    page,
  }) => {
    await page.goto("browse");
    const sidebar = page.locator("#app-sidebar");
    const viewportWidth = `${page.viewportSize()!.width}px`;

    await expect(sidebar).toHaveCSS("width", viewportWidth);
    await page.locator("#app-menu-toggle").click();
    await expect(sidebar).toHaveCSS("width", "0px");
    await page.locator("#app-menu-toggle").click();
    await expect(sidebar).toHaveCSS("width", viewportWidth);
  });
});
