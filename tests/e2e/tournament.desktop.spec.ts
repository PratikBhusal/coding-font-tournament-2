import { test, expect, type Page } from "@playwright/test";

async function setSidebarWidth(page: Page, width: number) {
  await page.evaluate((sidebarWidth) => {
    localStorage.setItem("menuOpen", JSON.stringify(true));
    localStorage.setItem("sidebarWidth", JSON.stringify(sidebarWidth));
    window.dispatchEvent(new CustomEvent("app:menu-open"));
  }, width);
  await expect(page.getByTestId("tournament-sidebar")).toHaveCSS(
    "width",
    `${width}px`,
  );
}

test.describe("tournament desktop (/)", () => {
  test("font pool sidebar is open by default", async ({ page }) => {
    await page.goto("./");
    const sidebar = page.getByTestId("tournament-sidebar");

    // Assert the sidebar's width, not text visibility: collapsed width is the real
    // signal because clipped descendants can still have non-zero boxes.
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();
    await expect(sidebar).not.toHaveCSS("width", "0px");
  });

  test("mobile nav toggle is hidden", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("#app-nav-toggle")).toBeHidden();
  });

  test("split view responds to sidebar width, not only viewport width", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();
    await page.getByRole("button", { name: "Split", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Split", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();

    async function getSpecimenBoxes(width: number) {
      await setSidebarWidth(page, width);
      const specimens = page.locator(".code-specimen").filter({
        has: page.locator(".shiki"),
      });
      await expect(specimens).toHaveCount(2);
      const left = await specimens.nth(0).boundingBox();
      const right = await specimens.nth(1).boundingBox();
      expect(left && right).toBeTruthy();
      return { left: left!, right: right! };
    }

    const wideBoard = await getSpecimenBoxes(192);
    expect(Math.abs(wideBoard.left.y - wideBoard.right.y)).toBeLessThan(8);
    expect(wideBoard.right.x).toBeGreaterThan(wideBoard.left.x);

    const narrowBoard = await getSpecimenBoxes(900);
    expect(narrowBoard.right.y).toBeGreaterThan(
      narrowBoard.left.y + narrowBoard.left.height / 2,
    );
    expect(Math.abs(narrowBoard.left.x - narrowBoard.right.x)).toBeLessThan(8);
  });

  test("unified view responds to sidebar width, not only viewport width", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();
    await page.getByRole("button", { name: "Unified", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Unified", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.locator(".code-specimen .shiki").first()).toBeVisible();

    async function getChooseButtonBoxes(width: number) {
      await setSidebarWidth(page, width);
      const left = await page
        .getByRole("button", { name: /Choose A/ })
        .boundingBox();
      const right = await page
        .getByRole("button", { name: /Choose B/ })
        .boundingBox();
      expect(left && right).toBeTruthy();
      return { left: left!, right: right! };
    }

    const wideBoard = await getChooseButtonBoxes(192);
    expect(Math.abs(wideBoard.left.y - wideBoard.right.y)).toBeLessThan(8);
    expect(wideBoard.right.x).toBeGreaterThan(wideBoard.left.x);

    const narrowBoard = await getChooseButtonBoxes(900);
    expect(narrowBoard.right.y).toBeGreaterThan(narrowBoard.left.y);
    expect(Math.abs(narrowBoard.left.x - narrowBoard.right.x)).toBeLessThan(8);
  });
});
