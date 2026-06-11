import type { BundledTheme } from 'shiki';

export type CodeTheme = {
  slug: string;
  displayName: string;
  italic: boolean;
  dark: boolean;
  /** Shiki bundled theme used to highlight tokens for this slug. */
  shikiTheme: BundledTheme;
};

export const DEFAULT_CODE_THEME = 'vs-dark';

export const codeThemes: CodeTheme[] = [
  { slug: 'vs-dark', displayName: 'VS Dark', italic: false, dark: true, shikiTheme: 'dark-plus' },
  { slug: 'vs', displayName: 'VS Light', italic: false, dark: false, shikiTheme: 'light-plus' },
  {
    slug: 'hc-black',
    displayName: 'High Contrast Dark',
    italic: false,
    dark: true,
    shikiTheme: 'github-dark-high-contrast'
  },
  {
    slug: 'hc-light',
    displayName: 'High Contrast Light',
    italic: false,
    dark: false,
    shikiTheme: 'github-light-high-contrast'
  }
];

export const codeThemeSlugs = codeThemes.map((theme) => theme.slug);

/** Mapping of `{ [slug]: shikiTheme }` for Shiki's multi-theme `codeToHtml`. */
export const shikiThemeMap = Object.fromEntries(
  codeThemes.map((theme) => [theme.slug, theme.shikiTheme])
) as Record<string, BundledTheme>;
