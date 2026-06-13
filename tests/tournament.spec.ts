import { test, expect, type Page } from "@playwright/test";
import codingFonts from "../src/lib/codingFonts";

const totalFontCount = codingFonts.length;
const curatedFontCount = codingFonts.filter(
  (font) => font.includeInInitialTournament,
).length;
const curatedBadgeText = `${curatedFontCount}/${totalFontCount}`;
const allBadgeText = `${totalFontCount}/${totalFontCount}`;

async function expectSingleEliminationRoundCount(
  page: Page,
  selectedFamilies: string[],
) {
  const expectedRoundCount = Math.ceil(Math.log2(selectedFamilies.length));

  await page.addInitScript(
    ({ selectedFamilies }) => {
      localStorage.setItem(
        "tournamentFontFamilies",
        JSON.stringify(selectedFamilies),
      );
      localStorage.setItem(
        "tournamentEliminationMode",
        JSON.stringify("single"),
      );
    },
    { selectedFamilies },
  );

  await page.goto("./");
  await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();

  await expect(page.getByTestId("tournament-progress")).toHaveText(
    new RegExp(`^Round 1/${expectedRoundCount} Match 1/\\d+$`),
  );
}

test.describe("tournament (/)", () => {
  test("renders code specimens after a full page load", async ({ page }) => {
    // Regression: the island must populate the board on a fresh load (no hydration
    // mismatch leaving an empty board). Covers desktop and mobile (grid row height).
    await page.goto("./");
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();
  });

  test("font pool sidebar: open by default on desktop, collapsed-then-toggle on mobile", async ({
    page,
  }, testInfo) => {
    await page.goto("./");
    // Assert the sidebar's width, not the "Font Pool" text: when collapsed the aside
    // is width:0 + overflow:hidden, but the clipped text still has its own non-zero
    // box, which Playwright's visibility check (ignoring ancestor clipping) treats as
    // visible. Width is the real open/collapsed signal.
    const sidebar = page.getByTestId("tournament-sidebar");

    // Wait for the client-only island to finish mounting (board populated) so its
    // `app:menu-toggle` listener is registered before we interact.
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();

    if (!testInfo.project.name.startsWith("mobile")) {
      await expect(sidebar).not.toHaveCSS("width", "0px");
      return;
    }

    // Mobile: collapsed by default, opens when the menu toggle is tapped.
    await expect(sidebar).toHaveCSS("width", "0px");
    await page.locator("#app-menu-toggle").click();
    await expect(sidebar).not.toHaveCSS("width", "0px");
  });

  test("curated/all presets keep the selection count correct", async ({
    page,
  }, testInfo) => {
    await page.goto("./");
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();

    // Mobile: the sidebar is collapsed (width 0) by default, so open it before
    // interacting with the pool controls.
    if (testInfo.project.name.startsWith("mobile")) {
      await page.locator("#app-menu-toggle").click();
      await expect(page.getByTestId("tournament-sidebar")).not.toHaveCSS(
        "width",
        "0px",
      );
    }

    const badge = page
      .getByTestId("tournament-sidebar")
      .locator("text=/^\\d+\\/\\d+$/")
      .first();

    // Regression: reconcile() in @nanostores/solid's useStore collapsed the count
    // to 1 after All -> Curated because the font objects have no `id` key. We now
    // hand back the raw nanostore value (see src/lib/useStore.ts).
    await expect(badge).toHaveText(curatedBadgeText);

    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(badge).toHaveText(allBadgeText);

    await page.getByRole("button", { name: "Curated", exact: true }).click();
    await expect(badge).toHaveText(curatedBadgeText);

    // Idempotent: clicking Curated again keeps the curated count.
    await page.getByRole("button", { name: "Curated", exact: true }).click();
    await expect(badge).toHaveText(curatedBadgeText);

    // Toggling a curated font off decrements the count and unchecks the box.
    const firaBox = page
      .getByTestId("tournament-sidebar")
      .locator("label", { hasText: "Fira Code" })
      .locator('input[type="checkbox"]');
    await firaBox.click();
    await expect(firaBox).not.toBeChecked();
    await expect(badge).toHaveText(`${curatedFontCount - 1}/${totalFontCount}`);
  });

  test("SSR renders the curated selection (no 0/total flash)", async ({
    request,
  }) => {
    // The sidebar is client:load, so the server must emit the seeded selection.
    // request.get() returns the unhydrated server HTML (no client JS runs); if the
    // default seed regressed to a window-guarded effect this would render 0/{total}.
    const html = await (await request.get("./")).text();
    expect(html).toMatch(
      new RegExp(
        `Font Pool<\\/span>.*?${curatedFontCount}<!--\\/-->\\/<!--\\$-->${totalFontCount}`,
        "s",
      ),
    );
  });

  test("a stored selection overrides the default on reload", async ({
    page,
  }) => {
    // Contract: the curated default is only the *initial* value; any persisted value
    // (including an empty array from Clear) wins on the client.
    await page.goto("./");
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();

    // Two fonts: the board needs >= 2 to start (the curated default would otherwise
    // mask whether the stored value was honored).
    await page.evaluate(() =>
      localStorage.setItem(
        "tournamentFontFamilies",
        JSON.stringify(["Fira Code", "Hack"]),
      ),
    );
    await page.reload();
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();

    const badge = page
      .getByTestId("tournament-sidebar")
      .locator("text=/^\\d+\\/\\d+$/")
      .first();
    await expect(badge).toHaveText(`2/${totalFontCount}`);
  });

  test("hides the SVG button until there is a winner", async ({ page }) => {
    await page.goto("./");
    // Board is mid-tournament on load, so no champion yet.
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download SVG" }),
    ).toHaveCount(0);
  });

  test("reaching a winner hides Show Name and shows Download SVG beside New Run", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();

    // Mid-tournament the Show Name toggle is present; the winner controls are not.
    await expect(page.getByText("Show Name")).toBeVisible();

    // Play the bracket to completion by always picking the left competitor.
    const winner = page.getByText("Winner", { exact: true });
    for (let i = 0; i < 80 && !(await winner.isVisible()); i++) {
      await page.keyboard.press("ArrowLeft");
    }
    await expect(winner).toBeVisible();

    // Winner state: Show Name is gone; New Run + Download SVG sit together.
    await expect(page.getByText("Show Name")).toHaveCount(0);
    const newRun = page.getByRole("button", { name: "New Run" });
    const downloadSvg = page.getByRole("button", { name: "Download SVG" });
    await expect(newRun).toBeVisible();
    await expect(downloadSvg).toBeVisible();
    // Same flex row → identical vertical position.
    const newRunBox = await newRun.boundingBox();
    const downloadBox = await downloadSvg.boundingBox();
    expect(newRunBox && downloadBox).toBeTruthy();
    expect(Math.abs(newRunBox!.y - downloadBox!.y)).toBeLessThan(4);
  });

  test("Show Name toggle survives a completed tournament and New Run", async ({
    page,
  }) => {
    // Regression: completing a tournament force-set Show Name on, and mount reset it
    // off, so the toggle no longer matched the user's choice after a New Run. It is
    // now purely user-controlled and must persist across the win.
    await page.goto("./");
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();

    const showName = page
      .locator("label", { hasText: "Show Name" })
      .locator('input[type="checkbox"]');

    // Turn the toggle on, then play to a champion.
    await showName.check();
    await expect(showName).toBeChecked();

    const winner = page.getByText("Winner", { exact: true });
    for (let i = 0; i < 80 && !(await winner.isVisible()); i++) {
      await page.keyboard.press("ArrowLeft");
    }
    await expect(winner).toBeVisible();

    // Start a fresh tournament; the toggle reappears still on.
    await page.getByRole("button", { name: "New Run" }).click();
    await expect(showName).toBeChecked();

    // And the off state likewise survives: clear it, win again, New Run keeps it off.
    await showName.uncheck();
    for (let i = 0; i < 80 && !(await winner.isVisible()); i++) {
      await page.keyboard.press("ArrowLeft");
    }
    await expect(winner).toBeVisible();
    await page.getByRole("button", { name: "New Run" }).click();
    await expect(showName).not.toBeChecked();
  });

  test("SVG export embeds theme colors resolved from CSS variables", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();

    // Play to a champion so the export is available.
    const winner = page.getByText("Winner", { exact: true });
    for (let i = 0; i < 80 && !(await winner.isVisible()); i++) {
      await page.keyboard.press("ArrowLeft");
    }
    await expect(winner).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download SVG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.svg$/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const svg = Buffer.concat(chunks).toString("utf8");

    // Colors are resolved from the `--*` palette and emitted as portable hex. If a
    // variable failed to resolve, fills/strokes would be empty instead of `#rrggbb`.
    expect(svg).toContain("<svg");
    expect(svg).toMatch(/R:\d+ M:\d+/);
    expect(svg).toMatch(/(fill|stroke)="#[0-9a-fA-F]{6}"/);
    expect(svg).not.toContain("oklch(");
    expect(svg).not.toMatch(/(fill|stroke)="\s*"/);
  });

  test("unified view: renders each line in both fonts and persists across reload", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();

    await page.getByRole("button", { name: "Unified", exact: true }).click();

    // Each source line of the active (TypeScript) sample is rendered twice — once
    // per competing font.
    const lines = page.locator(
      ".code-lang[data-lang='typescript'] .unified-line",
    );
    await expect(lines.first()).toBeVisible();
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);
    expect(count % 2).toBe(0);

    // Adjacent copies use different fonts (set inline per line).
    const fontA = await lines.nth(0).evaluate((el) => el.style.fontFamily);
    const fontB = await lines.nth(1).evaluate((el) => el.style.fontFamily);
    expect(fontA).not.toBe("");
    expect(fontB).not.toBe("");
    expect(fontA).not.toBe(fontB);

    // The mode is persisted (mirrors $showName).
    await page.reload();
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Unified", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator(".code-lang[data-lang='typescript'] .unified-line").first(),
    ).toBeVisible();
  });

  test("unified view: a Choose button picks the winner and advances the match", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();
    await page.getByRole("button", { name: "Unified", exact: true }).click();

    const progress = page.getByTestId("tournament-progress");
    const before = (await progress.textContent()) ?? "";
    expect(before).toMatch(/^Round \d+\/\d+ Match \d+\/\d+$/);

    // The left "Choose <font>" button advances to the next match.
    await page
      .getByRole("button", { name: /^Choose / })
      .first()
      .click();
    await expect(progress).not.toHaveText(before);
  });

  test("progress resets match count when advancing to a new round", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();

    const progress = page.getByTestId("tournament-progress");
    await expect(progress).toHaveText(/^Round 1\/\d+ Match 1\/\d+$/);

    for (let i = 0; i < 10; i++) {
      if (((await progress.textContent()) ?? "").startsWith("Round 2/")) break;
      await page.keyboard.press("ArrowLeft");
    }

    await expect(progress).toHaveText(/^Round 2\/\d+ Match 1\/\d+$/);
  });

  test("single elimination total rounds uses all selected fonts", async ({
    page,
  }) => {
    await expectSingleEliminationRoundCount(
      page,
      codingFonts.map((font) => font.family),
    );
  });

  test("single elimination total rounds rounds up for one less than all fonts", async ({
    page,
  }) => {
    const selectedFamilies = codingFonts
      .slice(0, codingFonts.length - 1)
      .map((font) => font.family);
    await expectSingleEliminationRoundCount(page, selectedFamilies);
  });

  test("mobile nav menu: hamburger reveals Tournament/Browse links", async ({
    page,
  }, testInfo) => {
    await page.goto("./");
    const navToggle = page.locator("#app-nav-toggle");
    const navMenu = page.locator("#app-nav-menu");

    if (!testInfo.project.name.startsWith("mobile")) {
      // Replaced by the inline md+ nav.
      await expect(navToggle).toBeHidden();
      return;
    }

    await expect(navToggle).toBeVisible();
    await expect(navMenu).toBeHidden();
    await navToggle.click();
    await expect(navMenu).toBeVisible();
    await navMenu.getByRole("link", { name: "Browse" }).click();
    await expect(page).toHaveURL(/\/browse$/);
  });
});
