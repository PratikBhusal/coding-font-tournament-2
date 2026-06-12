import { codeToHast, codeToHtml } from "shiki";
import { toHtml } from "hast-util-to-html";
import type { Element, Node, Parent } from "hast";
import { shikiThemeMap } from "./codeThemes";
import {
  sampleCodeByLanguage,
  sampleLanguages,
  type SampleLanguage,
} from "./sampleCode";

const cache = new Map<string, string>();

/**
 * The split view consumes the full Shiki HTML; the unified view needs each line
 * separately (to render the same line twice, in two fonts). `lines` holds the
 * HTML of each `<span class="line">`; `preClass`/`preStyle` carry the Shiki
 * `<pre>` wrapper's class + `--shiki-*-bg` vars so the island can rebuild an
 * equivalent `<pre>` that the existing theme CSS still styles.
 */
export type HighlightedLines = {
  preClass: string;
  preStyle: string;
  lines: string[];
};

const isElement = (node: Node): node is Element => node.type === "element";

const findChild = (parent: Parent | undefined, tagName: string) =>
  parent?.children.find(
    (child): child is Element => isElement(child) && child.tagName === tagName,
  );

// Shiki's codeToHast stores the class as `properties.class` (a string), not the
// hast-canonical `properties.className`.
const classOf = (node: Element) => String(node.properties.class ?? "");

async function highlightSampleLines(
  lang: SampleLanguage,
): Promise<HighlightedLines> {
  const root = await codeToHast(sampleCodeByLanguage[lang], {
    lang,
    themes: shikiThemeMap,
    defaultColor: false,
  });

  const pre = findChild(root, "pre");
  const codeEl = findChild(pre, "code");

  // Emit each line's *inner* HTML (the token spans). The unified view wraps this
  // in its own `<span class="line unified-line">`, so stringifying the line's
  // children (not the line element itself) avoids double-wrapping.
  const lines = (codeEl?.children ?? [])
    .filter(
      (node): node is Element => isElement(node) && classOf(node) === "line",
    )
    .map((node) => toHtml({ type: "root", children: node.children }));

  return {
    preClass: pre ? classOf(pre) : "",
    preStyle: String(pre?.properties.style ?? ""),
    lines,
  };
}

/** `{ [language]: HighlightedLines }` for every sample language. */
export async function highlightAllSampleLines(): Promise<
  Record<SampleLanguage, HighlightedLines>
> {
  const entries = await Promise.all(
    sampleLanguages.map(
      async (language) =>
        [language.id, await highlightSampleLines(language.id)] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<
    SampleLanguage,
    HighlightedLines
  >;
}

/**
 * Highlight `code` at build time with all configured themes baked in as
 * `--shiki-<slug>` CSS variables (Shiki multi-theme, `defaultColor: false`).
 * Theme switching is then pure CSS — no client-side re-highlighting.
 */
export async function highlightCode(
  code: string,
  lang: string,
): Promise<string> {
  const key = `${lang}:${code}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const html = await codeToHtml(code, {
    lang,
    themes: shikiThemeMap,
    defaultColor: false,
  });

  cache.set(key, html);
  return html;
}

export function highlightSample(lang: SampleLanguage): Promise<string> {
  return highlightCode(sampleCodeByLanguage[lang], lang);
}

/** `{ [language]: highlightedHtml }` for every sample language. */
export async function highlightAllSamples(): Promise<
  Record<SampleLanguage, string>
> {
  const entries = await Promise.all(
    sampleLanguages.map(
      async (language) =>
        [language.id, await highlightSample(language.id)] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<SampleLanguage, string>;
}
