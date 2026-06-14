import { test, expect } from "@playwright/test";

test.describe("tournament mobile (/)", () => {
  test("font pool sidebar is collapsed by default and opens full width", async ({
    page,
  }) => {
    await page.goto("./");
    const sidebar = page.getByTestId("tournament-sidebar");

    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();
    await expect(sidebar).toHaveCSS("width", "0px");
    await page.locator("#app-menu-toggle").click();
    await expect(sidebar).toHaveCSS("width", `${page.viewportSize()!.width}px`);
  });

  test("native navigation select navigates to Browse", async ({ page }) => {
    await page.goto("./");
    const navSelect = page.locator("#app-nav-select");

    await expect(navSelect).toBeVisible();
    await navSelect.selectOption({ label: "Browse" });
    await expect(page).toHaveURL(/\/browse$/);
  });
});
