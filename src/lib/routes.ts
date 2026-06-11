import type { CodingFont } from './codingFonts';

export function getFontSlug(family: string) {
  return encodeURIComponent(family.replace(/\s+/g, ''));
}

export function getFontPath(family: string) {
  return `/${getFontSlug(family)}`;
}

export function findFontBySlug(fonts: CodingFont[], slug: string) {
  const decodedSlug = decodeURIComponent(slug);
  return fonts.find((font) => font.family.replace(/\s+/g, '') === decodedSlug);
}
