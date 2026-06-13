import type { CodingFont } from "./codingFonts";
import {
  getCssFontFamily,
  getFontDisplayName,
  getFontFeatures,
} from "./fontFeatures";
import { getFontPath, getFontSlug } from "./routes";

export function getFontTableCompareHref(
  font: CodingFont,
  baseFont?: CodingFont,
) {
  return baseFont && baseFont.family !== font.family
    ? `${getFontPath(baseFont.family)}/${getFontSlug(font.family)}`
    : undefined;
}

export function shouldShowFontTableCompareLink(options: {
  font: CodingFont;
  baseFont?: CodingFont;
  activeFamily?: string;
}) {
  return (
    Boolean(getFontTableCompareHref(options.font, options.baseFont)) &&
    options.font.family !== options.activeFamily
  );
}

export function getFontTableSearchValue(font: CodingFont) {
  return `${font.family} ${getFontDisplayName(font)}`.toLowerCase();
}

export function getSelectableFontTableRowAttrs(font: CodingFont) {
  return {
    "data-family": font.family,
    "data-css-family": getCssFontFamily(font),
    "data-feat-both": getFontFeatures(font, true, true) || "normal",
    "data-feat-lig": getFontFeatures(font, false, true) || "normal",
    "data-feat-ot": getFontFeatures(font, true, false) || "normal",
    "data-display-name": getFontDisplayName(font),
    "data-slug": getFontSlug(font.family),
    "data-path": getFontPath(font.family),
    "data-site-url": font.siteUrl,
    "data-download-url": font.downloadUrl,
    "data-system": font.isSystemFont ? "1" : "0",
  };
}
