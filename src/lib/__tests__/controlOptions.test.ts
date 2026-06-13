import { describe, expect, test } from "vitest";
import { codeThemes } from "../codeThemes";
import { getSortedCodeThemes } from "../controlOptions";

describe("control options", () => {
  test("keeps every code theme while sorting italic themes first", () => {
    const sortedThemes = getSortedCodeThemes();
    const firstNonItalicIndex = sortedThemes.findIndex(
      (theme) => !theme.italic,
    );

    expect(sortedThemes).toHaveLength(codeThemes.length);
    expect(new Set(sortedThemes.map((theme) => theme.slug))).toEqual(
      new Set(codeThemes.map((theme) => theme.slug)),
    );

    if (firstNonItalicIndex !== -1) {
      expect(
        sortedThemes.slice(firstNonItalicIndex).every((theme) => !theme.italic),
      ).toBe(true);
    }
  });
});
