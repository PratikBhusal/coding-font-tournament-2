import { codeToHtml } from 'shiki';
import { shikiThemeMap } from './codeThemes';
import { sampleCodeByLanguage, sampleLanguages, type SampleLanguage } from './sampleCode';

const cache = new Map<string, string>();

/**
 * Highlight `code` at build time with all configured themes baked in as
 * `--shiki-<slug>` CSS variables (Shiki multi-theme, `defaultColor: false`).
 * Theme switching is then pure CSS — no client-side re-highlighting.
 */
export async function highlightCode(code: string, lang: string): Promise<string> {
  const key = `${lang}:${code}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const html = await codeToHtml(code, {
    lang,
    themes: shikiThemeMap,
    defaultColor: false
  });

  cache.set(key, html);
  return html;
}

export function highlightSample(lang: SampleLanguage): Promise<string> {
  return highlightCode(sampleCodeByLanguage[lang], lang);
}

/** `{ [language]: highlightedHtml }` for every sample language. */
export async function highlightAllSamples(): Promise<Record<SampleLanguage, string>> {
  const entries = await Promise.all(
    sampleLanguages.map(async (language) => [language.id, await highlightSample(language.id)] as const)
  );
  return Object.fromEntries(entries) as Record<SampleLanguage, string>;
}
