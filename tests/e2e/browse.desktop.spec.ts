import { test, expect } from "@playwright/test";

test.describe("browse desktop (/browse)", () => {
  test("gear toggles the sidebar open by default", async ({ page }) => {
    await page.goto("browse");
    const sidebar = page.locator("#app-sidebar");

    await expect(sidebar).not.toHaveCSS("width", "0px");
    await page.locator("#app-menu-toggle").click();
    await expect(sidebar).toHaveCSS("width", "0px");
    await page.locator("#app-menu-toggle").click();
    await expect(sidebar).not.toHaveCSS("width", "0px");
  });
});
