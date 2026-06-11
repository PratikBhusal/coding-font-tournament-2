import { test, expect } from '@playwright/test';

test.describe('browse (/browse)', () => {
  test('renders static highlighted code (no island)', async ({ page }) => {
    await page.goto('browse');
    await expect(page.locator('.code-specimen .shiki').first()).toBeVisible();
    // Page chrome is static — no Solid island on browse.
    await expect(page.locator('astro-island')).toHaveCount(0);
  });

  test('search filters the font table', async ({ page }) => {
    await page.goto('browse');
    await page.fill('#font-search', 'jetbrains');
    await expect(page.locator('tr[data-search*="jetbrains"]')).toBeVisible();
    await expect(page.locator('tr[data-search*="fira code"]')).toBeHidden();
  });

  test('theme dropdown updates the code theme (mobile change event)', async ({ page }) => {
    await page.goto('browse');
    await expect(page.locator('html')).toHaveAttribute('data-code-theme', 'vs-dark');
    await page.selectOption('#ctrl-theme', 'vs');
    await expect(page.locator('html')).toHaveAttribute('data-code-theme', 'vs');
  });

  test('language dropdown switches the visible snippet', async ({ page }) => {
    await page.goto('browse');
    // Assert computed display (viewport-independent) rather than size-based visibility.
    const display = (selector: string) =>
      page.locator(selector).first().evaluate((el) => getComputedStyle(el).display);

    expect(await display('.code-lang[data-lang="typescript"]')).not.toBe('none');
    expect(await display('.code-lang[data-lang="python"]')).toBe('none');

    await page.selectOption('#ctrl-language', 'python');
    await expect(page.locator('html')).toHaveAttribute('data-code-lang', 'python');

    await expect
      .poll(() => display('.code-lang[data-lang="python"]'))
      .not.toBe('none');
    expect(await display('.code-lang[data-lang="typescript"]')).toBe('none');
  });

  test('clicking a font previews it in place; maximize navigates', async ({ page }) => {
    await page.goto('browse');
    const specimen = page.locator('#browse-specimen');

    // Clicking the row's name cell swaps the preview font without leaving /browse.
    // (Clicking the row's center would hit the Compare button instead.)
    await page.locator('tr[data-family="Fira Code"] td').first().click();
    await expect(page).toHaveURL(/\/browse$/);
    await expect(specimen).toHaveAttribute('style', /Fira Code/);
    await expect(page.locator('#browse-name')).toHaveText('Fira Code');

    // The maximize icon still navigates to the font's page.
    await page.locator('tr[data-family="Fira Code"] a[title="Open font page"]').click();
    await expect(page).toHaveURL(/\/FiraCode$/);
  });

  test('Compare opens a second view in place (no navigation)', async ({ page }) => {
    await page.goto('browse');
    await page.locator('tr[data-family="Fira Code"] td').first().click();

    const compare = page.locator('#browse-compare');
    await expect(compare).toBeHidden();

    await page.locator('tr[data-family="JetBrains Mono"] a.compare-link').click();
    await expect(page).toHaveURL(/\/browse$/);
    await expect(compare).toBeVisible();
    await expect(page.locator('#browse-compare-name')).toHaveText('JetBrains Mono');
    await expect(page.locator('#browse-compare-specimen')).toHaveAttribute('style', /JetBrains Mono/);

    await page.locator('#browse-compare-close').click();
    await expect(compare).toBeHidden();
  });

  test('gear toggles the sidebar (open by default on every viewport)', async ({ page }) => {
    await page.goto('browse');
    const sidebar = page.locator('#app-sidebar');

    // `sidebarDefaultOpen` opens it on desktop and mobile alike.
    await expect(sidebar).not.toHaveCSS('width', '0px');
    await page.locator('#app-menu-toggle').click();
    await expect(sidebar).toHaveCSS('width', '0px');
    await page.locator('#app-menu-toggle').click();
    await expect(sidebar).not.toHaveCSS('width', '0px');
  });

  test('theme choice persists across a reload', async ({ page }) => {
    await page.goto('browse');
    await page.selectOption('#ctrl-theme', 'hc-light');
    await expect(page.locator('html')).toHaveAttribute('data-code-theme', 'hc-light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-code-theme', 'hc-light');
  });
});
