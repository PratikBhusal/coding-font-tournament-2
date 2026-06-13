import { describe, expect, test } from "vitest";
import codingFonts from "../codingFonts";
import {
  getFontComparePageStaticPaths,
  getFontPageStaticPaths,
} from "../fontPageRoutes";
import { getFontSlug } from "../routes";

describe("font page routes", () => {
  test("creates one detail route per font", () => {
    const paths = getFontPageStaticPaths(codingFonts);

    expect(paths).toHaveLength(codingFonts.length);
    expect(new Set(paths.map((path) => path.params.slug)).size).toBe(
      codingFonts.length,
    );

    for (const font of codingFonts) {
      expect(paths).toContainEqual({
        params: { slug: getFontSlug(font.family) },
        props: { font },
      });
    }
  });

  test("creates every ordered compare route except self-pairs", () => {
    const paths = getFontComparePageStaticPaths(codingFonts);

    expect(paths).toHaveLength(codingFonts.length * (codingFonts.length - 1));

    for (const path of paths) {
      expect(path.params.slug).not.toBe(path.params.rightSlug);
      expect(path.props.font.family).not.toBe(path.props.compareFont.family);
    }

    const pathsFromFira = paths.filter(
      (path) => path.params.slug === getFontSlug("Fira Code"),
    );
    expect(pathsFromFira).toHaveLength(codingFonts.length - 1);
    expect(pathsFromFira).toContainEqual({
      params: {
        slug: getFontSlug("Fira Code"),
        rightSlug: getFontSlug("JetBrains Mono"),
      },
      props: {
        font: codingFonts.find((font) => font.family === "Fira Code"),
        compareFont: codingFonts.find(
          (font) => font.family === "JetBrains Mono",
        ),
      },
    });
  });
});
