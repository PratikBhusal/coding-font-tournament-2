import { test, expect, type Page } from "@playwright/test";

async function closeSidebar(page: Page) {
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("app:menu-close")),
  );
  await expect(page.locator("#app-sidebar")).toHaveCSS("width", "0px");
}

test.describe("browse (/browse)", () => {
  test("renders static highlighted code (no island)", async ({ page }) => {
    await page.goto("browse");
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();
    // Page chrome is static — no Solid island on browse.
    await expect(page.locator("astro-island")).toHaveCount(0);
  });

  test("search filters the font table", async ({ page }) => {
    await page.goto("browse");
    await page.fill("#font-search", "jetbrains");
    await expect(page.locator('tr[data-search*="jetbrains"]')).toBeVisible();
    await expect(page.locator('tr[data-search*="fira code"]')).toBeHidden();
  });

  test("theme dropdown updates the code theme (mobile change event)", async ({
    page,
  }) => {
    await page.goto("browse");
    await expect(page.locator("html")).toHaveAttribute(
      "data-code-theme",
      "vs-dark",
    );
    await page.selectOption("#ctrl-theme", "vs");
    await expect(page.locator("html")).toHaveAttribute("data-code-theme", "vs");
  });

  test("language dropdown switches the visible snippet", async ({ page }) => {
    await page.goto("browse");
    // Assert computed display (viewport-independent) rather than size-based visibility.
    const display = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).display);

    expect(await display('.code-lang[data-lang="typescript"]')).not.toBe(
      "none",
    );
    expect(await display('.code-lang[data-lang="python"]')).toBe("none");

    await page.selectOption("#ctrl-language", "python");
    await expect(page.locator("html")).toHaveAttribute(
      "data-code-lang",
      "python",
    );

    await expect
      .poll(() => display('.code-lang[data-lang="python"]'))
      .not.toBe("none");
    expect(await display('.code-lang[data-lang="typescript"]')).toBe("none");
  });

  test("clicking a font previews it in place; maximize navigates", async ({
    page,
  }) => {
    await page.goto("browse");
    const specimen = page.locator("#browse-specimen");

    // Clicking the row's name cell swaps the preview font without leaving /browse.
    // (Clicking the row's center would hit the Compare button instead.)
    await page.locator('tr[data-family="Fira Code"] td').first().click();
    await expect(page).toHaveURL(/\/browse$/);
    await expect(specimen).toHaveAttribute("style", /Fira Code/);
    await expect(page.locator("#browse-name")).toHaveText("Fira Code");

    // The maximize icon still navigates to the font's page.
    await page
      .locator('tr[data-family="Fira Code"] a[title="Open font page"]')
      .click();
    await expect(page).toHaveURL(/\/FiraCode$/);
  });

  test("Compare opens a second view in place (no navigation)", async ({
    page,
  }) => {
    await page.goto("browse");
    await page.locator('tr[data-family="Fira Code"] td').first().click();

    const compare = page.locator("#browse-compare");
    await expect(compare).toBeHidden();

    await page
      .locator('tr[data-family="JetBrains Mono"] a.compare-link')
      .click();
    await closeSidebar(page);
    await expect(page).toHaveURL(/\/browse$/);
    await expect(compare).toBeVisible();
    await expect(page.locator("#browse-compare-name")).toHaveText(
      "JetBrains Mono",
    );
    await expect(page.locator("#browse-compare-specimen")).toHaveAttribute(
      "style",
      /JetBrains Mono/,
    );

    await page.locator("#browse-compare-close").click();
    await expect(compare).toBeHidden();
  });

  test("comparing hides both shown fonts' Compare buttons and shows both close buttons", async ({
    page,
  }) => {
    await page.goto("browse");
    const firaCompare = page.locator(
      'tr[data-family="Fira Code"] a.compare-link',
    );
    const jetbrainsCompare = page.locator(
      'tr[data-family="JetBrains Mono"] a.compare-link',
    );

    await page.locator('tr[data-family="Fira Code"] td').first().click();
    // Selected font hides its own Compare button; the other stays visible.
    await expect(firaCompare).toHaveJSProperty("hidden", true);
    await expect(jetbrainsCompare).toHaveJSProperty("hidden", false);
    await expect(page.locator("#browse-close")).toBeHidden();

    await jetbrainsCompare.click();
    await closeSidebar(page);
    // While comparing: both shown fonts' Compare buttons hidden, both closes shown.
    await expect(firaCompare).toHaveJSProperty("hidden", true);
    await expect(jetbrainsCompare).toHaveJSProperty("hidden", true);
    await expect(page.locator("#browse-close")).toBeVisible();
    await expect(page.locator("#browse-compare-close")).toBeVisible();
  });

  test("left close keeps only the compared (right) font", async ({ page }) => {
    await page.goto("browse");
    await page.locator('tr[data-family="Fira Code"] td').first().click();
    await page
      .locator('tr[data-family="JetBrains Mono"] a.compare-link')
      .click();
    await closeSidebar(page);

    await page.locator("#browse-close").click();
    await expect(page.locator("#browse-compare")).toBeHidden();
    // The right font becomes the sole view; its Compare button stays hidden, the
    // former left font's returns.
    await expect(page.locator("#browse-name")).toHaveText("JetBrains Mono");
    await expect(
      page.locator('tr[data-family="JetBrains Mono"] a.compare-link'),
    ).toHaveJSProperty("hidden", true);
    await expect(
      page.locator('tr[data-family="Fira Code"] a.compare-link'),
    ).toHaveJSProperty("hidden", false);
  });

  test("right close keeps only the original (left) font", async ({ page }) => {
    await page.goto("browse");
    await page.locator('tr[data-family="Fira Code"] td').first().click();
    await page
      .locator('tr[data-family="JetBrains Mono"] a.compare-link')
      .click();
    await closeSidebar(page);

    await page.locator("#browse-compare-close").click();
    await expect(page.locator("#browse-compare")).toBeHidden();
    await expect(page.locator("#browse-name")).toHaveText("Fira Code");
    await expect(
      page.locator('tr[data-family="Fira Code"] a.compare-link'),
    ).toHaveJSProperty("hidden", true);
    await expect(
      page.locator('tr[data-family="JetBrains Mono"] a.compare-link'),
    ).toHaveJSProperty("hidden", false);
  });

  test("theme choice persists across a reload", async ({ page }) => {
    await page.goto("browse");
    await page.selectOption("#ctrl-theme", "hc-light");
    await expect(page.locator("html")).toHaveAttribute(
      "data-code-theme",
      "hc-light",
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-code-theme",
      "hc-light",
    );
  });
});
