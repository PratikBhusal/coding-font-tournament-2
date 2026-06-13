import { test, expect } from "@playwright/test";

// Guards against a flash-of-unstyled-content regression fixed for ClientRouter
// navigation.
test.describe("view transitions (no FOUC)", () => {
  test("flash-prone buttons don't transition background-color", async ({
    page,
  }) => {
    // These buttons carry a press animation. They must transition only `transform`
    // (the scale), not `background-color` — otherwise toggling the theme animates their
    // background through the old theme, a visible flash.
    await page.goto("browse");
    // The header is always present; compare-links exist but start hidden (browse's
    // select-to-compare flow). getComputedStyle still resolves on hidden elements.
    await expect(page.locator("#app-theme-toggle")).toBeVisible();

    for (const selector of [
      "#app-theme-toggle",
      "#app-menu-toggle",
      "a.compare-link",
    ]) {
      const transitionProperty = await page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).transitionProperty);
      expect(transitionProperty, selector).toContain("transform");
      expect(transitionProperty, selector).not.toContain("background-color");
    }
  });
});
