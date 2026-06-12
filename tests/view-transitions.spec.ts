import { test, expect } from "@playwright/test";

// Guards against the two flash-of-unstyled-content regressions fixed for ClientRouter
// navigation. A one-frame visual flash can't be asserted directly, so each test checks
// the underlying guarantee that prevents it.
test.describe("view transitions (no FOUC)", () => {
  test("dark theme is on the incoming document before a swap", async ({
    page,
  }, testInfo) => {
    // Uses the desktop-only inline header nav to trigger a client-side navigation.
    test.skip(testInfo.project.name.startsWith("mobile"), "desktop nav only");

    await page.goto("browse");
    // Force dark mode (header.ts stores colorScheme as a raw string) and reload so the
    // live <html> carries `.dark`.
    await page.evaluate(() => localStorage.setItem("colorScheme", "dark"));
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);

    // The fix applies `.dark` to the incoming document on astro:before-swap. Without it
    // the swapped-in SSR <html> lacks `.dark` for a frame and `dark:`-override buttons
    // (bg-white) flash light. Capture what the incoming document looks like at swap.
    await page.evaluate(() => {
      (window as Window & { __darkOnSwap?: boolean }).__darkOnSwap = false;
      document.addEventListener(
        "astro:before-swap",
        (event) => {
          (window as Window & { __darkOnSwap?: boolean }).__darkOnSwap = (
            event as unknown as { newDocument: Document }
          ).newDocument.documentElement.classList.contains("dark");
        },
        { once: true },
      );
    });

    await page
      .getByRole("link", { name: "Tournament" })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/coding-font-tournament\/?$/);

    const darkOnSwap = await page.evaluate(
      () => (window as Window & { __darkOnSwap?: boolean }).__darkOnSwap,
    );
    expect(darkOnSwap).toBe(true);
  });

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
