import { test, expect } from "@playwright/test";

// Guards against a ClientRouter dark-theme flash. A one-frame visual flash can't be
// asserted directly, so this checks the underlying guarantee that prevents it.
test.describe("view transitions (desktop)", () => {
  test("dark theme is on the incoming document before a swap", async ({
    page,
  }) => {
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
});
