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

  test("hamburger reveals Tournament/Browse links", async ({ page }) => {
    await page.goto("./");
    const navToggle = page.locator("#app-nav-toggle");
    const navMenu = page.locator("#app-nav-menu");

    await expect(navToggle).toBeVisible();
    await expect(navMenu).toBeHidden();
    await navToggle.click();
    await expect(navMenu).toBeVisible();
    await navMenu.getByRole("link", { name: "Browse" }).click();
    await expect(page).toHaveURL(/\/browse$/);
  });
});
