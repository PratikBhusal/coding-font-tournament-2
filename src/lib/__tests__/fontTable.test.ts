import { describe, expect, test } from "vitest";
import codingFonts from "../codingFonts";
import {
  getFontTableCompareHref,
  getFontTableSearchValue,
  getSelectableFontTableRowAttrs,
  shouldShowFontTableCompareLink,
} from "../fontTable";
import { getFontPath, getFontSlug } from "../routes";

function fontByFamily(family: string) {
  const font = codingFonts.find((candidate) => candidate.family === family);
  if (!font) throw new Error(`Missing test font: ${family}`);
  return font;
}

describe("font table helpers", () => {
  test("builds compare links only for non-self comparisons", () => {
    const fira = fontByFamily("Fira Code");
    const jetBrains = fontByFamily("JetBrains Mono");

    expect(getFontTableCompareHref(fira, fira)).toBeUndefined();
    expect(getFontTableCompareHref(jetBrains, fira)).toBe(
      `${getFontPath(fira.family)}/${getFontSlug(jetBrains.family)}`,
    );
  });

  test("hides compare links for the base font and active font", () => {
    const fira = fontByFamily("Fira Code");
    const jetBrains = fontByFamily("JetBrains Mono");
    const hack = fontByFamily("Hack");

    expect(shouldShowFontTableCompareLink({ font: fira, baseFont: fira })).toBe(
      false,
    );
    expect(
      shouldShowFontTableCompareLink({
        font: jetBrains,
        baseFont: fira,
        activeFamily: jetBrains.family,
      }),
    ).toBe(false);
    expect(
      shouldShowFontTableCompareLink({
        font: hack,
        baseFont: fira,
        activeFamily: jetBrains.family,
      }),
    ).toBe(true);
  });

  test("emits searchable text and selectable row attributes", () => {
    const fira = fontByFamily("Fira Code");

    expect(getFontTableSearchValue(fira)).toBe("fira code fira code");
    expect(getSelectableFontTableRowAttrs(fira)).toMatchObject({
      "data-family": "Fira Code",
      "data-css-family": "'Fira Code', ui-monospace, monospace",
      "data-display-name": "Fira Code",
      "data-slug": "FiraCode",
      "data-path": getFontPath("Fira Code"),
      "data-site-url": fira.siteUrl,
      "data-download-url": fira.downloadUrl,
      "data-system": "0",
    });
  });

  test("marks system fonts for browse row updates", () => {
    const systemFont = fontByFamily("ui-monospace");

    expect(getSelectableFontTableRowAttrs(systemFont)).toMatchObject({
      "data-css-family": "ui-monospace, monospace",
      "data-system": "1",
    });
  });
});
