import { For } from "solid-js";
import type { CodingFont } from "../lib/codingFonts";
import { getCssFontFamily, getFontFeatures } from "../lib/fontFeatures";
import { sampleLanguages, type SampleLanguage } from "../lib/sampleCode";

export type Highlighted = Record<SampleLanguage, string>;

export function specimenStyle(font: CodingFont) {
  const featBoth = getFontFeatures(font, true, true) || "normal";
  const featLig = getFontFeatures(font, false, true) || "normal";
  const featOt = getFontFeatures(font, true, false) || "normal";
  return `font-family: ${getCssFontFamily(font)}; --feat-both: ${featBoth}; --feat-lig: ${featLig}; --feat-ot: ${featOt}`;
}

export function Specimen(props: {
  font: CodingFont;
  highlighted: Highlighted;
  class?: string;
}) {
  return (
    <div
      class={`code-specimen flex max-h-full min-h-0 flex-col overflow-hidden ${props.class ?? ""}`}
      style={specimenStyle(props.font)}
    >
      <For each={sampleLanguages}>
        {(language) => (
          <div
            class="code-lang"
            data-lang={language.id}
            innerHTML={props.highlighted[language.id]}
          />
        )}
      </For>
    </div>
  );
}
