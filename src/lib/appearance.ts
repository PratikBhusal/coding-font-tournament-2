import { DEFAULT_CODE_THEME, codeThemeSlugs } from "./codeThemes";
import { DEFAULT_LANGUAGE } from "./sampleCode";
import { readJSON, writeJSON } from "./storage";

/**
 * Appearance is applied one-way to `<html>` (CSS variables + `data-*`), read by the
 * static code specimens and the tournament island through the CSS cascade. There is no
 * shared reactive store — these helpers are the only writers.
 *
 * localStorage keys/format are preserved from the previous Solid store for back-compat.
 */
export const APPEARANCE_KEYS = {
  theme: "selectedTheme",
  language: "editorLanguage",
  fontSize: "fontSize",
  ligatures: "fontLigatures",
  openType: "fontOpenTypeFeatures",
} as const;

export const APPEARANCE_DEFAULTS = {
  theme: DEFAULT_CODE_THEME,
  language: DEFAULT_LANGUAGE,
  fontSize: 20,
  ligatures: true,
  openType: true,
};

export function getTheme(): string {
  const value = readJSON(APPEARANCE_KEYS.theme, APPEARANCE_DEFAULTS.theme);
  return codeThemeSlugs.includes(value) ? value : APPEARANCE_DEFAULTS.theme;
}

export function getLanguage(): string {
  return readJSON(APPEARANCE_KEYS.language, APPEARANCE_DEFAULTS.language);
}

export function getFontSize(): number {
  return readJSON(APPEARANCE_KEYS.fontSize, APPEARANCE_DEFAULTS.fontSize);
}

export function getLigatures(): boolean {
  return readJSON(APPEARANCE_KEYS.ligatures, APPEARANCE_DEFAULTS.ligatures);
}

export function getOpenType(): boolean {
  return readJSON(APPEARANCE_KEYS.openType, APPEARANCE_DEFAULTS.openType);
}

export function applyAppearance() {
  const root = document.documentElement;
  root.dataset.codeTheme = getTheme();
  root.dataset.codeLang = getLanguage();
  root.style.setProperty("--code-font-size", `${getFontSize()}px`);
  root.dataset.ligatures = getLigatures() ? "1" : "0";
  root.dataset.opentype = getOpenType() ? "1" : "0";
}

export function setTheme(value: string) {
  writeJSON(APPEARANCE_KEYS.theme, value);
  applyAppearance();
}

export function setLanguage(value: string) {
  writeJSON(APPEARANCE_KEYS.language, value);
  applyAppearance();
}

export function setFontSize(value: number) {
  writeJSON(APPEARANCE_KEYS.fontSize, value);
  applyAppearance();
}

export function setLigatures(value: boolean) {
  writeJSON(APPEARANCE_KEYS.ligatures, value);
  applyAppearance();
}

export function setOpenType(value: boolean) {
  writeJSON(APPEARANCE_KEYS.openType, value);
  applyAppearance();
}
