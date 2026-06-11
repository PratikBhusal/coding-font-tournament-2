import { test, expect } from '@playwright/test';

test.describe('tournament (/)', () => {
  test('renders code specimens after a full page load', async ({ page }) => {
    // Regression: the island must populate the board on a fresh load (no hydration
    // mismatch leaving an empty board). Covers desktop and mobile (grid row height).
    await page.goto('/');
    await expect(page.locator('.code-specimen .shiki').first()).toBeVisible();
  });

  test('font pool sidebar: open by default on desktop, collapsed-then-toggle on mobile', async ({
    page
  }, testInfo) => {
    await page.goto('/');
    // Assert the sidebar's width, not the "Font Pool" text: when collapsed the aside
    // is width:0 + overflow:hidden, but the clipped text still has its own non-zero
    // box, which Playwright's visibility check (ignoring ancestor clipping) treats as
    // visible. Width is the real open/collapsed signal.
    const sidebar = page.getByTestId('tournament-sidebar');

    // Wait for the client-only island to finish mounting (board populated) so its
    // `app:menu-toggle` listener is registered before we interact.
    await expect(page.locator('.code-specimen .shiki').first()).toBeVisible();

    if (testInfo.project.name === 'desktop') {
      await expect(sidebar).not.toHaveCSS('width', '0px');
      return;
    }

    // Mobile: collapsed by default, opens when the menu toggle is tapped.
    await expect(sidebar).toHaveCSS('width', '0px');
    await page.locator('#app-menu-toggle').click();
    await expect(sidebar).not.toHaveCSS('width', '0px');
  });

  test('hides the SVG button until there is a winner', async ({ page }) => {
    await page.goto('/');
    // Board is mid-tournament on load, so no champion yet.
    await expect(page.locator('.code-specimen .shiki').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download SVG' })).toHaveCount(0);
  });

  test('reaching a winner hides Show Name and shows Download SVG beside New Run', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.code-specimen .shiki').first()).toBeVisible();

    // Mid-tournament the Show Name toggle is present; the winner controls are not.
    await expect(page.getByText('Show Name')).toBeVisible();

    // Play the bracket to completion by always picking the left competitor.
    const winner = page.getByText('Winner', { exact: true });
    for (let i = 0; i < 80 && !(await winner.isVisible()); i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await expect(winner).toBeVisible();

    // Winner state: Show Name is gone; New Run + Download SVG sit together.
    await expect(page.getByText('Show Name')).toHaveCount(0);
    const newRun = page.getByRole('button', { name: 'New Run' });
    const downloadSvg = page.getByRole('button', { name: 'Download SVG' });
    await expect(newRun).toBeVisible();
    await expect(downloadSvg).toBeVisible();
    // Same flex row → identical vertical position.
    const newRunBox = await newRun.boundingBox();
    const downloadBox = await downloadSvg.boundingBox();
    expect(newRunBox && downloadBox).toBeTruthy();
    expect(Math.abs(newRunBox!.y - downloadBox!.y)).toBeLessThan(4);
  });

  test('SVG export embeds theme colors resolved from CSS variables', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.code-specimen .shiki').first()).toBeVisible();

    // Play to a champion so the export is available.
    const winner = page.getByText('Winner', { exact: true });
    for (let i = 0; i < 80 && !(await winner.isVisible()); i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await expect(winner).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download SVG' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.svg$/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const svg = Buffer.concat(chunks).toString('utf8');

    // Colors are resolved from the `--*` palette and emitted as portable hex. If a
    // variable failed to resolve, fills/strokes would be empty instead of `#rrggbb`.
    expect(svg).toContain('<svg');
    expect(svg).toMatch(/(fill|stroke)="#[0-9a-fA-F]{6}"/);
    expect(svg).not.toContain('oklch(');
    expect(svg).not.toMatch(/(fill|stroke)="\s*"/);
  });

  test('mobile nav menu: hamburger reveals Tournament/Browse links', async ({ page }, testInfo) => {
    await page.goto('/');
    const navToggle = page.locator('#app-nav-toggle');
    const navMenu = page.locator('#app-nav-menu');

    if (testInfo.project.name === 'desktop') {
      // Replaced by the inline md+ nav.
      await expect(navToggle).toBeHidden();
      return;
    }

    await expect(navToggle).toBeVisible();
    await expect(navMenu).toBeHidden();
    await navToggle.click();
    await expect(navMenu).toBeVisible();
    await navMenu.getByRole('link', { name: 'Browse' }).click();
    await expect(page).toHaveURL(/\/browse$/);
  });
});
