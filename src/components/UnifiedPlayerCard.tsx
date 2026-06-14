import type { Accessor } from "solid-js";
import { For, Show } from "solid-js";
import type { CodingFont } from "../lib/codingFonts";
import type { HighlightedLines } from "../lib/highlight";
import { sampleLanguages, type SampleLanguage } from "../lib/sampleCode";
import type { ChooseWinner } from "./PlayerCard";
import { specimenStyle } from "./TournamentSpecimen";
import { UnifiedChooseButtons } from "./UnifiedChooseButtons";

type HighlightedLinesMap = Record<SampleLanguage, HighlightedLines>;

function UnifiedLine(props: {
  font: CodingFont;
  lineHtml: string;
  label: string;
}) {
  return (
    <span class="line unified-line" style={specimenStyle(props.font)}>
      <span class="unified-line-label" aria-hidden="true">
        {props.label}
      </span>
      <span innerHTML={props.lineHtml} />
    </span>
  );
}

function UnifiedSpecimen(props: {
  fontA: CodingFont;
  fontB: CodingFont;
  highlightedLines: HighlightedLinesMap;
  class?: string;
}) {
  return (
    <div
      class={`code-specimen flex max-h-full min-h-0 flex-col overflow-hidden ${props.class ?? ""}`}
    >
      <For each={sampleLanguages}>
        {(language) => {
          const data = props.highlightedLines[language.id];
          return (
            <div class="code-lang" data-lang={language.id}>
              <pre class={data.preClass} style={data.preStyle}>
                <code>
                  <For each={data.lines}>
                    {(lineHtml) => (
                      <>
                        <UnifiedLine
                          font={props.fontA}
                          lineHtml={lineHtml}
                          label="A"
                        />
                        <UnifiedLine
                          font={props.fontB}
                          lineHtml={lineHtml}
                          label="B"
                        />
                      </>
                    )}
                  </For>
                </code>
              </pre>
            </div>
          );
        }}
      </For>
    </div>
  );
}

export function UnifiedPlayerCard(props: {
  leftPlayer: Accessor<CodingFont | undefined>;
  rightPlayer: Accessor<CodingFont | undefined>;
  highlightedLines: HighlightedLinesMap;
  onChoose: ChooseWinner;
  onLeftButton: (element: HTMLButtonElement) => void;
  onRightButton: (element: HTMLButtonElement) => void;
}) {
  return (
    <Show when={props.leftPlayer() && props.rightPlayer()}>
      <div class="@container flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg">
          <UnifiedSpecimen
            fontA={props.leftPlayer()!}
            fontB={props.rightPlayer()!}
            highlightedLines={props.highlightedLines}
            class="overflow-hidden rounded-md"
          />
        </div>
        <UnifiedChooseButtons
          leftPlayer={props.leftPlayer}
          rightPlayer={props.rightPlayer}
          onChoose={props.onChoose}
          onLeftButton={props.onLeftButton}
          onRightButton={props.onRightButton}
        />
      </div>
    </Show>
  );
}
