import type { CodingFont } from "./codingFonts";
import { getFontSlug } from "./routes";

export function getFontPageStaticPaths(fonts: CodingFont[]) {
  return fonts.map((font) => ({
    params: { slug: getFontSlug(font.family) },
    props: { font },
  }));
}

export function getFontComparePageStaticPaths(fonts: CodingFont[]) {
  return fonts.flatMap((font) =>
    fonts
      .filter((compareFont) => compareFont.family !== font.family)
      .map((compareFont) => ({
        params: {
          slug: getFontSlug(font.family),
          rightSlug: getFontSlug(compareFont.family),
        },
        props: { font, compareFont },
      })),
  );
}
